/**
 * MetricsDB - IndexedDB永続化管理クラス
 * パフォーマンスメトリクスデータの保存、取得、クエリ機能を提供
 */
export class MetricsDB {
    constructor() {
        this.dbName = 'SquashGameMetrics';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
        this.pendingOperations = [];
    }

    /**
     * データベースの初期化
     */
    async init() {
        if (this.isInitialized) return;

        try {
            this.db = await this.openDB();
            this.isInitialized = true;
            
            // 古いデータの自動削除をスケジュール
            this.scheduleCleanup();
            
            // ペンディング操作を実行
            await this.processPendingOperations();
        } catch (error) {
            console.error('MetricsDB initialization failed:', error);
            throw error;
        }
    }

    /**
     * IndexedDBを開く
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // セッションストア
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { 
                        keyPath: 'sessionId' 
                    });
                    sessionStore.createIndex('timestamp', 'timestamp');
                    sessionStore.createIndex('gameMode', 'gameMode');
                }

                // メトリクスストア（バッチ保存用）
                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    metricsStore.createIndex('sessionId', 'sessionId');
                    metricsStore.createIndex('timestamp', 'timestamp');
                    metricsStore.createIndex('type', 'type');
                    // 複合インデックス（効率的なクエリ用）
                    metricsStore.createIndex('session-timestamp', ['sessionId', 'timestamp']);
                }

                // 集計データストア（分析用）
                if (!db.objectStoreNames.contains('aggregates')) {
                    const aggregateStore = db.createObjectStore('aggregates', { 
                        keyPath: ['sessionId', 'intervalStart'] 
                    });
                    aggregateStore.createIndex('sessionId', 'sessionId');
                    aggregateStore.createIndex('intervalStart', 'intervalStart');
                }
            };
        });
    }

    /**
     * セッションの作成
     */
    async createSession(metadata = {}) {
        const sessionId = this.generateSessionId();
        const session = {
            sessionId,
            timestamp: Date.now(),
            startTime: performance.now(),
            gameMode: metadata.gameMode || 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            screenResolution: metadata.screenResolution || 'unknown',
            deviceMemory: typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 'unknown',
            hardwareConcurrency: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 'unknown',
            ...metadata
        };

        await this.executeTransaction('sessions', 'readwrite', (store) => {
            store.add(session);
        });

        return sessionId;
    }

    /**
     * メトリクスデータのバッチ保存
     */
    async saveMetricsBatch(sessionId, metricsData) {
        if (!this.isInitialized) {
            this.pendingOperations.push(() => this.saveMetricsBatch(sessionId, metricsData));
            return;
        }

        console.log('[DB] saveMetricsBatch called:', {
            sessionId,
            metricsDataCount: metricsData.length,
            sampleMetrics: metricsData.slice(0, 3).map(m => ({
                type: m.type,
                value: m.value,
                hasSessionId: !!m.sessionId,
                sessionIdValue: m.sessionId
            }))
        });

        const batch = metricsData.map(data => ({
            ...data,
            sessionId,
            timestamp: Date.now(),
            gameTime: performance.now()
        }));

        console.log('[DB] Prepared batch for saving:', {
            batchCount: batch.length,
            sampleBatch: batch.slice(0, 3).map(m => ({
                type: m.type,
                value: m.value,
                sessionId: m.sessionId,
                hasSessionId: !!m.sessionId
            }))
        });

        await this.executeTransaction('metrics', 'readwrite', (store) => {
            batch.forEach(metric => {
                console.log('[DB] Adding metric to store:', {
                    type: metric.type,
                    sessionId: metric.sessionId,
                    hasSessionId: !!metric.sessionId
                });
                store.add(metric);
            });
        });

        console.log('[DB] Batch saved successfully to IndexedDB');

        // 集計データの更新（非同期で実行）
        this.updateAggregates(sessionId, batch).catch(console.error);
    }

    /**
     * 集計データの更新
     */
    async updateAggregates(sessionId, metrics) {
        const intervalMs = 60000; // 1分間隔で集計
        const intervals = new Map();

        // メトリクスを時間間隔でグループ化
        metrics.forEach(metric => {
            const intervalStart = Math.floor(metric.timestamp / intervalMs) * intervalMs;
            const key = `${sessionId}-${intervalStart}`;
            
            if (!intervals.has(key)) {
                intervals.set(key, {
                    sessionId,
                    intervalStart,
                    metrics: []
                });
            }
            intervals.get(key).metrics.push(metric);
        });

        // 各間隔の集計データを計算して保存
        await this.executeTransaction('aggregates', 'readwrite', async (store) => {
            for (const [key, interval] of intervals) {
                const existing = await this.getFromStore(store, [interval.sessionId, interval.intervalStart]);
                const aggregated = this.calculateAggregates(
                    existing ? [...existing.metrics, ...interval.metrics] : interval.metrics
                );

                const record = {
                    sessionId: interval.sessionId,
                    intervalStart: interval.intervalStart,
                    ...aggregated,
                    metrics: interval.metrics // 元データも保持（必要に応じて）
                };

                if (existing) {
                    store.put(record);
                } else {
                    store.add(record);
                }
            }
        });
    }

