/**
 * メモリ効率化監視システム
 * WebAssembly環境特化のメモリ最適化
 */

export class MemoryEfficiencyMonitor {
    constructor() {
        this.config = {
            // メモリ監視間隔（デフォルト: 5秒）
            monitorInterval: 5000,
            // 警告閾値（MB）
            warningThreshold: 50,
            // 危険閾値（MB）
            criticalThreshold: 100,
            // 自動ガベージコレクション有効
            autoGCEnabled: true,
            // ヒープスナップショット間隔（分）
            snapshotInterval: 10
        };
        
        this.state = {
            isMonitoring: false,
            intervalId: null,
            snapshotIntervalId: null,
            memoryHistory: [],
            leakDetectionData: new Map(),
            performanceObserver: null
        };
        
        this.metrics = {
            totalAllocations: 0,
            peakMemoryUsage: 0,
            gcCount: 0,
            potentialLeaks: [],
            memoryFragmentation: 0
        };
        
        this.bindMethods();
        this.initializeObservers();
    }
    
    bindMethods() {
        this.measureMemory = this.measureMemory.bind(this);
        this.detectLeaks = this.detectLeaks.bind(this);
        this.optimizeMemory = this.optimizeMemory.bind(this);
    }
    
    /**
     * パフォーマンス観測器の初期化
     */
    initializeObservers() {
        if ('PerformanceObserver' in window) {
            try {
                this.state.performanceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'memory') {
                            this.handleMemoryEntry(entry);
                        }
                    }
                });
                
                this.state.performanceObserver.observe({ entryTypes: ['memory'] });
            } catch (error) {
                console.warn('[MemoryMonitor] PerformanceObserver not supported:', error);
            }
        }
    }
    
    /**
     * メモリ監視開始
     */
    startMonitoring() {
        if (this.state.isMonitoring) {
            console.warn('[MemoryMonitor] Already monitoring');
            return;
        }
        
        this.state.isMonitoring = true;
        
        // 定期的なメモリ測定
        this.state.intervalId = setInterval(this.measureMemory, this.config.monitorInterval);
        
        // 定期的なヒープスナップショット
        if (this.config.snapshotInterval > 0) {
            this.state.snapshotIntervalId = setInterval(
                () => this.captureHeapSnapshot(),
                this.config.snapshotInterval * 60 * 1000
            );
        }
        
        // 初回測定
        this.measureMemory();
        
        console.log('🧠 [MemoryMonitor] Monitoring started');
    }
    
    /**
     * メモリ監視停止
     */
    stopMonitoring() {
        if (!this.state.isMonitoring) {
            return;
        }
        
        this.state.isMonitoring = false;
        
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
            this.state.intervalId = null;
        }
        
        if (this.state.snapshotIntervalId) {
            clearInterval(this.state.snapshotIntervalId);
            this.state.snapshotIntervalId = null;
        }
        
        console.log('🧠 [MemoryMonitor] Monitoring stopped');
    }
    
    /**
     * メモリ使用量測定
     */
    async measureMemory() {
        try {
            const memoryInfo = await this.getMemoryInfo();
            const timestamp = performance.now();
            
            // メモリ履歴に追加
            this.state.memoryHistory.push({
                timestamp,
                ...memoryInfo
            });
            
            // 履歴の制限（最新100件）
            if (this.state.memoryHistory.length > 100) {
                this.state.memoryHistory.shift();
            }
            
            // ピークメモリ更新
            if (memoryInfo.usedJSHeapSize > this.metrics.peakMemoryUsage) {
                this.metrics.peakMemoryUsage = memoryInfo.usedJSHeapSize;
            }
            
            // 警告チェック
            this.checkMemoryThresholds(memoryInfo);
            
            // リーク検出
            this.detectLeaks(memoryInfo);
            
            // Pyodideメモリ最適化
            if (window.pyodide) {
                await this.optimizePyodideMemory();
            }
            
        } catch (error) {
            console.error('[MemoryMonitor] Measurement failed:', error);
        }
    }
    
    /**
     * メモリ情報取得
     */
    async getMemoryInfo() {
        const info = {
            timestamp: Date.now(),
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
            pyodideMemory: 0,
            webWorkerMemory: 0
        };
        
        // JavaScript ヒープ
        if (performance.memory) {
            info.usedJSHeapSize = performance.memory.usedJSHeapSize;
            info.totalJSHeapSize = performance.memory.totalJSHeapSize;
            info.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
        }
        
        // Pyodideメモリ（WebAssembly）
        if (window.pyodide) {
            try {
                const pyodideStats = window.pyodide.runPython(`
                    import sys
                    import gc
                    {
                        'objects': len(gc.get_objects()),
                        'memory_usage': sys.getsizeof(gc.get_objects())
                    }
                `);
                info.pyodideMemory = pyodideStats.memory_usage || 0;
            } catch (error) {
                console.warn('[MemoryMonitor] Failed to get Pyodide memory:', error);
            }
        }
        
        return info;
    }
    
    /**
     * メモリ閾値チェック
     */
    checkMemoryThresholds(memoryInfo) {
        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        
        if (usedMB > this.config.criticalThreshold) {
            console.error(`🚨 [MemoryMonitor] Critical memory usage: ${usedMB.toFixed(2)}MB`);
            this.triggerMemoryOptimization();
        } else if (usedMB > this.config.warningThreshold) {
            console.warn(`⚠️ [MemoryMonitor] High memory usage: ${usedMB.toFixed(2)}MB`);
        }
    }
    
    /**
     * メモリリーク検出
     */
    detectLeaks(currentMemory) {
        const now = Date.now();
        const threshold = 30000; // 30秒
        
        // 直近のメモリ増加傾向を分析
        const recentHistory = this.state.memoryHistory.filter(
            entry => (now - entry.timestamp) < threshold
        );
        
        if (recentHistory.length < 5) return;
        
        // 線形回帰でメモリ増加傾向を計算
        const slope = this.calculateMemoryTrend(recentHistory);
        
        // 継続的な増加（> 1MB/分）をリークの兆候として検出
        const leakThreshold = 1024 * 1024 / 60; // 1MB/分をバイト/秒に変換
        
        if (slope > leakThreshold) {
            const leak = {
                timestamp: now,
                slope: slope,
                severity: slope > leakThreshold * 5 ? 'high' : 'medium'
            };
            
            this.metrics.potentialLeaks.push(leak);
            
            console.warn(`🕳️ [MemoryMonitor] Potential memory leak detected: ${(slope * 60 / (1024 * 1024)).toFixed(2)}MB/min`);
            
            // 自動最適化が有効な場合
            if (this.config.autoGCEnabled) {
                this.triggerMemoryOptimization();
            }
        }
    }
    
    /**
     * メモリ増加傾向計算（線形回帰）
     */
    calculateMemoryTrend(history) {
        if (history.length < 2) return 0;
        
        const n = history.length;
        const sumX = history.reduce((sum, entry, i) => sum + i, 0);
        const sumY = history.reduce((sum, entry) => sum + entry.usedJSHeapSize, 0);
        const sumXY = history.reduce((sum, entry, i) => sum + (i * entry.usedJSHeapSize), 0);
        const sumXX = history.reduce((sum, entry, i) => sum + (i * i), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope || 0;
    }
    
    /**
     * メモリ最適化実行
     */
    async triggerMemoryOptimization() {
        console.log('🧹 [MemoryMonitor] Triggering memory optimization...');
        
        try {
            // JavaScript ガベージコレクション
            if (window.gc) {
                window.gc();
                this.metrics.gcCount++;
            }
            
            // Pyodideメモリ最適化
            if (window.pyodide) {
                await this.optimizePyodideMemory();
            }
            
            // WebWorkerメモリクリア
            this.clearWebWorkerMemory();
            
            // DOMクリーンアップ
            this.cleanupDOMElements();
            
            console.log('✅ [MemoryMonitor] Memory optimization completed');
            
        } catch (error) {
            console.error('[MemoryMonitor] Optimization failed:', error);
        }
    }
    
    /**
     * Pyodideメモリ最適化
     */
    async optimizePyodideMemory() {
        if (!window.pyodide) return;
        
        try {
            // Pythonガベージコレクション
            window.pyodide.runPython(`
                import gc
                import sys
                
                # 強制ガベージコレクション
                collected = gc.collect()
                
                # 循環参照の解決
                gc.collect()
                gc.collect()
                
                print(f"Python GC collected {collected} objects")
            `);
            
            // モジュールキャッシュクリア（必要に応じて）
            if (this.shouldClearModuleCache()) {
                window.pyodide.runPython(`
                    import sys
                    
                    # 一時的なモジュールをクリア
                    modules_to_clear = [name for name in sys.modules 
                                       if name.startswith('__temp_') or name.startswith('_tmp_')]
                    
                    for module_name in modules_to_clear:
                        if module_name in sys.modules:
                            del sys.modules[module_name]
                `);
            }
            
        } catch (error) {
            console.warn('[MemoryMonitor] Pyodide optimization failed:', error);
        }
    }
    
    /**
     * WebWorkerメモリクリア
     */
    clearWebWorkerMemory() {
        // メトリクス収集WebWorkerの最適化
        if (window.metricsWorker && window.metricsWorker.postMessage) {
            window.metricsWorker.postMessage({
                type: 'clearMemory',
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * DOM要素クリーンアップ
     */
    cleanupDOMElements() {
        // 不要なコメンタリー要素の削除
        const oldCommentaries = document.querySelectorAll('.ai-commentary[data-expired="true"]');
        oldCommentaries.forEach(el => el.remove());
        
        // 古いメトリクス表示要素の削除
        const oldMetrics = document.querySelectorAll('.performance-metric[data-old="true"]');
        oldMetrics.forEach(el => el.remove());
        
        // イベントリスナーの整理
        this.cleanupEventListeners();
    }
    
    /**
     * イベントリスナークリーンアップ
     */
    cleanupEventListeners() {
        // 古いゲームイベントリスナーの削除
        const gameEvents = ['game:paddleHit', 'game:miss', 'game:score', 'game:wallHit'];
        
        gameEvents.forEach(eventType => {
            const listeners = window.gameEventListeners?.[eventType] || [];
            
            // 1時間以上古いリスナーを削除
            const cutoff = Date.now() - (60 * 60 * 1000);
            
            listeners.forEach((listener, index) => {
                if (listener.timestamp && listener.timestamp < cutoff) {
                    window.removeEventListener(eventType, listener.handler);
                    listeners.splice(index, 1);
                }
            });
        });
    }
    
    /**
     * モジュールキャッシュクリアの必要性判定
     */
    shouldClearModuleCache() {
        const memoryHistory = this.state.memoryHistory;
        if (memoryHistory.length < 10) return false;
        
        // 最近のメモリ使用量が平均を大幅に上回る場合
        const recent = memoryHistory.slice(-5);
        const average = memoryHistory.slice(-20, -5);
        
        const recentAvg = recent.reduce((sum, entry) => sum + entry.usedJSHeapSize, 0) / recent.length;
        const baselineAvg = average.reduce((sum, entry) => sum + entry.usedJSHeapSize, 0) / average.length;
        
        return recentAvg > baselineAvg * 1.5; // 50%以上の増加
    }
    
    /**
     * ヒープスナップショット取得
     */
    captureHeapSnapshot() {
        if (!this.state.isMonitoring) return;
        
        try {
            const snapshot = {
                timestamp: Date.now(),
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null,
                domNodes: document.querySelectorAll('*').length,
                eventListeners: this.countEventListeners()
            };
            
            console.log('📸 [MemoryMonitor] Heap snapshot captured:', snapshot);
            
            // IndexedDBに保存（利用可能な場合）
            this.saveSnapshotToIndexedDB(snapshot);
            
        } catch (error) {
            console.error('[MemoryMonitor] Snapshot capture failed:', error);
        }
    }
    
    /**
     * イベントリスナー数カウント
     */
    countEventListeners() {
        let count = 0;
        
        if (window.gameEventListeners) {
            Object.values(window.gameEventListeners).forEach(listeners => {
                count += listeners.length;
            });
        }
        
        return count;
    }
    
    /**
     * スナップショットをIndexedDBに保存
     */
    async saveSnapshotToIndexedDB(snapshot) {
        try {
            if (!window.indexedDB) return;
            
            const request = indexedDB.open('MemorySnapshots', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('snapshots')) {
                    const store = db.createObjectStore('snapshots', { keyPath: 'timestamp' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['snapshots'], 'readwrite');
                const store = transaction.objectStore('snapshots');
                
                store.add(snapshot);
                
                // 古いスナップショットの削除（100件以上保持しない）
                const index = store.index('timestamp');
                const countRequest = index.count();
                
                countRequest.onsuccess = () => {
                    if (countRequest.result > 100) {
                        const getAllRequest = index.getAll();
                        getAllRequest.onsuccess = () => {
                            const snapshots = getAllRequest.result;
                            const toDelete = snapshots.slice(0, snapshots.length - 100);
                            
                            toDelete.forEach(old => {
                                store.delete(old.timestamp);
                            });
                        };
                    }
                };
            };
            
        } catch (error) {
            console.warn('[MemoryMonitor] IndexedDB save failed:', error);
        }
    }
    
    /**
     * メモリ使用状況の統計取得
     */
    getMemoryStats() {
        const history = this.state.memoryHistory;
        if (history.length === 0) return null;
        
        const usedSizes = history.map(entry => entry.usedJSHeapSize);
        const totalSizes = history.map(entry => entry.totalJSHeapSize);
        
        return {
            current: {
                used: usedSizes[usedSizes.length - 1],
                total: totalSizes[totalSizes.length - 1],
                usedMB: (usedSizes[usedSizes.length - 1] / (1024 * 1024)).toFixed(2),
                totalMB: (totalSizes[totalSizes.length - 1] / (1024 * 1024)).toFixed(2)
            },
            peak: {
                used: Math.max(...usedSizes),
                total: Math.max(...totalSizes),
                usedMB: (Math.max(...usedSizes) / (1024 * 1024)).toFixed(2)
            },
            average: {
                used: usedSizes.reduce((sum, val) => sum + val, 0) / usedSizes.length,
                total: totalSizes.reduce((sum, val) => sum + val, 0) / totalSizes.length
            },
            trend: this.calculateMemoryTrend(history),
            gcCount: this.metrics.gcCount,
            potentialLeaks: this.metrics.potentialLeaks.length
        };
    }
    
    /**
     * 設定更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 監視中の場合は再起動
        if (this.state.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }
    
    /**
     * リソースクリーンアップ
     */
    destroy() {
        this.stopMonitoring();
        
        if (this.state.performanceObserver) {
            this.state.performanceObserver.disconnect();
        }
        
        this.state.memoryHistory = [];
        this.state.leakDetectionData.clear();
        this.metrics.potentialLeaks = [];
    }
}

// グローバルインスタンス作成
window.memoryMonitor = new MemoryEfficiencyMonitor();

// 自動開始（開発環境）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.memoryMonitor.startMonitoring();
    console.log('🧠 Memory efficiency monitoring started in development mode');
}

export default MemoryEfficiencyMonitor;