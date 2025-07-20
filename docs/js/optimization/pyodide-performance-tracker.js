/**
 * Pyodide Performance Tracker - Gemini提案のベースライン測定システム
 * 
 * TTI (Time To Interactive) とPyodide初期化の詳細測定
 * 既存のPerformanceMonitorと連携して包括的なメトリクス収集
 */

export class PyodidePerformanceTracker {
    constructor() {
        this.initializationMetrics = {
            stages: new Map(),
            totalDuration: 0,
            startTime: null,
            endTime: null,
            isComplete: false
        };
        
        this.runtimeMetrics = {
            fps: [],
            frameTimings: [],
            memorySnapshots: [],
            pythonExecutionTimes: [],
            gameLoopPerformance: []
        };
        
        this.browserProfile = this.detectBrowserProfile();
        this.isTracking = false;
        
        console.log('[Pyodide Tracker] Initialized with browser profile:', this.browserProfile);
    }
    
    /**
     * ブラウザプロファイルの検出（Gemini提案の測定項目）
     */
    detectBrowserProfile() {
        const userAgent = navigator.userAgent;
        const start = performance.now();
        
        // 簡単な計算性能テスト（Gemini提案）
        let iterationCount = 0;
        const testDuration = 10; // 10ms
        const testEndTime = start + testDuration;
        
        while (performance.now() < testEndTime) {
            iterationCount++;
            Math.sqrt(iterationCount) + Math.sin(iterationCount * 0.01);
        }
        
        const computeScore = iterationCount / testDuration;
        
        return {
            userAgent,
            isWebKit: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
            isFirefox: /Firefox/.test(userAgent),
            isChrome: /Chrome/.test(userAgent) && !/Edge/.test(userAgent),
            isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
            hardwareConcurrency: navigator.hardwareConcurrency || 4,
            deviceMemory: navigator.deviceMemory || 4,
            connectionType: navigator.connection?.effectiveType || 'unknown',
            computeScore,
            webWorkerSupported: typeof Worker !== 'undefined',
            serviceWorkerSupported: 'serviceWorker' in navigator,
            audioContextSupported: 'AudioContext' in window || 'webkitAudioContext' in window
        };
    }
    
    /**
     * Pyodide初期化トラッキング開始
     */
    startInitializationTracking() {
        this.initializationMetrics.startTime = performance.now();
        this.initializationMetrics.stages.clear();
        this.isTracking = true;
        
        performance.mark('pyodide_init_start');
        console.log('[Pyodide Tracker] 初期化トラッキング開始');
        
        // ページロード時間も測定
        this.recordStage('page_load_start', performance.timing.navigationStart);
        this.recordStage('dom_ready', performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart);
    }
    
    /**
     * 初期化ステージの記録（Gemini提案の詳細測定）
     */
    recordStage(stageName, duration = null) {
        if (!this.isTracking) return;
        
        const timestamp = performance.now();
        const stageDuration = duration !== null ? duration : 
            (timestamp - (this.initializationMetrics.startTime || timestamp));
        
        this.initializationMetrics.stages.set(stageName, {
            timestamp,
            duration: stageDuration,
            relativeToStart: timestamp - (this.initializationMetrics.startTime || timestamp)
        });
        
        performance.mark(`pyodide_stage_${stageName}`);
        
        console.log(`[Pyodide Tracker] Stage "${stageName}": ${stageDuration.toFixed(2)}ms`);
    }
    
    /**
     * Pyodide初期化完了
     */
    completeInitialization() {
        if (!this.isTracking) return;
        
        this.initializationMetrics.endTime = performance.now();
        this.initializationMetrics.totalDuration = 
            this.initializationMetrics.endTime - this.initializationMetrics.startTime;
        this.initializationMetrics.isComplete = true;
        
        performance.mark('pyodide_init_end');
        performance.measure('Pyodide Total Initialization', 'pyodide_init_start', 'pyodide_init_end');
        
        // TTI (Time To Interactive) の計算
        const tti = this.calculateTTI();
        this.recordStage('time_to_interactive', tti);
        
        console.log(`[Pyodide Tracker] 初期化完了: ${this.initializationMetrics.totalDuration.toFixed(2)}ms`);
        console.log(`[Pyodide Tracker] TTI: ${tti.toFixed(2)}ms`);
        
        // 詳細レポートの生成
        this.generateInitializationReport();
    }
    
    /**
     * TTI (Time To Interactive) の計算
     */
    calculateTTI() {
        // Pyodide + pygame-ce + 最初のフレーム描画まで
        const pyodideStage = this.initializationMetrics.stages.get('pyodide_ready');
        const pygameStage = this.initializationMetrics.stages.get('pygame_ready');
        const firstFrameStage = this.initializationMetrics.stages.get('first_frame');
        
        if (firstFrameStage) {
            return firstFrameStage.relativeToStart;
        } else if (pygameStage) {
            return pygameStage.relativeToStart;
        } else if (pyodideStage) {
            return pyodideStage.relativeToStart;
        } else {
            return this.initializationMetrics.totalDuration;
        }
    }
    
