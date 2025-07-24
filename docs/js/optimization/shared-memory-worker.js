/**
 * SharedMemory Performance Worker
 * SharedArrayBufferとAtomicsを使用した高速メトリクス処理
 * 
 * メインスレッドとワーカー間でメモリを共有し、
 * メッセージパッシングのオーバーヘッドを排除
 */

// SharedArrayBufferの構造定義
const BUFFER_CONFIG = {
    // メタデータ（32バイト）
    CONTROL_OFFSET: 0,          // 制御フラグ（4バイト）
    WRITE_INDEX_OFFSET: 4,      // 書き込みインデックス（4バイト）
    READ_INDEX_OFFSET: 8,       // 読み込みインデックス（4バイト）
    STATS_OFFSET: 12,           // 統計情報開始位置（20バイト）
    
    // リングバッファ（残りの容量）
    DATA_OFFSET: 32,            // データ開始位置
    MAX_ENTRIES: 1000,          // 最大エントリ数
    ENTRY_SIZE: 24,             // 1エントリのサイズ（バイト）
    
    // 制御フラグ
    FLAGS: {
        WORKER_READY: 1,
        COLLECTION_ACTIVE: 2,
        SHUTDOWN: 4,
        FLUSH_REQUESTED: 8
    }
};

// 計算された定数
const TOTAL_BUFFER_SIZE = BUFFER_CONFIG.DATA_OFFSET + 
                         (BUFFER_CONFIG.MAX_ENTRIES * BUFFER_CONFIG.ENTRY_SIZE);

// グローバル変数
let sharedBuffer = null;
let sharedArray = null;
let controlView = null;
let statsView = null;
let dataView = null;
let isInitialized = false;

// 統計情報
let stats = {
    entriesProcessed: 0,
    lastFlushTime: 0,
    avgProcessingTime: 0,
    peakMemoryUsage: 0
};

// IndexedDB関連
let db = null;
let sessionId = null;

/**
 * Workerの初期化
 */
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    try {
        switch (type) {
            case 'init':
                await handleInit(data);
                break;
                
            case 'createSession':
                await handleCreateSession(data);
                break;
                
            case 'shutdown':
                await handleShutdown();
                break;
                
            default:
                console.warn(`Unknown message type: ${type}`);
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({
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
async function handleInit(data) {
    try {
        const { bufferSize = TOTAL_BUFFER_SIZE } = data;
        
        // SharedArrayBufferの作成
        sharedBuffer = new SharedArrayBuffer(bufferSize);
        sharedArray = new Int32Array(sharedBuffer);
        
        // ビューの作成
        controlView = new Int32Array(sharedBuffer, 0, 8); // 制御領域
        statsView = new Float32Array(sharedBuffer, BUFFER_CONFIG.STATS_OFFSET, 5); // 統計領域
        dataView = new Float32Array(sharedBuffer, BUFFER_CONFIG.DATA_OFFSET); // データ領域
        
        // バッファの初期化
        Atomics.store(controlView, 0, 0); // 制御フラグ
        Atomics.store(controlView, 1, 0); // 書き込みインデックス
        Atomics.store(controlView, 2, 0); // 読み込みインデックス
        
        // 統計情報の初期化
        resetStats();
        
        // IndexedDBの初期化
        await initializeDB();
        
        // ワーカー準備完了フラグを設定
        const currentFlags = Atomics.load(controlView, 0);
        Atomics.store(controlView, 0, currentFlags | BUFFER_CONFIG.FLAGS.WORKER_READY);
        
        isInitialized = true;
        
        // メインスレッドにバッファを送信
        self.postMessage({
            type: 'init',
            data: {
                sharedBuffer,
                success: true,
                bufferSize,
                maxEntries: BUFFER_CONFIG.MAX_ENTRIES
            }
        });
        
        // メトリクス処理ループを開始
        startProcessingLoop();
        
        console.log('SharedMemory Worker initialized', {
            bufferSize,
            maxEntries: BUFFER_CONFIG.MAX_ENTRIES,
            entrySize: BUFFER_CONFIG.ENTRY_SIZE
        });
        
    } catch (error) {
        console.error('Initialization failed:', error);
        self.postMessage({
            type: 'init',
            error: { message: error.message }
        });
    }
}

/**
 * IndexedDBの初期化
 */
async function initializeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SharedMemoryMetrics', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // セッションストア
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                sessionStore.createIndex('timestamp', 'timestamp');
            }
            
            // メトリクスストア
            if (!db.objectStoreNames.contains('metrics')) {
                const metricsStore = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
                metricsStore.createIndex('sessionId', 'sessionId');
                metricsStore.createIndex('timestamp', 'timestamp');
                metricsStore.createIndex('type', 'type');
            }
        };
    });
}

