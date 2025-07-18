/**
 * パフォーマンスモニタリングシステム
 * 週替わりチャレンジシステムのパフォーマンスを監視・最適化
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            memoryUsage: [],
            wsLatency: [],
            renderTime: [],
            updateTime: []
        };
        
        this.isMonitoring = false;
        this.sampleInterval = 1000; // 1秒ごとにサンプリング
        this.maxSamples = 60; // 最大60サンプル（1分間）
    }

    /**
     * モニタリングを開始
     */
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        
        // FPS計測
        this.fpsInterval = setInterval(() => {
            this.metrics.fps.push(this.frameCount);
            if (this.metrics.fps.length > this.maxSamples) {
                this.metrics.fps.shift();
            }
            this.frameCount = 0;
        }, this.sampleInterval);
        
        // メモリ使用量計測（利用可能な場合）
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                const usage = performance.memory.usedJSHeapSize / 1048576; // MB
                this.metrics.memoryUsage.push(usage);
                if (this.metrics.memoryUsage.length > this.maxSamples) {
                    this.metrics.memoryUsage.shift();
                }
            }, this.sampleInterval);
        }
        
        // レンダリングループの監視
        this.monitorFrame();
    }

    /**
     * フレーム監視
     */
    monitorFrame() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        this.frameCount++;
        
        // レンダリング時間を記録
        if (delta > 0) {
            this.metrics.renderTime.push(delta);
            if (this.metrics.renderTime.length > this.maxSamples) {
                this.metrics.renderTime.shift();
            }
        }
        
        requestAnimationFrame(() => this.monitorFrame());
    }

    /**
     * WebSocket遅延を記録
     */
    recordWSLatency(latency) {
        this.metrics.wsLatency.push(latency);
        if (this.metrics.wsLatency.length > this.maxSamples) {
            this.metrics.wsLatency.shift();
        }
    }

    /**
     * 更新時間を記録
     */
    recordUpdateTime(time) {
        this.metrics.updateTime.push(time);
        if (this.metrics.updateTime.length > this.maxSamples) {
            this.metrics.updateTime.shift();
        }
    }

    /**
     * 現在のメトリクスを取得
     */
    getMetrics() {
        return {
            fps: {
                current: this.metrics.fps[this.metrics.fps.length - 1] || 0,
                average: this.calculateAverage(this.metrics.fps),
                min: Math.min(...this.metrics.fps) || 0,
                max: Math.max(...this.metrics.fps) || 0
            },
            memory: {
                current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0,
                average: this.calculateAverage(this.metrics.memoryUsage),
                max: Math.max(...this.metrics.memoryUsage) || 0
            },
            wsLatency: {
                current: this.metrics.wsLatency[this.metrics.wsLatency.length - 1] || 0,
                average: this.calculateAverage(this.metrics.wsLatency),
                max: Math.max(...this.metrics.wsLatency) || 0
            },
            renderTime: {
                average: this.calculateAverage(this.metrics.renderTime),
                max: Math.max(...this.metrics.renderTime) || 0
            }
        };
    }

    /**
     * パフォーマンス問題を検出
     */
    detectIssues() {
        const metrics = this.getMetrics();
        const issues = [];
        
        // FPS低下
        if (metrics.fps.average < 30) {
            issues.push({
                type: 'LOW_FPS',
                severity: 'critical',
                message: `Average FPS is ${metrics.fps.average.toFixed(1)}, below 30fps threshold`,
                suggestion: 'Reduce rendering complexity or optimize update loops'
            });
        } else if (metrics.fps.average < 50) {
            issues.push({
                type: 'SUBOPTIMAL_FPS',
                severity: 'warning',
                message: `Average FPS is ${metrics.fps.average.toFixed(1)}, below optimal 60fps`,
                suggestion: 'Consider performance optimizations'
            });
        }
        
        // メモリリーク
        if (this.detectMemoryLeak()) {
            issues.push({
                type: 'MEMORY_LEAK',
                severity: 'critical',
                message: 'Potential memory leak detected',
                suggestion: 'Check for unreleased event listeners or retained objects'
            });
        }
        
        // WebSocket遅延
        if (metrics.wsLatency.average > 100) {
            issues.push({
                type: 'HIGH_LATENCY',
                severity: 'warning',
                message: `WebSocket latency is ${metrics.wsLatency.average.toFixed(1)}ms`,
                suggestion: 'Check network conditions or optimize message size'
            });
        }
        
        return issues;
    }

    /**
     * メモリリークを検出
     */
    detectMemoryLeak() {
        if (this.metrics.memoryUsage.length < 10) return false;
        
        // 最近10サンプルの傾向を分析
        const recent = this.metrics.memoryUsage.slice(-10);
        let increasing = 0;
        
        for (let i = 1; i < recent.length; i++) {
            if (recent[i] > recent[i - 1]) increasing++;
        }
        
        // 80%以上増加傾向ならリークの可能性
        return increasing >= 8;
    }

    /**
     * 平均値を計算
     */
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * モニタリングを停止
     */
    stop() {
        this.isMonitoring = false;
        clearInterval(this.fpsInterval);
        clearInterval(this.memoryInterval);
    }

    /**
     * メトリクスをリセット
     */
    reset() {
        this.metrics = {
            fps: [],
            memoryUsage: [],
            wsLatency: [],
            renderTime: [],
            updateTime: []
        };
    }
}