    /**
     * ランタイムパフォーマンストラッキング開始
     */
    startRuntimeTracking() {
        console.log('[Pyodide Tracker] ランタイムトラッキング開始');
        
        // FPS監視
        this.startFPSTracking();
        
        // メモリ監視
        this.startMemoryTracking();
        
        // Python実行時間監視
        this.setupPythonExecutionTracking();
    }
    
    /**
     * FPS トラッキング（Gemini提案の詳細測定）
     */
    startFPSTracking() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fpsData = [];
        
        const trackFrame = (currentTime) => {
            frameCount++;
            const deltaTime = currentTime - lastTime;
            
            // フレーム時間を記録
            this.runtimeMetrics.frameTimings.push(deltaTime);
            if (this.runtimeMetrics.frameTimings.length > 1000) {
                this.runtimeMetrics.frameTimings.shift();
            }
            
            // 1秒ごとにFPS計算
            if (deltaTime >= 1000) {
                const fps = frameCount * 1000 / deltaTime;
                fpsData.push({
                    timestamp: currentTime,
                    fps: fps,
                    frameCount: frameCount
                });
                
                this.runtimeMetrics.fps.push(fps);
                if (this.runtimeMetrics.fps.length > 60) {
                    this.runtimeMetrics.fps.shift();
                }
                
                // Jank検出（フレーム時間のばらつき）
                const recentFrameTimes = this.runtimeMetrics.frameTimings.slice(-60);
                const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length;
                const jankFrames = recentFrameTimes.filter(t => t > avgFrameTime * 2).length;
                
                if (jankFrames > 5) {
                    console.warn(`[Pyodide Tracker] Jank detected: ${jankFrames} slow frames in last 60`);
                }
                
                console.log(`[Pyodide Tracker] FPS: ${fps.toFixed(1)} (${frameCount} frames in ${deltaTime.toFixed(0)}ms)`);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            if (this.isTracking) {
                requestAnimationFrame(trackFrame);
            }
        };
        
        requestAnimationFrame(trackFrame);
    }
    
    /**
     * メモリトラッキング
     */
    startMemoryTracking() {
        if (!performance.memory) {
            console.warn('[Pyodide Tracker] performance.memory not available');
            return;
        }
        
        const sampleMemory = () => {
            const memoryInfo = {
                timestamp: performance.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576, // MB
                totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576
            };
            
            this.runtimeMetrics.memorySnapshots.push(memoryInfo);
            if (this.runtimeMetrics.memorySnapshots.length > 300) { // 5分間分
                this.runtimeMetrics.memorySnapshots.shift();
            }
            
            // メモリリーク検出
            this.detectMemoryLeaks();
        };
        
        // 2秒ごとにサンプリング
        this.memoryTrackingInterval = setInterval(sampleMemory, 2000);
        sampleMemory(); // 即座に初回サンプル
    }
    
    /**
     * Python実行時間の監視
     */
    setupPythonExecutionTracking() {
        // pyodide.runPython の実行時間を監視するためのラッパー
        if (window.pyodide && window.pyodide.runPython) {
            const originalRunPython = window.pyodide.runPython;
            
            window.pyodide.runPython = (code) => {
                const start = performance.now();
                const result = originalRunPython.call(window.pyodide, code);
                const duration = performance.now() - start;
                
                this.runtimeMetrics.pythonExecutionTimes.push({
                    timestamp: start,
                    duration: duration,
                    codeLength: code.length
                });
                
                if (this.runtimeMetrics.pythonExecutionTimes.length > 100) {
                    this.runtimeMetrics.pythonExecutionTimes.shift();
                }
                
                if (duration > 16) { // 1フレーム分を超える場合
                    console.warn(`[Pyodide Tracker] Long Python execution: ${duration.toFixed(2)}ms`);
                }
                
                return result;
            };
        }
    }
    
    /**
     * メモリリーク検出
     */
    detectMemoryLeaks() {
        const snapshots = this.runtimeMetrics.memorySnapshots;
        if (snapshots.length < 10) return;
        
        // 最近10個のサンプルで上昇傾向をチェック
        const recent = snapshots.slice(-10);
        let increasingCount = 0;
        
        for (let i = 1; i < recent.length; i++) {
            if (recent[i].usedJSHeapSize > recent[i-1].usedJSHeapSize) {
                increasingCount++;
            }
        }
        
        // 80%以上が増加傾向の場合
        if (increasingCount >= 8) {
            const growth = recent[recent.length-1].usedJSHeapSize - recent[0].usedJSHeapSize;
            console.warn(`[Pyodide Tracker] Potential memory leak: +${growth.toFixed(2)}MB in last 20 seconds`);
        }
    }
    