/**
 * セッション作成
 */
async function handleCreateSession(metadata) {
    if (!db) {
        throw new Error('Database not initialized');
    }
    
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sessionData = {
        id: sessionId,
        ...metadata,
        createdAt: Date.now()
    };
    
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    await store.add(sessionData);
    
    self.postMessage({
        type: 'createSession',
        data: { sessionId }
    });
    
    console.log('Session created:', sessionId);
}

/**
 * メトリクス処理ループ
 */
function startProcessingLoop() {
    const processMetrics = () => {
        if (!isInitialized || !db || !sessionId) {
            setTimeout(processMetrics, 10);
            return;
        }
        
        // 制御フラグをチェック
        const flags = Atomics.load(controlView, 0);
        
        if (flags & BUFFER_CONFIG.FLAGS.SHUTDOWN) {
            console.log('Worker shutdown requested');
            return;
        }
        
        if (flags & BUFFER_CONFIG.FLAGS.COLLECTION_ACTIVE) {
            // メトリクスを処理
            const processed = processAvailableMetrics();
            
            if (processed > 0) {
                updateStats(processed);
            }
        }
        
        // フラッシュが要求された場合
        if (flags & BUFFER_CONFIG.FLAGS.FLUSH_REQUESTED) {
            flushPendingMetrics();
            // フラッシュフラグをクリア
            const newFlags = flags & ~BUFFER_CONFIG.FLAGS.FLUSH_REQUESTED;
            Atomics.store(controlView, 0, newFlags);
        }
        
        // 次の処理をスケジュール（高頻度処理）
        setTimeout(processMetrics, 1);
    };
    
    processMetrics();
}

/**
 * 利用可能なメトリクスを処理
 */
function processAvailableMetrics() {
    const writeIndex = Atomics.load(controlView, 1);
    const readIndex = Atomics.load(controlView, 2);
    
    if (writeIndex === readIndex) {
        return 0; // 処理するデータなし
    }
    
    let processed = 0;
    const maxProcess = 50; // 一度に処理する最大数
    const batchMetrics = [];
    
    while (processed < maxProcess) {
        const currentReadIndex = Atomics.load(controlView, 2);
        const currentWriteIndex = Atomics.load(controlView, 1);
        
        if (currentReadIndex === currentWriteIndex) {
            break; // データなし
        }
        
        // リングバッファからデータを読み取り
        const entryIndex = currentReadIndex % BUFFER_CONFIG.MAX_ENTRIES;
        const dataOffset = entryIndex * (BUFFER_CONFIG.ENTRY_SIZE / 4); // Float32Array用
        
        const metric = {
            sessionId: sessionId,
            timestamp: dataView[dataOffset],
            type: decodeMetricType(dataView[dataOffset + 1]),
            value: dataView[dataOffset + 2],
            frameId: dataView[dataOffset + 3] || 0,
            category: decodeCategory(dataView[dataOffset + 4]) || 'performance',
            metadata: {
                processingTime: dataView[dataOffset + 5] || 0
            }
        };
        
        batchMetrics.push(metric);
        
        // 読み込みインデックスを更新（アトミック操作）
        const newReadIndex = currentReadIndex + 1;
        if (Atomics.compareExchange(controlView, 2, currentReadIndex, newReadIndex) === currentReadIndex) {
            processed++;
        } else {
            // 他のスレッドが更新した場合は再試行
            break;
        }
    }
    
    // バッチでIndexedDBに保存
    if (batchMetrics.length > 0) {
        saveBatchToIndexedDB(batchMetrics);
    }
    
    return processed;
}

/**
 * メトリクスタイプのデコード
 */
function decodeMetricType(encoded) {
    const types = ['fps', 'frameTime', 'memory', 'gameLogic', 'rendering', 'input', 'gc', 'latency'];
    return types[Math.floor(encoded)] || 'unknown';
}