/**
 * パフォーマンス最適化ユーティリティ
 */
export class PerformanceOptimizer {
    constructor() {
        this.rafCallbacks = new Map();
        this.throttledFunctions = new Map();
        this.debouncedFunctions = new Map();
    }

    /**
     * requestAnimationFrameのバッチング
     */
    batchRAF(id, callback) {
        if (!this.rafCallbacks.has(id)) {
            this.rafCallbacks.set(id, callback);
            
            requestAnimationFrame(() => {
                const cb = this.rafCallbacks.get(id);
                if (cb) {
                    cb();
                    this.rafCallbacks.delete(id);
                }
            });
        }
    }

    /**
     * スロットリング
     */
    throttle(func, delay = 16) {
        const key = func.toString();
        
        if (!this.throttledFunctions.has(key)) {
            let lastCall = 0;
            
            this.throttledFunctions.set(key, (...args) => {
                const now = Date.now();
                
                if (now - lastCall >= delay) {
                    lastCall = now;
                    return func(...args);
                }
            });
        }
        
        return this.throttledFunctions.get(key);
    }

    /**
     * デバウンス
     */
    debounce(func, delay = 100) {
        const key = func.toString();
        
        if (!this.debouncedFunctions.has(key)) {
            let timeoutId;
            
            this.debouncedFunctions.set(key, (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func(...args), delay);
            });
        }
        
        return this.debouncedFunctions.get(key);
    }

    /**
     * オブジェクトプール
     */
    createObjectPool(factory, resetFn, initialSize = 10) {
        const pool = [];
        const inUse = new Set();
        
        // 初期オブジェクトを作成
        for (let i = 0; i < initialSize; i++) {
            pool.push(factory());
        }
        
        return {
            acquire() {
                let obj = pool.pop();
                
                if (!obj) {
                    obj = factory();
                }
                
                inUse.add(obj);
                return obj;
            },
            
            release(obj) {
                if (inUse.has(obj)) {
                    inUse.delete(obj);
                    resetFn(obj);
                    pool.push(obj);
                }
            },
            
            size() {
                return {
                    available: pool.length,
                    inUse: inUse.size,
                    total: pool.length + inUse.size
                };
            }
        };
    }

    /**
     * 効率的なDOM更新
     */
    batchDOMUpdates(updates) {
        requestAnimationFrame(() => {
            // 読み取りフェーズ
            const reads = updates
                .filter(u => u.type === 'read')
                .map(u => u.fn());
            
            // 書き込みフェーズ
            updates
                .filter(u => u.type === 'write')
                .forEach((u, i) => u.fn(reads[i]));
        });
    }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();
export const performanceOptimizer = new PerformanceOptimizer();