    /**
     * メトリクスの集計計算
     */
    calculateAggregates(metrics) {
        const fps = metrics.filter(m => m.type === 'fps').map(m => m.value);
        const frameTime = metrics.filter(m => m.type === 'frameTime').map(m => m.value);
        const gameLogicTime = metrics.filter(m => m.type === 'gameLogicTime').map(m => m.value);
        const renderingTime = metrics.filter(m => m.type === 'renderingTime').map(m => m.value);
        const memoryUsage = metrics.filter(m => m.type === 'memoryUsage').map(m => m.value);

        return {
            fps: this.calculateStats(fps),
            frameTime: this.calculateStats(frameTime),
            gameLogicTime: this.calculateStats(gameLogicTime),
            renderingTime: this.calculateStats(renderingTime),
            memoryUsage: this.calculateStats(memoryUsage),
            sampleCount: metrics.length
        };
    }

    /**
     * 統計値の計算
     */
    calculateStats(values) {
        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: sum / values.length,
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            stdDev: this.calculateStdDev(values, sum / values.length)
        };
    }

    /**
     * 標準偏差の計算
     */
    calculateStdDev(values, mean) {
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * クエリ機能 - セッションのメトリクスを取得
     */
    async queryMetrics(sessionId, options = {}) {
        const { startTime, endTime, type, limit = 1000 } = options;

        return await this.executeTransaction('metrics', 'readonly', async (store) => {
            const index = store.index('session-timestamp');
            const range = this.createRange(sessionId, startTime, endTime);
            
            const results = [];
            const request = index.openCursor(range);

            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && results.length < limit) {
                        const metric = cursor.value;
                        if (!type || metric.type === type) {
                            results.push(metric);
                        }
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    /**
     * 集計データの取得
     */
    async getAggregates(sessionId, startTime, endTime) {
        return await this.executeTransaction('aggregates', 'readonly', async (store) => {
            const index = store.index('sessionId');
            const results = [];
            
            const request = index.openCursor(IDBKeyRange.only(sessionId));
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const aggregate = cursor.value;
                        if ((!startTime || aggregate.intervalStart >= startTime) &&
                            (!endTime || aggregate.intervalStart <= endTime)) {
                            results.push(aggregate);
                        }
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    /**
     * 古いデータの削除（7日間保持）
     */
    async cleanupOldData() {
        const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7日
        const cutoffTime = Date.now() - retentionPeriod;

        // セッションの削除
        const oldSessions = await this.executeTransaction('sessions', 'readonly', async (store) => {
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTime);
            return await this.getAllFromIndex(index, range);
        });

        if (oldSessions.length > 0) {
            const sessionIds = oldSessions.map(s => s.sessionId);
            
            // 関連するメトリクスと集計データも削除
            await this.executeTransaction(['sessions', 'metrics', 'aggregates'], 'readwrite', async (stores) => {
                const [sessionStore, metricsStore, aggregateStore] = stores;
                
                // セッションの削除
                sessionIds.forEach(id => sessionStore.delete(id));
                
                // メトリクスの削除
                const metricsIndex = metricsStore.index('sessionId');
                for (const sessionId of sessionIds) {
                    const range = IDBKeyRange.only(sessionId);
                    await this.deleteFromIndex(metricsIndex, range);
                }
                
                // 集計データの削除
                const aggregateIndex = aggregateStore.index('sessionId');
                for (const sessionId of sessionIds) {
                    const range = IDBKeyRange.only(sessionId);
                    await this.deleteFromIndex(aggregateIndex, range);
                }
            });
        }
    }

    /**
     * 定期的なクリーンアップのスケジュール
     */
    scheduleCleanup() {
        // 初回実行
        this.cleanupOldData().catch(console.error);
        
        // 24時間ごとに実行
        setInterval(() => {
            this.cleanupOldData().catch(console.error);
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * トランザクション実行のヘルパー
     */
    async executeTransaction(storeNames, mode, callback) {
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction(storeNames, mode);
        const stores = Array.isArray(storeNames) 
            ? storeNames.map(name => transaction.objectStore(name))
            : transaction.objectStore(storeNames);

        try {
            const result = await callback(stores);
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
            return result;
        } catch (error) {
            transaction.abort();
            throw error;
        }
    }

    /**
     * ペンディング操作の処理
     */
    async processPendingOperations() {
        while (this.pendingOperations.length > 0) {
            const operation = this.pendingOperations.shift();
            try {
                await operation();
            } catch (error) {
                console.error('Failed to process pending operation:', error);
            }
        }
    }

    /**
     * ユーティリティ関数
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    createRange(sessionId, startTime, endTime) {
        const lower = [sessionId, startTime || 0];
        const upper = [sessionId, endTime || Infinity];
        return IDBKeyRange.bound(lower, upper);
    }

    async getFromStore(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromIndex(index, range) {
        return new Promise((resolve, reject) => {
            const request = range ? index.getAll(range) : index.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromIndex(index, range) {
        return new Promise((resolve, reject) => {
            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * データベースを閉じる
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}