/**
 * SharedMemory Performance Metrics Collector
 * SharedArrayBufferとAtomicsを使用した高速メトリクス収集システム
 * 
 * メッセージパッシングのオーバーヘッドを排除し、
 * 高頻度メトリクス更新を効率的に処理
 */

export class SharedMemoryMetricsCollector {
    constructor() {
        // 設定
        this.config = {
            maxSamples: 1000,
            sampleInterval: 100,
            percentiles: [50, 95, 99],
            workerScriptPath: './shared-memory-worker.js',
            enableFallback: true,
            sharedBufferSize: 24032,  // BUFFER_CONFIG.DATA_OFFSETから計算
            enablePersistence: true
        };
        
        // 状態管理
        this.isCollecting = false;
        this.isInitialized = false;
        this.sessionId = null;
        this.sessionStartTime = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        
        // SharedArrayBuffer関連
        this.sharedBuffer = null;
        this.sharedArray = null;
        this.controlView = null;
        this.statsView = null;
        this.dataView = null;
        this.worker = null;
        
        // フォールバック用（従来の実装）
        this.fallbackCollector = null;
        this.useFallback = false;
        
        // バッファ構成（shared-memory-worker.jsと同期）
        this.BUFFER_CONFIG = {
            CONTROL_OFFSET: 0,
            WRITE_INDEX_OFFSET: 4,
            READ_INDEX_OFFSET: 8,
            STATS_OFFSET: 12,
            DATA_OFFSET: 32,
            MAX_ENTRIES: 1000,
            ENTRY_SIZE: 24,
            FLAGS: {
                WORKER_READY: 1,
                COLLECTION_ACTIVE: 2,
                SHUTDOWN: 4,
                FLUSH_REQUESTED: 8
            }
        };
        
        // ローカルメトリクス（UI表示用）
        this.metrics = {
            frameTimes: [],
            fps: [],
            gameLogicTime: [],
            renderingTime: [],
            inputProcessingTime: [],
            memoryUsage: [],
            gcEvents: [],
            webWorkerLatency: []
        };
        
        // タイミング管理
        this.timings = {
            frameStart: 0,
            gameLogicStart: 0,
            renderStart: 0,
            inputStart: 0
        };
        
        // メトリクスタイプのエンコーディング
        this.metricTypeMap = {
            'fps': 0,
            'frameTime': 1,
            'memory': 2,
            'gameLogic': 3,
            'rendering': 4,
            'input': 5,
            'gc': 6,
            'latency': 7
        };
        
        this.categoryMap = {
            'performance': 0,
            'memory': 1,
            'timing': 2,
            'events': 3
        };
        
        // パフォーマンス統計
        this.performanceStats = {
            writeOperations: 0,
            atomicFailures: 0,
            bufferOverflows: 0,
            avgWriteTime: 0,
            lastWriteTime: 0
        };
        
        // オーバーレイ
        this.overlay = null;
        this.overlayUpdateInterval = null;
        
        // 初期化
        this.initialize();
    }
    
    /**
     * システムの初期化
     */
    async initialize() {
        try {
            // SharedArrayBufferサポートをチェック
            if (typeof SharedArrayBuffer === 'undefined') {
                console.warn('SharedArrayBuffer not supported, falling back to message passing');
                await this.initializeFallback();
                return;
            }
            
            // Atomicsサポートをチェック
            if (typeof Atomics === 'undefined') {
                console.warn('Atomics not supported, falling back to message passing');
                await this.initializeFallback();
                return;
            }
            
            // Workerの初期化
            await this.initializeSharedMemoryWorker();
            
        } catch (error) {
            console.error('Failed to initialize SharedMemory system:', error);
            await this.initializeFallback();
        }
    }
    