/**
 * カテゴリのデコード
 */
function decodeCategory(encoded) {
    const categories = ['performance', 'memory', 'timing', 'events'];
    return categories[Math.floor(encoded)] || 'performance';
}

/**
 * IndexedDBにバッチ保存
 */
async function saveBatchToIndexedDB(metrics) {
    if (!db || metrics.length === 0) return;
    
    try {
        const transaction = db.transaction(['metrics'], 'readwrite');
        const store = transaction.objectStore('metrics');
        
        for (const metric of metrics) {
            store.add(metric);
        }
        
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
        
        // 統計更新
        stats.entriesProcessed += metrics.length;
        updateSharedStats();
        
    } catch (error) {
        console.error('Failed to save batch to IndexedDB:', error);
    }
}

/**
 * 統計情報の更新
 */
function updateStats(processed) {
    const now = performance.now();
    const timeSinceLastFlush = now - stats.lastFlushTime;
    
    if (timeSinceLastFlush > 0) {
        stats.avgProcessingTime = (stats.avgProcessingTime * 0.9) + (timeSinceLastFlush * 0.1);
    }
    
    stats.lastFlushTime = now;
    
    // メモリ使用量（概算）
    if (performance.memory) {
        stats.peakMemoryUsage = Math.max(stats.peakMemoryUsage, performance.memory.usedJSHeapSize);
    }
    
    updateSharedStats();
}

/**
 * 共有統計情報の更新
 */
function updateSharedStats() {
    // 統計情報をSharedArrayBufferに書き込み
    statsView[0] = stats.entriesProcessed;
    statsView[1] = stats.lastFlushTime;
    statsView[2] = stats.avgProcessingTime;
    statsView[3] = stats.peakMemoryUsage;
    statsView[4] = performance.now(); // 最終更新時刻
}

/**
 * 統計情報のリセット
 */
function resetStats() {
    stats = {
        entriesProcessed: 0,
        lastFlushTime: performance.now(),
        avgProcessingTime: 0,
        peakMemoryUsage: 0
    };
    updateSharedStats();
}

/**
 * 保留中メトリクスのフラッシュ
 */
function flushPendingMetrics() {
    // 残りのメトリクスをすべて処理
    let totalProcessed = 0;
    
    while (true) {
        const processed = processAvailableMetrics();
        if (processed === 0) break;
        totalProcessed += processed;
        
        // 無限ループ防止
        if (totalProcessed > BUFFER_CONFIG.MAX_ENTRIES) break;
    }
    
    console.log(`Flushed ${totalProcessed} pending metrics`);
}

/**
 * シャットダウン処理
 */
async function handleShutdown() {
    console.log('SharedMemory Worker shutting down...');
    
    // 残りのデータを処理
    flushPendingMetrics();
    
    // データベースを閉じる
    if (db) {
        db.close();
        db = null;
    }
    
    isInitialized = false;
    
    self.postMessage({
        type: 'shutdown',
        data: { success: true }
    });
}

/**
 * エラーハンドリング
 */
self.addEventListener('error', (event) => {
    console.error('SharedMemory Worker error:', event);
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
    console.error('SharedMemory Worker unhandled rejection:', event);
    self.postMessage({
        type: 'error',
        error: {
            message: event.reason?.message || 'Unhandled rejection',
            stack: event.reason?.stack
        }
    });
});

// パフォーマンス統計の定期送信
setInterval(() => {
    if (isInitialized) {
        self.postMessage({
            type: 'stats',
            data: {
                entriesProcessed: stats.entriesProcessed,
                avgProcessingTime: stats.avgProcessingTime,
                peakMemoryUsage: stats.peakMemoryUsage,
                bufferUtilization: calculateBufferUtilization()
            }
        });
    }
}, 5000);

/**
 * バッファ使用率の計算
 */
function calculateBufferUtilization() {
    if (!isInitialized) return 0;
    
    const writeIndex = Atomics.load(controlView, 1);
    const readIndex = Atomics.load(controlView, 2);
    const used = (writeIndex - readIndex + BUFFER_CONFIG.MAX_ENTRIES) % BUFFER_CONFIG.MAX_ENTRIES;
    
    return (used / BUFFER_CONFIG.MAX_ENTRIES) * 100;
}

console.log('SharedMemory Worker loaded');