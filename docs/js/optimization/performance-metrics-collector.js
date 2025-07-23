/**
 * 高精度パフォーマンスメトリクス収集システム
 * Geminiのベストプラクティスに基づいた実装
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
            percentiles: [50, 95, 99] // 計算するパーセンタイル
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
        
        // オーバーレイ表示
        this.overlay = null;
        this.overlayUpdateInterval = null;
    }
    
    /**
     * メトリクス収集を開始
     */
    start() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        this.lastFrameTime = performance.now();
        
        // オーバーレイを作成
        this.createOverlay();
        
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
        
        console.log('Performance metrics collection started');
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
        }
    }
    
    /**
     * レンダリングの計測開始
     */
    startRenderTiming() {
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
        }
    }
    
    /**
     * 入力処理の計測開始
     */
    startInputTiming() {
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
    stop() {
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
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
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
}

// シングルトンインスタンス
export const metricsCollector = new PerformanceMetricsCollector();