    /**
     * SharedMemory Workerの初期化
     */
    async initializeSharedMemoryWorker() {
        return new Promise((resolve, reject) => {
            try {
                // Workerを作成
                this.worker = new Worker(this.config.workerScriptPath, { type: 'module' });
                
                // メッセージハンドラーを設定
                this.worker.addEventListener('message', (event) => {
                    this.handleWorkerMessage(event.data);
                });
                
                this.worker.addEventListener('error', (error) => {
                    console.error('SharedMemory Worker error:', error);
                    reject(error);
                });
                
                // 初期化メッセージを送信
                this.worker.postMessage({
                    type: 'init',
                    data: { bufferSize: this.config.sharedBufferSize }
                });
                
                // 初期化完了を待つ
                this.initResolve = resolve;
                this.initReject = reject;
                
                // タイムアウト設定
                setTimeout(() => {
                    if (this.initReject) {
                        this.initReject(new Error('Worker initialization timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Workerからのメッセージを処理
     */
    handleWorkerMessage(message) {
        const { type, data, error } = message;
        
        if (error) {
            console.error('Worker message error:', error);
            if (this.initReject) {
                this.initReject(new Error(error.message));
                this.initReject = null;
                this.initResolve = null;
            }
            return;
        }
        
        switch (type) {
            case 'init':
                this.handleWorkerInit(data);
                break;
                
            case 'createSession':
                this.sessionId = data.sessionId;
                console.log('Session created:', this.sessionId);
                break;
                
            case 'stats':
                this.updateWorkerStats(data);
                break;
                
            case 'error':
                console.error('Worker error:', error);
                break;
        }
    }
    
    /**
     * Worker初期化完了処理
     */
    handleWorkerInit(data) {
        if (!data.success) {
            if (this.initReject) {
                this.initReject(new Error('Worker initialization failed'));
                this.initReject = null;
                this.initResolve = null;
            }
            return;
        }
        
        try {
            // SharedArrayBufferを受け取る
            this.sharedBuffer = data.sharedBuffer;
            this.sharedArray = new Int32Array(this.sharedBuffer);
            
            // ビューを作成
            this.controlView = new Int32Array(this.sharedBuffer, 0, 8);
            this.statsView = new Float32Array(this.sharedBuffer, this.BUFFER_CONFIG.STATS_OFFSET, 5);
            this.dataView = new Float32Array(this.sharedBuffer, this.BUFFER_CONFIG.DATA_OFFSET);
            
            this.isInitialized = true;
            
            console.log('SharedMemory MetricsCollector initialized', {
                bufferSize: data.bufferSize,
                maxEntries: data.maxEntries,
                sharedBufferSupported: true
            });
            
            if (this.initResolve) {
                this.initResolve();
                this.initResolve = null;
                this.initReject = null;
            }
            
        } catch (error) {
            console.error('Failed to setup shared memory views:', error);
            if (this.initReject) {
                this.initReject(error);
                this.initReject = null;
                this.initResolve = null;
            }
        }
    }
    
    /**
     * フォールバック初期化
     */
    async initializeFallback() {
        if (this.config.enableFallback) {
            // 従来のメトリクスコレクターを動的インポート
            try {
                const { PerformanceMetricsCollector } = await import('./performance-metrics-collector.js');
                this.fallbackCollector = new PerformanceMetricsCollector();
                this.useFallback = true;
                this.isInitialized = true;
                
                console.log('Initialized with fallback metrics collector');
            } catch (error) {
                console.error('Failed to initialize fallback collector:', error);
                throw error;
            }
        } else {
            throw new Error('SharedArrayBuffer not supported and fallback disabled');
        }
    }
    
    /**
     * メトリクス収集を開始
     */
    async start() {
        if (this.isCollecting) return;
        
        // 初期化完了を待つ
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (this.useFallback) {
            return await this.fallbackCollector.start();
        }
        
        this.isCollecting = true;
        this.lastFrameTime = performance.now();
        this.sessionStartTime = performance.now();
        
        // セッション作成
        await this.createSession();
        
        // 収集アクティブフラグを設定
        this.setCollectionActive(true);
        
        // オーバーレイを作成
        this.createOverlay();
        
        // メインループを開始
        this.collectFrame();
        
        // メモリ監視
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                this.recordMemoryUsage();
            }, this.config.sampleInterval);
        }
        
        // オーバーレイ更新
        this.overlayUpdateInterval = setInterval(() => {
            this.updateOverlay();
        }, 250);
        
        console.log('SharedMemory metrics collection started');
    }
    
    /**
     * セッション作成
     */
    async createSession() {
        if (!this.worker) return;
        
        this.worker.postMessage({
            type: 'createSession',
            data: {
                gameMode: window.gameMode || 'default',
                url: window.location.href,
                timestamp: Date.now()
            }
        });
    }
    
    /**
     * 収集アクティブフラグの設定
     */
    setCollectionActive(active) {
        if (!this.isInitialized || this.useFallback) return;
        
        const currentFlags = Atomics.load(this.controlView, 0);
        if (active) {
            Atomics.store(this.controlView, 0, currentFlags | this.BUFFER_CONFIG.FLAGS.COLLECTION_ACTIVE);
        } else {
            Atomics.store(this.controlView, 0, currentFlags & ~this.BUFFER_CONFIG.FLAGS.COLLECTION_ACTIVE);
        }
    }
    
    /**
     * フレームごとのメトリクス収集
     */
    collectFrame() {
        if (!this.isCollecting) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        // メトリクスを記録
        this.recordMetric('frameTime', frameTime);
        
        // 瞬間FPSを計算
        const instantFPS = frameTime > 0 ? 1000 / frameTime : 0;
        this.recordMetric('fps', instantFPS);
        
        this.lastFrameTime = now;
        this.frameCount++;
        
        // 次のフレームをスケジュール
        this.animationFrameId = requestAnimationFrame(() => this.collectFrame());
    }
    
    /**
     * メトリクスを記録（SharedArrayBufferに直接書き込み）
     */
    recordMetric(metricName, value, category = 'performance') {
        if (this.useFallback) {
            return this.fallbackCollector.recordMetric(metricName, value);
        }
        
        if (!this.isInitialized || !this.isCollecting) return;
        
        const startTime = performance.now();
        
        // ローカルメトリクスも更新（UI表示用）
        this.updateLocalMetrics(metricName, value);
        
        try {
            // SharedArrayBufferに書き込み
            this.writeToSharedBuffer(metricName, value, category);
            
            // パフォーマンス統計を更新
            this.performanceStats.writeOperations++;
            this.performanceStats.lastWriteTime = performance.now() - startTime;
            this.performanceStats.avgWriteTime = 
                (this.performanceStats.avgWriteTime * 0.9) + (this.performanceStats.lastWriteTime * 0.1);
                
        } catch (error) {
            console.error('Failed to write metric to shared buffer:', error);
            this.performanceStats.atomicFailures++;
        }
    }
    
    /**
     * SharedArrayBufferに書き込み
     */
    writeToSharedBuffer(metricName, value, category) {
        const timestamp = Date.now();
        const metricType = this.metricTypeMap[metricName] || 0;
        const categoryCode = this.categoryMap[category] || 0;
        
        // リングバッファの現在の書き込み位置を取得
        const currentWriteIndex = Atomics.load(this.controlView, 1);
        const entryIndex = currentWriteIndex % this.BUFFER_CONFIG.MAX_ENTRIES;
        const dataOffset = entryIndex * (this.BUFFER_CONFIG.ENTRY_SIZE / 4); // Float32Array用
        
        // データを書き込み
        this.dataView[dataOffset] = timestamp;
        this.dataView[dataOffset + 1] = metricType;
        this.dataView[dataOffset + 2] = value;
        this.dataView[dataOffset + 3] = this.frameCount;
        this.dataView[dataOffset + 4] = categoryCode;
        this.dataView[dataOffset + 5] = this.performanceStats.lastWriteTime;
        
        // 書き込みインデックスを更新（アトミック操作）
        const newWriteIndex = currentWriteIndex + 1;
        
        // バッファオーバーフローをチェック
        const readIndex = Atomics.load(this.controlView, 2);
        const bufferUsage = (newWriteIndex - readIndex + this.BUFFER_CONFIG.MAX_ENTRIES) % this.BUFFER_CONFIG.MAX_ENTRIES;
        
        if (bufferUsage >= this.BUFFER_CONFIG.MAX_ENTRIES - 10) {
            // バッファがほぼ満杯の場合、フラッシュを要求
            const currentFlags = Atomics.load(this.controlView, 0);
            Atomics.store(this.controlView, 0, currentFlags | this.BUFFER_CONFIG.FLAGS.FLUSH_REQUESTED);
            this.performanceStats.bufferOverflows++;
        }
        
        // 書き込みインデックスを更新
        Atomics.store(this.controlView, 1, newWriteIndex);
    }
    
    /**
     * ローカルメトリクスの更新（UI表示用）
     */
    updateLocalMetrics(metricName, value) {
        if (!this.metrics[metricName]) {
            this.metrics[metricName] = [];
        }
        
        this.metrics[metricName].push(value);
        
        // 最大サンプル数を制限
        if (this.metrics[metricName].length > this.config.maxSamples) {
            this.metrics[metricName].shift();
        }
    }
    
    /**
     * ゲームロジックタイミングメソッド
     */
    startGameLogicTiming() {
        this.timings.gameLogicStart = performance.now();
    }
    
    endGameLogicTiming() {
        if (this.timings.gameLogicStart > 0) {
            const duration = performance.now() - this.timings.gameLogicStart;
            this.recordMetric('gameLogic', duration, 'timing');
            this.timings.gameLogicStart = 0;
        }
    }
    
    startRenderTiming() {
        this.timings.renderStart = performance.now();
    }
    
    endRenderTiming() {
        if (this.timings.renderStart > 0) {
            const duration = performance.now() - this.timings.renderStart;
            this.recordMetric('rendering', duration, 'timing');
            this.timings.renderStart = 0;
        }
    }
    
    startInputTiming() {
        this.timings.inputStart = performance.now();
    }
    
    endInputTiming() {
        if (this.timings.inputStart > 0) {
            const duration = performance.now() - this.timings.inputStart;
            this.recordMetric('input', duration, 'timing');
            this.timings.inputStart = 0;
        }
    }
    
    /**
     * メモリ使用量を記録
     */
    recordMemoryUsage() {
        if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1048576;
            this.recordMetric('memory', usedMB, 'memory');
            
            // GC検出
            const prevUsage = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 2];
            if (prevUsage && usedMB < prevUsage * 0.7) {
                this.metrics.gcEvents.push({
                    timestamp: performance.now(),
                    before: prevUsage,
                    after: usedMB
                });
            }
        }
    }
    
    /**
     * WebWorker遅延を記録
     */
    recordWebWorkerLatency(latency) {
        this.recordMetric('latency', latency, 'timing');
    }
    
    /**
     * 統計情報を計算
     */
    calculateStats(values) {
        if (!values || values.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, stdDev: 0 };
        }
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        
        const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / sorted.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: avg,
            median: this.getPercentile(sorted, 50),
            p95: this.getPercentile(sorted, 95),
            p99: this.getPercentile(sorted, 99),
            stdDev: stdDev
        };
    }
    
    /**
     * パーセンタイルを計算
     */
    getPercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        if (lower === upper) {
            return sortedArray[lower];
        }
        
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
    
    /**
     * サマリーを取得
     */
    getSummary() {
        if (this.useFallback) {
            return this.fallbackCollector.getSummary();
        }
        
        const summary = {};
        
        // 各メトリクスの統計情報を計算
        for (const [key, values] of Object.entries(this.metrics)) {
            if (Array.isArray(values) && values.length > 0 && typeof values[0] === 'number') {
                summary[key] = this.calculateStats(values);
            }
        }
        
        // 現在の値を追加
        if (summary.fps) {
            summary.fps.current = this.metrics.fps[this.metrics.fps.length - 1] || 0;
        }
        
        if (summary.memoryUsage) {
            summary.memoryUsage.current = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0;
        }
        
        // フレーム時間の内訳
        if (summary.frameTimes && summary.gameLogicTime && summary.renderingTime) {
            const totalTime = summary.frameTimes.avg;
            if (totalTime > 0) {
                summary.breakdown = {
                    gameLogic: (summary.gameLogicTime.avg / totalTime) * 100,
                    rendering: (summary.renderingTime.avg / totalTime) * 100,
                    other: 100 - ((summary.gameLogicTime.avg + summary.renderingTime.avg) / totalTime) * 100
                };
            }
        }
        
        // SharedMemory統計を追加
        if (this.isInitialized && !this.useFallback) {
            summary.sharedMemory = {
                writeOperations: this.performanceStats.writeOperations,
                atomicFailures: this.performanceStats.atomicFailures,
                bufferOverflows: this.performanceStats.bufferOverflows,
                avgWriteTime: this.performanceStats.avgWriteTime,
                bufferUtilization: this.getBufferUtilization()
            };
        }
        
        return summary;
    }
    
    /**
     * バッファ使用率を取得
     */
    getBufferUtilization() {
        if (!this.isInitialized || this.useFallback) return 0;
        
        const writeIndex = Atomics.load(this.controlView, 1);
        const readIndex = Atomics.load(this.controlView, 2);
        const used = (writeIndex - readIndex + this.BUFFER_CONFIG.MAX_ENTRIES) % this.BUFFER_CONFIG.MAX_ENTRIES;
        
        return (used / this.BUFFER_CONFIG.MAX_ENTRIES) * 100;
    }
    
    /**
     * Workerの統計情報を更新
     */
    updateWorkerStats(data) {
        this.workerStats = data;
    }
    
    /**
     * パフォーマンスオーバーレイを作成
     */
    createOverlay() {
        if (this.overlay) {
            this.overlay.remove();
        }
        
        this.overlay = document.createElement('div');
        this.overlay.id = 'shared-memory-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            min-width: 280px;
            line-height: 1.5;
            pointer-events: none;
            user-select: none;
            border: 1px solid #333;
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    /**
     * オーバーレイを更新
     */
    updateOverlay() {
        if (!this.overlay || !this.isCollecting) return;
        
        const summary = this.getSummary();
        const currentFPS = summary.fps?.current || 0;
        const avgFrameTime = summary.frameTimes?.avg || 0;
        const bufferUtil = this.getBufferUtilization();
        
        // カラーコーディング
        const getFPSColor = (fps) => {
            if (fps >= 55) return '#0f0';
            if (fps >= 30) return '#ff0';
            return '#f00';
        };
        
        const getBufferColor = (util) => {
            if (util < 70) return '#0f0';
            if (util < 90) return '#ff0';
            return '#f00';
        };
        
        this.overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #00f;">SharedMemory Performance</div>
            <div>Mode: <span style="color: ${this.useFallback ? '#f00' : '#0f0'}">${this.useFallback ? 'Fallback' : 'SharedArrayBuffer'}</span></div>
            <div>FPS: <span style="color: ${getFPSColor(currentFPS)}">${currentFPS.toFixed(1)}</span></div>
            <div>Frame: ${avgFrameTime.toFixed(2)}ms</div>
            ${!this.useFallback ? `
            <div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 5px;">
                <div>Buffer: <span style="color: ${getBufferColor(bufferUtil)}">${bufferUtil.toFixed(1)}%</span></div>
                <div>Writes: ${this.performanceStats.writeOperations}</div>
                <div>Write Time: ${this.performanceStats.avgWriteTime.toFixed(3)}ms</div>
                <div>Failures: ${this.performanceStats.atomicFailures}</div>
                <div>Overflows: ${this.performanceStats.bufferOverflows}</div>
            </div>
            ` : ''}
            ${summary.gameLogicTime?.avg > 0 ? `
            <div style="margin-top: 5px;">
                <div>Logic: ${(summary.gameLogicTime?.avg || 0).toFixed(2)}ms</div>
                <div>Render: ${(summary.renderingTime?.avg || 0).toFixed(2)}ms</div>
            </div>
            ` : ''}
        `;
    }
    
    /**
     * メトリクス収集を停止
     */
    async stop() {
        if (this.useFallback) {
            return await this.fallbackCollector.stop();
        }
        
        this.isCollecting = false;
        
        // 収集アクティブフラグをクリア
        this.setCollectionActive(false);
        
        // アニメーションフレームをキャンセル
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // インターバルをクリア
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
        
        if (this.overlayUpdateInterval) {
            clearInterval(this.overlayUpdateInterval);
            this.overlayUpdateInterval = null;
        }
        
        // オーバーレイを削除
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        // フラッシュを要求
        if (this.isInitialized && this.worker) {
            const currentFlags = Atomics.load(this.controlView, 0);
            Atomics.store(this.controlView, 0, currentFlags | this.BUFFER_CONFIG.FLAGS.FLUSH_REQUESTED);
        }
        
        console.log('SharedMemory metrics collection stopped');
    }
    
    /**
     * クリーンアップ
     */
    async cleanup() {
        if (this.useFallback) {
            return await this.fallbackCollector.cleanup();
        }
        
        await this.stop();
        
        if (this.worker) {
            // シャットダウンフラグを設定
            if (this.isInitialized) {
                const currentFlags = Atomics.load(this.controlView, 0);
                Atomics.store(this.controlView, 0, currentFlags | this.BUFFER_CONFIG.FLAGS.SHUTDOWN);
            }
            
            // Workerにシャットダウンメッセージを送信
            this.worker.postMessage({ type: 'shutdown' });
            
            // Workerを終了
            setTimeout(() => {
                this.worker.terminate();
                this.worker = null;
            }, 1000);
        }
        
        this.isInitialized = false;
    }
    
    /**
     * 互換性メソッド
     */
    start() { return this.start(); }
    startCollection() { return this.start(); }
    stopCollection() { return this.stop(); }
    getStats() { return this.getSummary(); }
    
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            duration: this.sessionId ? performance.now() - this.sessionStartTime : 0,
            frameCount: this.frameCount,
            persistenceEnabled: this.config.enablePersistence,
            pendingMetrics: 0, // SharedMemoryでは不要
            useFallback: this.useFallback,
            sharedMemorySupported: !this.useFallback
        };
    }
    
    /**
     * 保存されたメトリクスをクエリ（Workerに委譲）
     */
    async queryStoredMetrics(options = {}) {
        if (this.useFallback) {
            return await this.fallbackCollector.queryStoredMetrics(options);
        }
        
        if (!this.worker || !this.sessionId) {
            throw new Error('Session not active or worker not available');
        }
        
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.data.type === 'queryResult') {
                    this.worker.removeEventListener('message', handleMessage);
                    resolve(event.data.data);
                }
            };
            
            this.worker.addEventListener('message', handleMessage);
            this.worker.postMessage({
                type: 'query',
                data: {
                    sessionId: this.sessionId,
                    ...options
                }
            });
        });
    }
}

// シングルトンインスタンス
export const sharedMemoryMetricsCollector = new SharedMemoryMetricsCollector();