/**
 * MetricsWorker - バックグラウンドでのメトリクス保存処理
 * メインスレッドのパフォーマンスへの影響を最小化
 */

// MetricsDB クラスをインポート（Worker内では動的インポートを使用）
let MetricsDB;
let db;
let sessionId;
let batchBuffer = [];
let saveTimer = null;

// 設定
const CONFIG = {
    BATCH_SIZE: 100,           // バッチサイズ
    BATCH_INTERVAL: 5000,      // バッチ保存間隔（5秒）
    MAX_BUFFER_SIZE: 1000,     // 最大バッファサイズ
    COMPRESSION_ENABLED: true   // データ圧縮の有効化
};

/**
 * Workerの初期化
 */
self.addEventListener('message', async (event) => {
    const { id, type, data } = event.data;

    try {
        switch (type) {
            case 'init':
                await handleInit(data, id);
                break;
                
            case 'createSession':
                await handleCreateSession(data, id);
                break;
                
            case 'addMetrics':
                handleAddMetrics(data, id);
                break;
                
            case 'flush':
                await handleFlush(id);
                break;
                
            case 'query':
                await handleQuery(data, id);
                break;
                
            case 'getAggregates':
                await handleGetAggregates(data, id);
                break;
                
            case 'close':
                await handleClose(id);
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            id,
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});

/**
 * 初期化処理
 */
async function handleInit(data, id) {
    try {
        // MetricsDBクラスを動的インポート
        const module = await import('./metrics-db.js');
        MetricsDB = module.MetricsDB;
        
        // データベースの初期化
        db = new MetricsDB();
        await db.init();
        
        self.postMessage({
            id,
            type: 'init',
            data: { success: true }
        });
    } catch (error) {
        self.postMessage({
            id,
            type: 'init',
            error: { message: error.message }
        });
    }
}

/**
 * セッション作成処理
 */
async function handleCreateSession(metadata, id) {
    if (!db) throw new Error('Database not initialized');
    
    console.log('[WORKER] Creating session with metadata:', metadata);
    sessionId = await db.createSession(metadata);
    console.log('[WORKER] Created session with ID:', sessionId);
    
    const responseData = { sessionId };
    console.log('[WORKER] Sending session response:', responseData);
    
    self.postMessage({
        id,
        type: 'createSession',
        data: responseData
    });
}

/**
 * メトリクスの追加（バッファリング）
 */
function handleAddMetrics(metrics, id) {
    if (!sessionId) {
        console.warn('No active session, metrics dropped');
        return;
    }

    // データの前処理（オプショナル）
    const processed = preprocessMetrics(metrics);
    
    // バッファに追加
    batchBuffer.push(...processed);
    
    // バッファサイズチェック
    if (batchBuffer.length >= CONFIG.BATCH_SIZE) {
        scheduleSave(0); // 即座に保存
    } else if (!saveTimer) {
        scheduleSave(CONFIG.BATCH_INTERVAL);
    }
    
    // バッファオーバーフロー対策
    if (batchBuffer.length > CONFIG.MAX_BUFFER_SIZE) {
        console.warn('Buffer overflow, dropping old metrics');
        batchBuffer = batchBuffer.slice(-CONFIG.MAX_BUFFER_SIZE);
    }
    
    // 即座に応答を返す
    self.postMessage({
        id,
        type: 'addMetrics',
        data: { success: true, buffered: processed.length }
    });
}

/**
 * メトリクスの前処理
 */
function preprocessMetrics(metrics) {
    return metrics.map(metric => {
        // 不要なデータの削除
        const cleaned = {
            type: metric.type,
            value: metric.value,
            timestamp: metric.timestamp || Date.now()
        };
        
        // sessionIdが含まれている場合は保持
        if (metric.sessionId) {
            cleaned.sessionId = metric.sessionId;
        }
        
        // 数値の精度調整（メモリ節約）
        if (typeof cleaned.value === 'number') {
            cleaned.value = Math.round(cleaned.value * 100) / 100;
        }
        
        return cleaned;
    });
}

/**
 * 保存のスケジューリング
 */
function scheduleSave(delay) {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    saveTimer = setTimeout(async () => {
        await saveBatch();
        saveTimer = null;
    }, delay);
}

/**
 * バッチ保存処理
 */
async function saveBatch() {
    if (batchBuffer.length === 0 || !db || !sessionId) {
        return;
    }
    
    const batch = batchBuffer.splice(0, CONFIG.BATCH_SIZE);
    
    try {
        // データ圧縮（オプショナル）
        const dataToSave = CONFIG.COMPRESSION_ENABLED 
            ? compressMetrics(batch) 
            : batch;
            
        await db.saveMetricsBatch(sessionId, dataToSave);
        
        self.postMessage({
            type: 'batchSaved',
            count: batch.length,
            remaining: batchBuffer.length
        });
        
        // まだデータが残っている場合は次のバッチをスケジュール
        if (batchBuffer.length > 0) {
            scheduleSave(100); // 100ms後に次のバッチ
        }
    } catch (error) {
        console.error('Failed to save batch:', error);
        
        // 失敗したデータをバッファに戻す（リトライ用）
        batchBuffer.unshift(...batch);
        
        // エクスポネンシャルバックオフでリトライ
        const retryDelay = Math.min(CONFIG.BATCH_INTERVAL * 2, 30000);
        scheduleSave(retryDelay);
    }
}

/**
 * 強制フラッシュ
 */
async function handleFlush(id) {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    
    // すべてのデータを保存
    while (batchBuffer.length > 0) {
        await saveBatch();
    }
    
    self.postMessage({
        id,
        type: 'flush',
        data: { success: true }
    });
}

/**
 * クエリ処理
 */
async function handleQuery(options, id) {
    if (!db) throw new Error('Database not initialized');
    
    // sessionIdはoptionsから取得（グローバルsessionIdをフォールバック）
    const querySessionId = options.sessionId || sessionId;
    const queryOptions = { ...options };
    delete queryOptions.sessionId; // sessionIdをクエリオプションから除去
    
    const results = await db.queryMetrics(querySessionId, queryOptions);
    
    // 圧縮されたデータの展開（sessionIdを渡す）
    const decompressed = CONFIG.COMPRESSION_ENABLED 
        ? decompressMetrics(results, querySessionId)
        : results;
    
    self.postMessage({
        id,
        type: 'query',
        data: decompressed
    });
}

/**
 * 集計データの取得
 */
async function handleGetAggregates(options, id) {
    if (!db) throw new Error('Database not initialized');
    
    // sessionIdはoptionsから取得（グローバルsessionIdをフォールバック）
    const querySessionId = options.sessionId || sessionId;
    const { startTime, endTime } = options;
    const aggregates = await db.getAggregates(querySessionId, startTime, endTime);
    
    self.postMessage({
        id,
        type: 'getAggregates',
        data: aggregates
    });
}

/**
 * クリーンアップ処理
 */
async function handleClose(id) {
    // 残りのデータを保存（IDなしで内部呼び出し）
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    
    // すべてのデータを保存
    while (batchBuffer.length > 0) {
        await saveBatch();
    }
    
    // データベースを閉じる
    if (db) {
        db.close();
        db = null;
    }
    
    self.postMessage({
        id,
        type: 'close',
        data: { success: true }
    });
}

/**
 * データ圧縮（シンプルな実装例）
 */
function compressMetrics(metrics) {
    // 実際の実装では、より効率的な圧縮アルゴリズムを使用
    // ここでは簡単な例として、同じタイプのメトリクスをグループ化
    const grouped = {};
    
    metrics.forEach(metric => {
        if (!grouped[metric.type]) {
            grouped[metric.type] = {
                type: metric.type,
                values: [],
                timestamps: []
            };
        }
        grouped[metric.type].values.push(metric.value);
        grouped[metric.type].timestamps.push(metric.timestamp);
    });
    
    return Object.values(grouped);
}

/**
 * データ展開
 */
function decompressMetrics(compressed, sessionId = null) {
    const metrics = [];
    
    compressed.forEach(group => {
        if (group.values && group.timestamps) {
            // 圧縮されたデータ - sessionIdを含めて復元
            for (let i = 0; i < group.values.length; i++) {
                const metric = {
                    type: group.type,
                    value: group.values[i],
                    timestamp: group.timestamps[i]
                };
                
                // sessionIdがある場合は追加
                if (sessionId) {
                    metric.sessionId = sessionId;
                }
                
                metrics.push(metric);
            }
        } else {
            // 非圧縮データ - そのまま追加
            metrics.push(group);
        }
    });
    
    return metrics;
}

/**
 * エラーハンドリング
 */
self.addEventListener('error', (event) => {
    console.error('Worker error:', event);
    self.postMessage({
        type: 'error',
        error: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        }
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Worker unhandled rejection:', event);
    self.postMessage({
        type: 'error',
        error: {
            message: event.reason?.message || 'Unhandled rejection',
            stack: event.reason?.stack
        }
    });
});