    /**
     * ゲームループパフォーマンス記録
     */
    recordGameLoopPerformance(updateTime, renderTime) {
        this.runtimeMetrics.gameLoopPerformance.push({
            timestamp: performance.now(),
            updateTime,
            renderTime,
            totalTime: updateTime + renderTime
        });
        
        if (this.runtimeMetrics.gameLoopPerformance.length > 1000) {
            this.runtimeMetrics.gameLoopPerformance.shift();
        }
    }
    
    /**
     * 初期化レポート生成
     */
    generateInitializationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            browserProfile: this.browserProfile,
            initialization: {
                totalDuration: this.initializationMetrics.totalDuration,
                stages: Object.fromEntries(this.initializationMetrics.stages),
                tti: this.calculateTTI()
            },
            performance: this.getPerformanceEntry()
        };
        
        // ローカルストレージに保存
        try {
            localStorage.setItem('pyodide_performance_report', JSON.stringify(report, null, 2));
            console.log('[Pyodide Tracker] レポートをlocalStorageに保存しました');
        } catch (e) {
            console.warn('[Pyodide Tracker] レポート保存失敗:', e);
        }
        
        return report;
    }
    
    /**
     * Performance API エントリーの取得
     */
    getPerformanceEntry() {
        const measures = performance.getEntriesByType('measure');
        const marks = performance.getEntriesByType('mark');
        
        return {
            measures: measures.map(m => ({
                name: m.name,
                duration: m.duration,
                startTime: m.startTime
            })),
            marks: marks.map(m => ({
                name: m.name,
                startTime: m.startTime
            }))
        };
    }
    
    /**
     * 現在のメトリクス取得
     */
    getCurrentMetrics() {
        const fps = this.runtimeMetrics.fps;
        const memory = this.runtimeMetrics.memorySnapshots;
        const python = this.runtimeMetrics.pythonExecutionTimes;
        const gameLoop = this.runtimeMetrics.gameLoopPerformance;
        
        return {
            fps: {
                current: fps[fps.length - 1] || 0,
                average: fps.length > 0 ? fps.reduce((a, b) => a + b) / fps.length : 0,
                min: Math.min(...fps),
                max: Math.max(...fps)
            },
            memory: {
                current: memory.length > 0 ? memory[memory.length - 1].usedJSHeapSize : 0,
                peak: Math.max(...memory.map(m => m.usedJSHeapSize)),
                trend: this.calculateMemoryTrend()
            },
            python: {
                averageExecution: python.length > 0 ? 
                    python.reduce((a, b) => a + b.duration, 0) / python.length : 0,
                slowestExecution: Math.max(...python.map(p => p.duration)),
                totalExecutions: python.length
            },
            gameLoop: {
                averageUpdate: gameLoop.length > 0 ? 
                    gameLoop.reduce((a, b) => a + b.updateTime, 0) / gameLoop.length : 0,
                averageRender: gameLoop.length > 0 ? 
                    gameLoop.reduce((a, b) => a + b.renderTime, 0) / gameLoop.length : 0
            },
            initialization: {
                isComplete: this.initializationMetrics.isComplete,
                totalDuration: this.initializationMetrics.totalDuration,
                tti: this.calculateTTI()
            }
        };
    }
    
    /**
     * メモリ使用量のトレンド計算
     */
    calculateMemoryTrend() {
        const snapshots = this.runtimeMetrics.memorySnapshots;
        if (snapshots.length < 2) return 'stable';
        
        const first = snapshots[0].usedJSHeapSize;
        const last = snapshots[snapshots.length - 1].usedJSHeapSize;
        const change = last - first;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }
    
    /**
     * トラッキング停止
     */
    stop() {
        this.isTracking = false;
        if (this.memoryTrackingInterval) {
            clearInterval(this.memoryTrackingInterval);
        }
        console.log('[Pyodide Tracker] トラッキング停止');
    }
    
    /**
     * レポート出力（デバッグ用）
     */
    printReport() {
        const metrics = this.getCurrentMetrics();
        console.log('\n=== Pyodide Performance Report ===');
        console.log('Browser:', this.browserProfile.userAgent);
        console.log('Compute Score:', this.browserProfile.computeScore);
        console.log('TTI:', metrics.initialization.tti.toFixed(2) + 'ms');
        console.log('Current FPS:', metrics.fps.current.toFixed(1));
        console.log('Average FPS:', metrics.fps.average.toFixed(1));
        console.log('Memory Usage:', metrics.memory.current.toFixed(2) + 'MB');
        console.log('Memory Trend:', metrics.memory.trend);
        console.log('Python Avg Execution:', metrics.python.averageExecution.toFixed(2) + 'ms');
        console.log('=====================================\n');
    }
}

// グローバルインスタンス
export const pyodideTracker = new PyodidePerformanceTracker();

// ブラウザ環境でのグローバル公開
if (typeof window !== 'undefined') {
    window.pyodideTracker = pyodideTracker;
}