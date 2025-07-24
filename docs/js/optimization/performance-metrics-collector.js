/**
 * 高精度パフォーマンスメトリクス収集システム
 * Geminiのベストプラクティスに基づいた実装
 * IndexedDB永続化機能統合版
 */

export class PerformanceMetricsCollector {
    constructor() {
        // メトリクスデータ
        this.metrics = {
            frameTimes: [],        // フレーム時間（ms）
            fps: [],               // 瞬間FPS
            gameLogicTime: [],     // ゲームロジック更新時間
            renderingTime: [],     // レンダリング時間
            inputProcessingTime: [], // 入力処理時間
            memoryUsage: [],       // メモリ使用量（MB）
            gcEvents: [],          // ガベージコレクションイベント
            webWorkerLatency: []   // WebWorker通信遅延
        };
        
        // 設定
        this.config = {
            maxSamples: 1000,      // 保持する最大サンプル数
            sampleInterval: 100,   // サンプリング間隔（ms）
            percentiles: [50, 95, 99], // 計算するパーセンタイル
            persistInterval: 5000,  // IndexedDB保存間隔（5秒）
            enablePersistence: true // 永続化の有効/無効
        };
        
        // 状態管理
        this.isCollecting = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.animationFrameId = null;
        
        // タイミング計測用
        this.timings = {
            frameStart: 0,
            gameLogicStart: 0,
            renderStart: 0,
            inputStart: 0
        };
        
        // オーバーラップ検出用
        this.timingOverlaps = {
            enabled: true,
            activeTimings: new Map(),
            overlapEvents: []
        };
        
        // イベントリスナー管理
        this.eventListeners = new Map();
        
        // オーバーレイ表示
        this.overlay = null;
        this.overlayUpdateInterval = null;
        
        // IndexedDB Worker
        this.metricsWorker = null;
        this.sessionId = null;
        this.pendingMetrics = [];
        this.lastPersistTime = 0;
        
        // Worker通信用のPromiseリゾルバー
        this.workerPromises = new Map();
        this.promiseId = 0;
        
        // 初期化
        this.initializeWorker();
    }
    
    /**
     * Web Workerの初期化
     */
    async initializeWorker() {
        if (!this.config.enablePersistence) return;
        
        try {
            // Workerの作成
            this.metricsWorker = new Worker('./metrics-worker.js', { type: 'module' });
            
            // メッセージハンドラーの設定
            this.metricsWorker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event.data);
            });
            
            // Workerの初期化
            await this.sendWorkerMessage('init', {});
            console.log('Metrics worker initialized');
        } catch (error) {
            console.error('Failed to initialize metrics worker:', error);
            this.config.enablePersistence = false;
        }
    }
    
    /**
     * Workerにメッセージを送信（Promise対応）
     */
    sendWorkerMessage(type, data) {
        return new Promise((resolve, reject) => {
            const id = this.promiseId++;
            this.workerPromises.set(id, { resolve, reject });
            
            this.metricsWorker.postMessage({
                id,
                type,
                data
            });
            
            // タイムアウト設定
            setTimeout(() => {
                if (this.workerPromises.has(id)) {
                    this.workerPromises.delete(id);
                    reject(new Error(`Worker message timeout: ${type}`));
                }
            }, 10000);
        });
    }
    
    /**
     * Workerからのメッセージを処理
     */
    handleWorkerMessage(message) {
        const { id, type, data, error } = message;
        
        // Promise応答の処理
        if (id !== undefined && this.workerPromises.has(id)) {
            const promise = this.workerPromises.get(id);
            this.workerPromises.delete(id);
            
            if (error) {
                promise.reject(new Error(error.message));
            } else {
                promise.resolve(data);
            }
            return;
        }
        
        // イベント処理
        switch (type) {
            case 'batchSaved':
                console.log(`Batch saved: ${message.count} metrics, ${message.remaining} remaining`);
                break;
                
            case 'error':
                console.error('Worker error:', message.error);
                break;
        }
    }
    
    /**
     * メトリクス収集を開始
     */
    async start() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        this.lastFrameTime = performance.now();
        
        // セッションの作成（永続化が有効な場合）
        if (this.config.enablePersistence && this.metricsWorker) {
            try {
                console.log('[METRICS] Creating session...');
                const response = await this.sendWorkerMessage('createSession', {
                    gameMode: window.gameMode || 'default',
                    url: window.location.href,
                    timestamp: Date.now()
                });
                console.log('[METRICS] Session creation response:', response);
                // レスポンスからsessionIdを設定
                if (response && response.sessionId) {
                    this.sessionId = response.sessionId;
                    this.sessionStartTime = performance.now();
                    console.log('[METRICS] Session created with ID:', this.sessionId);
                } else {
                    console.warn('[METRICS] No sessionId received from worker, response:', response);
                }
            } catch (error) {
                console.error('[METRICS] Failed to create session:', error);
            }
        } else {
            console.log('[METRICS] Session creation skipped:', {
                enablePersistence: this.config.enablePersistence,
                metricsWorker: !!this.metricsWorker
            });
        }
        
        // オーバーレイを作成
        this.createOverlay();
        
        // セッション作成が完了してからメトリクス収集を開始
        // これによりsessionIdが設定された状態でメトリクスが記録される
        this.lastFrameTime = performance.now(); // 再設定（セッション作成分の時間を除外）
        
        // メインループを開始
        this.collectFrame();
        
        // メモリ使用量の定期収集（Chrome系ブラウザのみ）
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                this.recordMemoryUsage();
            }, this.config.sampleInterval);
        }
        
        // オーバーレイの定期更新
        this.overlayUpdateInterval = setInterval(() => {
            this.updateOverlay();
        }, 250); // 250msごとに更新
        
        // 永続化の定期実行
        if (this.config.enablePersistence) {
            this.persistInterval = setInterval(() => {
                this.persistMetrics();
            }, this.config.persistInterval);
        }
        
        console.log('Performance metrics collection started with sessionId:', this.sessionId);
    }
    
    /**
     * フレームごとのメトリクス収集
     */
    collectFrame() {
        if (!this.isCollecting) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        // フレーム時間を記録
        this.recordMetric('frameTimes', frameTime);
        
        // 瞬間FPSを計算
        const instantFPS = frameTime > 0 ? 1000 / frameTime : 0;
        this.recordMetric('fps', instantFPS);
        
        this.lastFrameTime = now;
        this.frameCount++;
        
        // 次のフレームをスケジュール
        this.animationFrameId = requestAnimationFrame(() => this.collectFrame());
    }
    
    /**
     * ゲームロジックの計測開始
     */
    startGameLogicTiming() {
        this._startTiming('gameLogic');
        this.timings.gameLogicStart = performance.now();
    }
    
    /**
     * ゲームロジックの計測終了
     */
    endGameLogicTiming() {
        if (this.timings.gameLogicStart > 0) {
            const duration = performance.now() - this.timings.gameLogicStart;
            this.recordMetric('gameLogicTime', duration);
            this.timings.gameLogicStart = 0;
            this._endTiming('gameLogic');
        }
    }
    
    /**
     * レンダリングの計測開始
     */
    startRenderTiming() {
        this._startTiming('rendering');
        this.timings.renderStart = performance.now();
    }
    
    /**
     * レンダリングの計測終了
     */
    endRenderTiming() {
        if (this.timings.renderStart > 0) {
            const duration = performance.now() - this.timings.renderStart;
            this.recordMetric('renderingTime', duration);
            this.timings.renderStart = 0;
            this._endTiming('rendering');
        }
    }
    
    /**
     * 入力処理の計測開始
     */
    startInputTiming() {
        this._startTiming('input');
        this.timings.inputStart = performance.now();
    }
    
    /**
     * 入力処理の計測終了
     */
    endInputTiming() {
        if (this.timings.inputStart > 0) {
            const duration = performance.now() - this.timings.inputStart;
            this.recordMetric('inputProcessingTime', duration);
            this.timings.inputStart = 0;
            this._endTiming('input');
        }
    }
    
    /**
     * WebWorker通信遅延を記録
     */
    recordWebWorkerLatency(latency) {
        this.recordMetric('webWorkerLatency', latency);
    }
    
    /**
     * メトリクスを記録
     */
    recordMetric(metricName, value) {
        if (!this.metrics[metricName]) return;
        
        this.metrics[metricName].push(value);
        
        // 最大サンプル数を超えたら古いデータを削除
        if (this.metrics[metricName].length > this.config.maxSamples) {
            this.metrics[metricName].shift();
        }
        
        // 永続化用のペンディングメトリクスに追加
        if (this.config.enablePersistence && this.sessionId) {
            this.pendingMetrics.push({
                sessionId: this.sessionId,
                type: metricName,
                value: value,
                timestamp: Date.now()
            });
        } else if (this.config.enablePersistence && !this.sessionId) {
            // デバッグ：sessionIdがない場合のログ
            console.warn(`[METRICS] No sessionId when recording ${metricName}:`, {
                enablePersistence: this.config.enablePersistence,
                sessionId: this.sessionId,
                isCollecting: this.isCollecting,
                pendingMetricsCount: this.pendingMetrics.length
            });
        }
    }
    
    /**
     * メトリクスをIndexedDBに永続化
     */
    async persistMetrics() {
        if (!this.config.enablePersistence || !this.metricsWorker || !this.sessionId) {
            console.log('[METRICS] Persist skipped:', {
                enablePersistence: this.config.enablePersistence,
                metricsWorker: !!this.metricsWorker,
                sessionId: this.sessionId,
                pendingCount: this.pendingMetrics.length
            });
            return;
        }
        
        if (this.pendingMetrics.length === 0) {
            return;
        }
        
        // ペンディングメトリクスをコピーして送信
        const metricsToSave = [...this.pendingMetrics];
        this.pendingMetrics = [];
        
        console.log('[METRICS] Persisting metrics:', {
            sessionId: this.sessionId,
            count: metricsToSave.length,
            samples: metricsToSave.slice(0, 3).map(m => ({
                type: m.type,
                sessionId: m.sessionId,
                hasSessionId: !!m.sessionId
            }))
        });
        
        try {
            await this.sendWorkerMessage('addMetrics', metricsToSave);
            this.lastPersistTime = Date.now();
        } catch (error) {
            console.error('Failed to persist metrics:', error);
            // 失敗した場合はペンディングに戻す
            this.pendingMetrics.unshift(...metricsToSave);
        }
    }
    
    /**
     * メモリ使用量を記録
     */
    recordMemoryUsage() {
        if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1048576;
            this.recordMetric('memoryUsage', usedMB);
            
            // ガベージコレクションの検出（ヒューリスティック）
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
     * 統計情報を計算
     */
    calculateStats(values) {
        if (!values || values.length === 0) {
            return {
                min: 0,
                max: 0,
                avg: 0,
                median: 0,
                p95: 0,
                p99: 0,
                stdDev: 0
            };
        }
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        
        // 標準偏差
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
     * 現在のメトリクスサマリーを取得
     */
    getSummary() {
        const summary = {};
        
        // 各メトリクスの統計情報を計算
        for (const [key, values] of Object.entries(this.metrics)) {
            if (Array.isArray(values) && values.length > 0 && typeof values[0] === 'number') {
                summary[key] = this.calculateStats(values);
            }
        }
        
        // 追加の計算
        if (summary.fps) {
            summary.fps.current = this.metrics.fps[this.metrics.fps.length - 1] || 0;
        }
        
        if (summary.memoryUsage) {
            summary.memoryUsage.current = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0;
        }
        
        // フレーム時間の内訳
        if (summary.frameTimes && summary.gameLogicTime && summary.renderingTime) {
            const totalTime = summary.frameTimes.avg;
            const gameLogicPct = totalTime > 0 ? (summary.gameLogicTime.avg / totalTime) * 100 : 0;
            const renderingPct = totalTime > 0 ? (summary.renderingTime.avg / totalTime) * 100 : 0;
            const otherPct = 100 - gameLogicPct - renderingPct;
            
            summary.breakdown = {
                gameLogic: gameLogicPct,
                rendering: renderingPct,
                other: otherPct
            };
        }
        
        return summary;
    }
    
    /**
     * パフォーマンスオーバーレイを作成
     */
    createOverlay() {
        // 既存のオーバーレイがあれば削除
        if (this.overlay) {
            this.overlay.remove();
        }
        
        // オーバーレイコンテナを作成
        this.overlay = document.createElement('div');
        this.overlay.id = 'performance-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            min-width: 250px;
            line-height: 1.5;
            pointer-events: none;
            user-select: none;
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    /**
     * オーバーレイを更新
     */
    updateOverlay() {
        if (!this.overlay || !this.isCollecting) return;
        
        const summary = this.getSummary();
        
        // カラーコーディング
        const getFPSColor = (fps) => {
            if (fps >= 55) return '#0f0';  // 緑
            if (fps >= 30) return '#ff0';  // 黄
            return '#f00';                  // 赤
        };
        
        const getTimeColor = (time) => {
            if (time <= 16.67) return '#0f0'; // 60fps以内
            if (time <= 33.33) return '#ff0'; // 30fps以内
            return '#f00';                     // それ以下
        };
        
        // HTML生成
        const currentFPS = summary.fps?.current || 0;
        const avgFrameTime = summary.frameTimes?.avg || 0;
        
        this.overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Performance Metrics</div>
            <div>FPS: <span style="color: ${getFPSColor(currentFPS)}">${currentFPS.toFixed(1)}</span> (avg: ${(summary.fps?.avg || 0).toFixed(1)})</div>
            <div>Frame: <span style="color: ${getTimeColor(avgFrameTime)}">${avgFrameTime.toFixed(2)}ms</span> (95%: ${(summary.frameTimes?.p95 || 0).toFixed(2)}ms)</div>
            <div style="margin-top: 5px;">Frame Breakdown:</div>
            <div style="margin-left: 10px;">Logic: ${(summary.gameLogicTime?.avg || 0).toFixed(2)}ms (${(summary.breakdown?.gameLogic || 0).toFixed(1)}%)</div>
            <div style="margin-left: 10px;">Render: ${(summary.renderingTime?.avg || 0).toFixed(2)}ms (${(summary.breakdown?.rendering || 0).toFixed(1)}%)</div>
            <div style="margin-left: 10px;">Other: ${(summary.breakdown?.other || 0).toFixed(1)}%</div>
            ${performance.memory ? `
            <div style="margin-top: 5px;">Memory: ${(summary.memoryUsage?.current || 0).toFixed(1)}MB</div>
            <div>GC Events: ${this.metrics.gcEvents.length}</div>
            ` : ''}
            ${summary.webWorkerLatency?.avg > 0 ? `
            <div style="margin-top: 5px;">Worker Latency: ${(summary.webWorkerLatency?.avg || 0).toFixed(2)}ms</div>
            ` : ''}
        `;
    }
    
    /**
     * メトリクス収集を停止
     */
    async stop() {
        this.isCollecting = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
        
        if (this.overlayUpdateInterval) {
            clearInterval(this.overlayUpdateInterval);
            this.overlayUpdateInterval = null;
        }
        
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = null;
        }
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        // 残りのメトリクスを保存
        if (this.config.enablePersistence && this.metricsWorker) {
            try {
                await this.persistMetrics();
                await this.sendWorkerMessage('flush', {});
            } catch (error) {
                console.error('Failed to flush metrics:', error);
            }
        }
        
        console.log('Performance metrics collection stopped');
    }
    
    /**
     * メトリクスをリセット
     */
    reset() {
        for (const key in this.metrics) {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = [];
            }
        }
        this.frameCount = 0;
    }
    
    /**
     * メトリクスデータをエクスポート（将来のIndexedDB保存用）
     */
    exportMetrics() {
        return {
            timestamp: new Date().toISOString(),
            sessionDuration: performance.now(),
            frameCount: this.frameCount,
            metrics: this.metrics,
            summary: this.getSummary()
        };
    }
    
    // 互換性のためのエイリアスメソッド
    startCollection() {
        return this.start();
    }
    
    stopCollection() {
        return this.stop();
    }
    
    getStats() {
        return this.getSummary();
    }
    
    showOverlay() {
        if (!this.overlay && this.isCollecting) {
            this.createOverlay();
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }
    
    /**
     * 保存されたメトリクスをクエリ
     */
    async queryStoredMetrics(options = {}) {
        if (!this.config.enablePersistence || !this.metricsWorker || !this.sessionId) {
            throw new Error('Persistence not enabled or session not active');
        }
        
        try {
            const results = await this.sendWorkerMessage('query', {
                sessionId: this.sessionId,
                ...options
            });
            return results;
        } catch (error) {
            console.error('Failed to query metrics:', error);
            throw error;
        }
    }
    
    /**
     * 集計データを取得
     */
    async getStoredAggregates(startTime, endTime) {
        if (!this.config.enablePersistence || !this.metricsWorker || !this.sessionId) {
            throw new Error('Persistence not enabled or session not active');
        }
        
        try {
            const aggregates = await this.sendWorkerMessage('getAggregates', {
                sessionId: this.sessionId,
                startTime,
                endTime
            });
            return aggregates;
        } catch (error) {
            console.error('Failed to get aggregates:', error);
            throw error;
        }
    }
    
    /**
     * 永続化設定を変更
     */
    setPersistenceEnabled(enabled) {
        this.config.enablePersistence = enabled;
        
        if (enabled && !this.metricsWorker) {
            this.initializeWorker();
        } else if (!enabled && this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = null;
        }
    }
    
    /**
     * 永続化間隔を変更
     */
    setPersistInterval(intervalMs) {
        this.config.persistInterval = intervalMs;
        
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = setInterval(() => {
                this.persistMetrics();
            }, this.config.persistInterval);
        }
    }
    
    /**
     * セッション情報を取得
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            duration: this.sessionId ? performance.now() - this.sessionStartTime : 0,
            frameCount: this.frameCount,
            persistenceEnabled: this.config.enablePersistence,
            pendingMetrics: this.pendingMetrics.length
        };
    }
    
    /**
     * タイミング計測の開始（オーバーラップ検出付き）
     */
    _startTiming(timingType) {
        if (!this.timingOverlaps.enabled) return;
        
        const now = performance.now();
        
        // 既に同じタイプのタイミングが進行中かチェック
        if (this.timingOverlaps.activeTimings.has(timingType)) {
            const existingStart = this.timingOverlaps.activeTimings.get(timingType);
            const overlapEvent = {
                type: 'timing_overlap',
                timingType: timingType,
                timestamp: now,
                previousStart: existingStart,
                overlapDuration: now - existingStart
            };
            
            this.timingOverlaps.overlapEvents.push(overlapEvent);
            
            console.warn(`⚠️ Timing overlap detected for ${timingType}:`, {
                previousStart: existingStart,
                newStart: now,
                overlapDuration: now - existingStart
            });
            
            // メトリクスとして記録
            this.recordMetric('timingOverlaps', {
                timingType,
                overlapDuration: now - existingStart,
                timestamp: now
            });
        }
        
        this.timingOverlaps.activeTimings.set(timingType, now);
    }
    
    /**
     * タイミング計測の終了（オーバーラップ検出付き）
     */
    _endTiming(timingType) {
        if (!this.timingOverlaps.enabled) return;
        
        this.timingOverlaps.activeTimings.delete(timingType);
    }
    
    /**
     * オーバーラップイベントの取得
     */
    getTimingOverlaps() {
        return {
            events: [...this.timingOverlaps.overlapEvents],
            activeTimings: Array.from(this.timingOverlaps.activeTimings.entries()),
            totalOverlaps: this.timingOverlaps.overlapEvents.length
        };
    }
    
    /**
     * オーバーラップ検出の有効/無効切り替え
     */
    setOverlapDetectionEnabled(enabled) {
        this.timingOverlaps.enabled = enabled;
        if (!enabled) {
            this.timingOverlaps.activeTimings.clear();
            this.timingOverlaps.overlapEvents.length = 0;
        }
    }
    
    /**
     * イベントリスナーを追加（自動管理）
     */
    addEventListener(target, event, handler, options = {}) {
        const key = `${target.constructor.name}_${event}_${Date.now()}`;
        
        // イベントリスナーを追加
        target.addEventListener(event, handler, options);
        
        // 管理用に記録
        this.eventListeners.set(key, {
            target,
            event,
            handler,
            options,
            addedAt: performance.now()
        });
        
        return key; // 削除用のキーを返す
    }
    
    /**
     * 特定のイベントリスナーを削除
     */
    removeEventListener(key) {
        const listener = this.eventListeners.get(key);
        if (listener) {
            listener.target.removeEventListener(listener.event, listener.handler, listener.options);
            this.eventListeners.delete(key);
            return true;
        }
        return false;
    }
    
    /**
     * すべてのイベントリスナーをクリーンアップ
     */
    cleanupEventListeners() {
        for (const [key, listener] of this.eventListeners.entries()) {
            try {
                listener.target.removeEventListener(listener.event, listener.handler, listener.options);
            } catch (error) {
                console.warn(`Failed to remove event listener ${key}:`, error);
            }
        }
        
        const count = this.eventListeners.size;
        this.eventListeners.clear();
        
        console.log(`Cleaned up ${count} event listeners`);
        return count;
    }
    
    /**
     * アクティブなイベントリスナー一覧を取得
     */
    getActiveEventListeners() {
        return Array.from(this.eventListeners.entries()).map(([key, listener]) => ({
            key,
            target: listener.target.constructor.name,
            event: listener.event,
            addedAt: listener.addedAt,
            duration: performance.now() - listener.addedAt
        }));
    }
    
    /**
     * Worker を手動でクリーンアップ
     */
    async cleanup() {
        // イベントリスナーをクリーンアップ
        this.cleanupEventListeners();
        
        // オーバーラップ検出データをクリア
        this.timingOverlaps.activeTimings.clear();
        this.timingOverlaps.overlapEvents.length = 0;
        
        // Workerクリーンアップ
        if (this.metricsWorker) {
            try {
                await this.sendWorkerMessage('close', {});
                this.metricsWorker.terminate();
                this.metricsWorker = null;
            } catch (error) {
                console.error('Failed to cleanup worker:', error);
            }
        }
    }
}

// シングルトンインスタンス
export const metricsCollector = new PerformanceMetricsCollector();