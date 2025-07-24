/**
 * Real-time Performance Dashboard Controller
 * 高度なパフォーマンス監視とビジュアライゼーション
 */

import { metricsCollector } from './performance-metrics-collector.js';
import { SharedMemoryMetricsCollector } from './shared-memory-metrics-collector.js';

export class DashboardController {
    constructor() {
        // 設定
        this.config = {
            updateInterval: 100,       // UI更新間隔（ms）
            chartMaxPoints: 100,       // チャートの最大データポイント数
            useSharedMemory: true,     // SharedArrayBuffer使用フラグ
            automaticFallback: true,   // 自動フォールバック
            alertThresholds: {
                fps: { min: 30, target: 60 },
                frameTime: { max: 33.33, warning: 16.67 },
                memory: { max: 500, warning: 300 },
                gcFrequency: { max: 1 }, // GC/秒
                workerLatency: { max: 50, warning: 20 },
                sharedMemory: {
                    bufferUtilization: { max: 85, warning: 70 },
                    atomicFailures: { max: 10, warning: 5 },
                    writeLatency: { max: 1.0, warning: 0.5 }
                }
            },
            colors: {
                fps: '#10b981',
                frameTime: '#3b82f6',
                memory: '#8b5cf6',
                gameLogic: '#3b82f6',
                rendering: '#10b981',
                input: '#f59e0b',
                other: '#8b5cf6',
                gc: '#ef4444',
                latency: '#f59e0b',
                sharedMemory: '#06b6d4'
            }
        };

        // 状態管理
        this.state = {
            isCollecting: false,
            isPaused: false,
            selectedTimeRange: 60, // 秒
            charts: {},
            updateTimer: null,
            historicalData: [],
            alerts: [],
            collectionStartTime: null,
            activeCollector: null, // 現在アクティブなコレクター
            collectorType: null,   // 'shared-memory' | 'message-passing'
            sharedMemorySupported: false
        };

        // チャートデータ
        this.chartData = {
            fps: [],
            frameTime: [],
            memory: [],
            gc: [],
            latency: [],
            breakdown: {
                gameLogic: [],
                rendering: [],
                input: [],
                other: []
            }
        };

        // DOM要素のキャッシュ
        this.elements = {};
    }

    /**
     * ダッシュボードの初期化
     */
    async init() {
        this.cacheElements();
        this.initCharts();
        this.bindEvents();
        this.initializeMetricsListener();
        
        // メトリクスコレクターの初期化
        await this.initializeMetricsCollector();
        
        console.log('Dashboard initialized');
    }

    /**
     * DOM要素をキャッシュ
     */
    cacheElements() {
        // ボタン
        this.elements.startBtn = document.getElementById('startBtn');
        this.elements.stopBtn = document.getElementById('stopBtn');
        this.elements.pauseBtn = document.getElementById('pauseBtn');
        this.elements.exportBtn = document.getElementById('exportBtn');
        this.elements.settingsBtn = document.getElementById('settingsBtn');
        
        // ステータスインジケーター
        this.elements.statusIndicator = document.getElementById('statusIndicator');
        
        // メトリクス値表示
        this.elements.currentFPS = document.getElementById('currentFPS');
        this.elements.avgFPS = document.getElementById('avgFPS');
        this.elements.fpsChange = document.getElementById('fpsChange');
        
        this.elements.currentFrameTime = document.getElementById('currentFrameTime');
        this.elements.frameTimeP95 = document.getElementById('frameTimeP95');
        
        this.elements.currentMemory = document.getElementById('currentMemory');
        this.elements.peakMemory = document.getElementById('peakMemory');
        this.elements.memoryProgress = document.getElementById('memoryProgress');
        
        this.elements.gcCount = document.getElementById('gcCount');
        this.elements.lastGC = document.getElementById('lastGC');
        
        this.elements.currentLatency = document.getElementById('currentLatency');
        this.elements.avgLatency = document.getElementById('avgLatency');
        
        // チャートキャンバス
        this.elements.fpsChart = document.getElementById('fpsChart');
        this.elements.frameTimeChart = document.getElementById('frameTimeChart');
        this.elements.memoryChart = document.getElementById('memoryChart');
        this.elements.gcChart = document.getElementById('gcChart');
        this.elements.latencyChart = document.getElementById('latencyChart');
        
        // その他
        this.elements.breakdownBars = document.getElementById('breakdownBars');
        this.elements.alertBanner = document.getElementById('alertBanner');
        this.elements.alertMessage = document.getElementById('alertMessage');
        this.elements.tooltip = document.getElementById('tooltip');
        
        // タイムレンジボタン
        this.elements.timeRangeButtons = document.querySelectorAll('.time-range-button');
    }

    /**
     * チャートの初期化
     */
    initCharts() {
        // レイアウトが完了するまで待機
        requestAnimationFrame(() => {
            // FPSチャート
            this.state.charts.fps = this.createLineChart(
                this.elements.fpsChart,
                this.config.colors.fps,
                { min: 0, max: 120 }
            );
            
            // フレームタイムチャート
            this.state.charts.frameTime = this.createLineChart(
                this.elements.frameTimeChart,
                this.config.colors.frameTime,
                { min: 0, max: 50 }
            );
            
            // メモリチャート
            this.state.charts.memory = this.createLineChart(
                this.elements.memoryChart,
                this.config.colors.memory,
                { min: 0, max: 512 }
            );
            
            // GCチャート
            this.state.charts.gc = this.createBarChart(
                this.elements.gcChart,
                this.config.colors.gc
            );
            
            // レイテンシーチャート
            this.state.charts.latency = this.createLineChart(
                this.elements.latencyChart,
                this.config.colors.latency,
                { min: 0, max: 100 }
            );

            // ブレークダウンバーの初期化
            this.initBreakdownBars();
            
            // 初期グリッドを描画
            this.updateAllCharts();
        });
    }

    /**
     * ラインチャートの作成
     */
    createLineChart(canvas, color, range) {
        const ctx = canvas.getContext('2d');
        const chart = {
            ctx,
            color,
            range,
            width: canvas.width,
            height: canvas.height,
            data: []
        };

        // Retinaディスプレイ対応
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // キャンバスの実際のサイズを設定
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.scale(dpr, dpr);
        chart.width = rect.width;
        chart.height = rect.height;

        return chart;
    }

    /**
     * バーチャートの作成
     */
    createBarChart(canvas, color) {
        const ctx = canvas.getContext('2d');
        const chart = {
            ctx,
            color,
            width: canvas.width,
            height: canvas.height,
            data: []
        };

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // キャンバスの実際のサイズを設定
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.scale(dpr, dpr);
        chart.width = rect.width;
        chart.height = rect.height;

        return chart;
    }

    /**
     * イベントバインディング
     */
    bindEvents() {
        // コントロールボタン
        this.elements.startBtn.addEventListener('click', () => this.startCollection());
        this.elements.stopBtn.addEventListener('click', () => this.stopCollection());
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // タイムレンジ選択
        this.elements.timeRangeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = parseInt(e.target.dataset.range);
                this.setTimeRange(range);
            });
        });
        
        // ウィンドウリサイズ
        window.addEventListener('resize', () => this.handleResize());
        
        // ページ離脱時のクリーンアップ
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    /**
     * メトリクスコレクターの初期化
     */
    async initializeMetricsCollector() {
        // SharedArrayBufferサポートの確認
        this.state.sharedMemorySupported = typeof SharedArrayBuffer !== 'undefined' && 
                                          typeof Atomics !== 'undefined';
        
        if (this.config.useSharedMemory && this.state.sharedMemorySupported) {
            try {
                // SharedMemoryMetricsCollectorを使用
                this.state.activeCollector = new SharedMemoryMetricsCollector();
                await this.state.activeCollector.initialize();
                this.state.collectorType = 'shared-memory';
                
                console.log('✅ SharedMemoryMetricsCollector initialized successfully');
                this.showCollectorStatus('SharedArrayBuffer + Atomics enabled', 'success');
                
                // SharedMemoryカードを表示
                const sharedMemoryCard = document.getElementById('sharedMemoryCard');
                if (sharedMemoryCard) {
                    sharedMemoryCard.style.display = 'block';
                    console.log('SharedMemory metrics card is now visible');
                }
                
            } catch (error) {
                console.warn('SharedMemoryMetricsCollector initialization failed:', error);
                
                if (this.config.automaticFallback) {
                    this.initializeFallbackCollector();
                } else {
                    throw error;
                }
            }
        } else {
            this.initializeFallbackCollector();
        }
    }
    
    /**
     * フォールバックコレクターの初期化
     */
    initializeFallbackCollector() {
        try {
            this.state.activeCollector = metricsCollector;
            this.state.collectorType = 'message-passing';
            
            const reason = this.state.sharedMemorySupported ? 
                          'Configuration disabled' : 
                          'SharedArrayBuffer not supported';
                          
            console.log(`⚠️ Using fallback PerformanceMetricsCollector (${reason})`);
            this.showCollectorStatus(`Message-passing mode (${reason})`, 'warning');
            
        } catch (error) {
            console.error('Failed to initialize fallback collector:', error);
            this.showCollectorStatus('Collector initialization failed', 'error');
            throw error;
        }
    }
    
    /**
     * コレクター状態の表示
     */
    showCollectorStatus(message, type) {
        // 一時的なステータス表示
        const statusElement = document.createElement('div');
        statusElement.className = `alert-banner ${type}`;
        statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
        `;
        statusElement.textContent = message;
        
        document.body.appendChild(statusElement);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (statusElement.parentElement) {
                statusElement.remove();
            }
        }, 3000);
    }

    /**
     * メトリクスリスナーの初期化
     */
    initializeMetricsListener() {
        // カスタムイベントリスナーを設定（将来の拡張用）
        window.addEventListener('metrics-update', (event) => {
            this.handleMetricsUpdate(event.detail);
        });
    }

    /**
     * 収集開始
     */
    async startCollection() {
        if (!this.state.activeCollector) {
            this.showAlert('メトリクスコレクターが初期化されていません', 'error');
            return;
        }
        
        try {
            await this.state.activeCollector.start();
            this.state.isCollecting = true;
            this.state.collectionStartTime = Date.now();
            
            // UI更新
            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.elements.pauseBtn.disabled = false;
            this.elements.statusIndicator.classList.add('active');
            
            // 初期チャート描画（空のグリッドを表示）
            this.updateAllCharts();
            
            // 定期更新開始
            this.startUpdateLoop();
            
            const collectorType = this.state.collectorType === 'shared-memory' ? 'SharedMemory' : 'MessagePassing';
            this.showAlert(`メトリクス収集を開始しました (${collectorType})`, 'success');
        } catch (error) {
            console.error('Failed to start collection:', error);
            this.showAlert('収集開始に失敗しました: ' + error.message, 'error');
        }
    }

    /**
     * 収集停止
     */
    async stopCollection() {
        if (!this.state.activeCollector) {
            this.showAlert('メトリクスコレクターが初期化されていません', 'error');
            return;
        }
        
        try {
            await this.state.activeCollector.stop();
            this.state.isCollecting = false;
            
            // UI更新
            this.elements.startBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
            this.elements.pauseBtn.disabled = true;
            this.elements.statusIndicator.classList.remove('active');
            
            // 定期更新停止
            this.stopUpdateLoop();
            
            this.showAlert('メトリクス収集を停止しました', 'success');
        } catch (error) {
            console.error('Failed to stop collection:', error);
            this.showAlert('収集停止に失敗しました: ' + error.message, 'error');
        }
    }

    /**
     * 一時停止の切り替え
     */
    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        
        if (this.state.isPaused) {
            this.elements.pauseBtn.textContent = '▶️ 再開';
            this.stopUpdateLoop();
        } else {
            this.elements.pauseBtn.textContent = '⏸️ 一時停止';
            this.startUpdateLoop();
        }
    }

    /**
     * 更新ループの開始
     */
    startUpdateLoop() {
        if (this.state.updateTimer) {
            clearInterval(this.state.updateTimer);
        }
        
        this.state.updateTimer = setInterval(() => {
            this.updateDashboard();
        }, this.config.updateInterval);
        
        // 即座に更新
        this.updateDashboard();
    }

    /**
     * 更新ループの停止
     */
    stopUpdateLoop() {
        if (this.state.updateTimer) {
            clearInterval(this.state.updateTimer);
            this.state.updateTimer = null;
        }
    }

    /**
     * ダッシュボードの更新
     */
    updateDashboard() {
        if (!this.state.activeCollector) {
            console.warn('No active collector available for dashboard update');
            return;
        }
        
        const summary = this.state.activeCollector.getSummary();
        const sessionInfo = this.state.activeCollector.getSessionInfo();
        
        // FPS更新
        this.updateFPSMetrics(summary);
        
        // フレームタイム更新
        this.updateFrameTimeMetrics(summary);
        
        // メモリ更新
        this.updateMemoryMetrics(summary);
        
        // GC更新
        this.updateGCMetrics();
        
        // Worker遅延更新
        this.updateLatencyMetrics(summary);
        
        // ブレークダウン更新（データがある場合のみ）
        if (summary.breakdown && Object.keys(summary.breakdown).length > 0) {
            this.updateBreakdown(summary);
        }
        
        // SharedMemory統計更新（利用可能な場合）
        if (this.state.collectorType === 'shared-memory' && summary.sharedMemory) {
            this.updateSharedMemoryMetrics(summary.sharedMemory);
        }
        
        // チャート更新
        this.updateAllCharts();
        
        // アラートチェック
        this.checkAlerts(summary);
    }

    /**
     * FPSメトリクスの更新
     */
    updateFPSMetrics(summary) {
        const currentFPS = summary.fps?.current || 0;
        const avgFPS = summary.fps?.avg || 0;
        
        // 値の更新
        this.elements.currentFPS.innerHTML = `${currentFPS.toFixed(1)}<span class="metric-unit">fps</span>`;
        this.elements.avgFPS.textContent = avgFPS.toFixed(1);
        
        // 変化インジケーター
        if (currentFPS < this.config.alertThresholds.fps.min) {
            this.elements.fpsChange.classList.add('negative');
            this.elements.fpsChange.classList.remove('positive');
        } else if (currentFPS >= this.config.alertThresholds.fps.target) {
            this.elements.fpsChange.classList.add('positive');
            this.elements.fpsChange.classList.remove('negative');
        }
        
        // チャートデータ追加
        this.addChartData('fps', currentFPS);
    }

    /**
     * フレームタイムメトリクスの更新
     */
    updateFrameTimeMetrics(summary) {
        const avgFrameTime = summary.frameTimes?.avg || 0;
        const p95FrameTime = summary.frameTimes?.p95 || 0;
        
        this.elements.currentFrameTime.innerHTML = `${avgFrameTime.toFixed(2)}<span class="metric-unit">ms</span>`;
        this.elements.frameTimeP95.textContent = p95FrameTime.toFixed(2);
        
        this.addChartData('frameTime', avgFrameTime);
    }

    /**
     * メモリメトリクスの更新
     */
    updateMemoryMetrics(summary) {
        const currentMemory = summary.memoryUsage?.current || 0;
        const maxMemory = summary.memoryUsage?.max || 0;
        
        this.elements.currentMemory.innerHTML = `${currentMemory.toFixed(1)}<span class="metric-unit">MB</span>`;
        this.elements.peakMemory.textContent = maxMemory.toFixed(1);
        
        // プログレスバー更新
        const memoryPercent = Math.min((currentMemory / this.config.alertThresholds.memory.max) * 100, 100);
        this.elements.memoryProgress.style.width = `${memoryPercent}%`;
        
        // 色の変更
        if (currentMemory > this.config.alertThresholds.memory.warning) {
            this.elements.memoryProgress.style.backgroundColor = 'var(--accent-yellow)';
        } else {
            this.elements.memoryProgress.style.backgroundColor = 'var(--accent-blue)';
        }
        
        this.addChartData('memory', currentMemory);
    }

    /**
     * GCメトリクスの更新
     */
    updateGCMetrics() {
        if (!this.state.activeCollector || !this.state.activeCollector.metrics) {
            return;
        }
        
        const gcEvents = this.state.activeCollector.metrics.gcEvents || [];
        const gcCount = gcEvents.length;
        
        this.elements.gcCount.innerHTML = `${gcCount}<span class="metric-unit">回</span>`;
        
        if (gcEvents.length > 0) {
            const lastGC = gcEvents[gcEvents.length - 1];
            const timeSinceGC = ((performance.now() - lastGC.timestamp) / 1000).toFixed(1);
            this.elements.lastGC.textContent = `${timeSinceGC}秒前`;
        }
        
        // GCイベントをチャートに追加
        this.updateGCChart(gcEvents);
    }

    /**
     * Worker遅延メトリクスの更新
     */
    updateLatencyMetrics(summary) {
        const avgLatency = summary.webWorkerLatency?.avg || 0;
        
        let currentLatency = 0;
        if (this.state.activeCollector && this.state.activeCollector.metrics && this.state.activeCollector.metrics.webWorkerLatency) {
            currentLatency = this.state.activeCollector.metrics.webWorkerLatency?.slice(-1)[0] || 0;
        }
        
        this.elements.currentLatency.innerHTML = `${currentLatency.toFixed(2)}<span class="metric-unit">ms</span>`;
        this.elements.avgLatency.textContent = avgLatency.toFixed(2);
        
        this.addChartData('latency', currentLatency);
    }

    /**
     * ブレークダウンの更新
     */
    updateBreakdown(summary) {
        const breakdown = summary.breakdown || {};
        const values = [
            { type: 'gameLogic', value: breakdown.gameLogic || 0, color: this.config.colors.gameLogic },
            { type: 'rendering', value: breakdown.rendering || 0, color: this.config.colors.rendering },
            { type: 'input', value: breakdown.input || 0, color: this.config.colors.input },
            { type: 'other', value: breakdown.other || 0, color: this.config.colors.other }
        ];
        
        // バーの更新
        const bars = this.elements.breakdownBars.children;
        values.forEach((item, index) => {
            if (bars[index]) {
                bars[index].style.height = `${item.value}%`;
                bars[index].style.backgroundColor = item.color;
                bars[index].setAttribute('data-value', `${item.value.toFixed(1)}%`);
            }
        });
    }

    /**
     * SharedMemoryメトリクスの更新
     */
    updateSharedMemoryMetrics(sharedMemoryStats) {
        // HTMLのIDに合わせて修正された要素参照
        const sharedMemoryElements = {
            writeOperations: document.getElementById('sharedMemoryWrites'),
            avgWriteTime: document.getElementById('sharedMemoryAvgWriteTime'),
            bufferUtilization: document.getElementById('sharedMemoryBufferUtilization'),
            bufferProgress: document.getElementById('sharedMemoryBufferProgress'),
            atomicFailures: document.getElementById('sharedMemoryAtomicFailures'),
            bufferOverflows: document.getElementById('sharedMemoryBufferOverflows'),
            throughputGain: document.getElementById('sharedMemoryThroughputGain'),
            latencyReduction: document.getElementById('sharedMemoryLatencyReduction')
        };
        
        // 要素が存在する場合のみ更新
        if (sharedMemoryElements.writeOperations) {
            sharedMemoryElements.writeOperations.innerHTML = `${(sharedMemoryStats.writeOperations || 0).toLocaleString()}<span class="metric-unit">ops</span>`;
        }
        
        if (sharedMemoryElements.avgWriteTime) {
            const avgTime = sharedMemoryStats.avgWriteTime || 0;
            sharedMemoryElements.avgWriteTime.innerHTML = `${avgTime.toFixed(3)}<span class="metric-unit">ms</span>`;
        }
        
        if (sharedMemoryElements.bufferUtilization) {
            const utilization = sharedMemoryStats.bufferUtilization || 0;
            sharedMemoryElements.bufferUtilization.textContent = `${utilization.toFixed(1)}%`;
        }
        
        if (sharedMemoryElements.bufferProgress) {
            const utilization = sharedMemoryStats.bufferUtilization || 0;
            sharedMemoryElements.bufferProgress.style.width = `${utilization}%`;
            
            // バッファ使用率に応じて色を変更
            if (utilization >= 85) {
                sharedMemoryElements.bufferProgress.style.backgroundColor = 'var(--accent-red)';
            } else if (utilization >= 70) {
                sharedMemoryElements.bufferProgress.style.backgroundColor = 'var(--accent-yellow)';
            } else {
                sharedMemoryElements.bufferProgress.style.backgroundColor = 'var(--accent-green)';
            }
        }
        
        if (sharedMemoryElements.atomicFailures) {
            sharedMemoryElements.atomicFailures.innerHTML = `${(sharedMemoryStats.atomicFailures || 0).toLocaleString()}<span class="metric-unit">fails</span>`;
        }
        
        if (sharedMemoryElements.bufferOverflows) {
            sharedMemoryElements.bufferOverflows.innerHTML = `${(sharedMemoryStats.bufferOverflows || 0).toLocaleString()}<span class="metric-unit">ovf</span>`;
        }
        
        // パフォーマンス比較メトリクスの更新
        if (sharedMemoryElements.throughputGain) {
            const throughputGain = sharedMemoryStats.performanceComparison?.throughputImprovement || 0;
            const gainText = throughputGain >= 0 ? `+${throughputGain.toFixed(1)}%` : `${throughputGain.toFixed(1)}%`;
            sharedMemoryElements.throughputGain.textContent = gainText;
            sharedMemoryElements.throughputGain.style.color = throughputGain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        
        if (sharedMemoryElements.latencyReduction) {
            const latencyReduction = sharedMemoryStats.performanceComparison?.latencyReduction || 0;
            const reductionText = latencyReduction >= 0 ? `-${latencyReduction.toFixed(1)}%` : `+${Math.abs(latencyReduction).toFixed(1)}%`;
            sharedMemoryElements.latencyReduction.textContent = reductionText;
            sharedMemoryElements.latencyReduction.style.color = latencyReduction >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        
        // SharedMemoryメトリクスのアラートチェック
        this.checkSharedMemoryAlerts(sharedMemoryStats);
    }

    /**
     * SharedMemoryメトリクスのアラートチェック
     */
    checkSharedMemoryAlerts(stats) {
        const thresholds = this.config.alertThresholds.sharedMemory;
        
        // バッファ使用率の警告
        if (stats.bufferUtilization > thresholds.bufferUtilization.max) {
            this.showAlert(`SharedMemoryバッファ使用率が高いです: ${stats.bufferUtilization.toFixed(1)}%`, 'error');
        } else if (stats.bufferUtilization > thresholds.bufferUtilization.warning) {
            this.showAlert(`SharedMemoryバッファ使用率: ${stats.bufferUtilization.toFixed(1)}%`, 'warning');
        }
        
        // Atomic操作失敗の警告
        if (stats.atomicFailures > thresholds.atomicFailures.max) {
            this.showAlert(`Atomic操作失敗が多発しています: ${stats.atomicFailures}回`, 'error');
        } else if (stats.atomicFailures > thresholds.atomicFailures.warning) {
            this.showAlert(`Atomic操作失敗: ${stats.atomicFailures}回`, 'warning');
        }
        
        // 書き込み遅延の警告
        if (stats.avgWriteTime > thresholds.writeLatency.max) {
            this.showAlert(`SharedMemory書き込み遅延が高いです: ${stats.avgWriteTime.toFixed(3)}ms`, 'error');
        } else if (stats.avgWriteTime > thresholds.writeLatency.warning) {
            this.showAlert(`SharedMemory書き込み遅延: ${stats.avgWriteTime.toFixed(3)}ms`, 'warning');
        }
    }

    /**
     * ブレークダウンバーの初期化
     */
    initBreakdownBars() {
        const types = ['gameLogic', 'rendering', 'input', 'other'];
        const colors = [this.config.colors.gameLogic, this.config.colors.rendering, this.config.colors.input, this.config.colors.other];
        this.elements.breakdownBars.innerHTML = '';
        
        types.forEach((type, index) => {
            const bar = document.createElement('div');
            bar.className = 'distribution-bar';
            bar.setAttribute('data-type', type);
            // 初期の高さと色を設定（可視性のため）
            bar.style.height = '25%';
            bar.style.backgroundColor = colors[index];
            bar.setAttribute('data-value', '25%');
            this.elements.breakdownBars.appendChild(bar);
        });
    }

    /**
     * チャートデータの追加
     */
    addChartData(type, value) {
        if (!this.chartData[type]) {
            this.chartData[type] = [];
        }
        
        this.chartData[type].push({
            timestamp: Date.now(),
            value: value
        });
        
        // 最大ポイント数を超えたら古いデータを削除
        if (this.chartData[type].length > this.config.chartMaxPoints) {
            this.chartData[type].shift();
        }
    }

    /**
     * 全チャートの更新
     */
    updateAllCharts() {
        this.drawLineChart(this.state.charts.fps, this.chartData.fps);
        this.drawLineChart(this.state.charts.frameTime, this.chartData.frameTime);
        this.drawLineChart(this.state.charts.memory, this.chartData.memory);
        this.drawLineChart(this.state.charts.latency, this.chartData.latency);
    }

    /**
     * ラインチャートの描画
     */
    drawLineChart(chart, data) {
        const ctx = chart.ctx;
        const width = chart.width;
        const height = chart.height;
        
        // クリア
        ctx.clearRect(0, 0, width, height);
        
        // グリッドの描画（データがなくても描画）
        this.drawGrid(ctx, width, height);
        
        if (data.length < 2) {
            // データが少ない場合でも初期ラインを描画
            ctx.strokeStyle = chart.color + '40';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            return;
        }
        
        // ラインの描画
        ctx.strokeStyle = chart.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const xStep = width / (this.config.chartMaxPoints - 1);
        const yScale = height / (chart.range.max - chart.range.min);
        
        data.forEach((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - chart.range.min) * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // グラデーション塗りつぶし
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, chart.color + '40');
        gradient.addColorStop(1, chart.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        data.forEach((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - chart.range.min) * yScale);
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * GCチャートの更新
     */
    updateGCChart(gcEvents) {
        const chart = this.state.charts.gc;
        const ctx = chart.ctx;
        const width = chart.width;
        const height = chart.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (gcEvents.length === 0) return;
        
        // 最近のGCイベントのみ表示
        const recentGCs = gcEvents.slice(-20);
        const barWidth = width / 20;
        
        recentGCs.forEach((event, index) => {
            const memoryDiff = event.before - event.after;
            const barHeight = (memoryDiff / event.before) * height;
            const x = index * barWidth;
            const y = height - barHeight;
            
            ctx.fillStyle = chart.color;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        });
    }

    /**
     * グリッドの描画
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // 水平線
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    /**
     * アラートのチェック
     */
    checkAlerts(summary) {
        // 収集開始から3秒間は警告を抑制（初期値が安定するまで）
        if (this.state.collectionStartTime && 
            (Date.now() - this.state.collectionStartTime) < 3000) {
            return;
        }
        
        const alerts = [];
        
        // FPSアラート
        if (summary.fps?.current < this.config.alertThresholds.fps.min) {
            alerts.push({
                type: 'fps',
                severity: 'warning',
                message: `FPSが低下しています: ${summary.fps.current.toFixed(1)} fps`
            });
        }
        
        // フレームタイムアラート
        if (summary.frameTimes?.avg > this.config.alertThresholds.frameTime.max) {
            alerts.push({
                type: 'frameTime',
                severity: 'error',
                message: `フレーム処理時間が長すぎます: ${summary.frameTimes.avg.toFixed(2)} ms`
            });
        }
        
        // メモリアラート
        if (summary.memoryUsage?.current > this.config.alertThresholds.memory.warning) {
            alerts.push({
                type: 'memory',
                severity: 'warning',
                message: `メモリ使用量が多いです: ${summary.memoryUsage.current.toFixed(1)} MB`
            });
        }
        
        // SharedMemoryアラート（利用可能な場合）
        if (this.state.collectorType === 'shared-memory' && summary.sharedMemory) {
            const sharedMemoryAlerts = this.checkSharedMemoryAlerts(summary.sharedMemory);
            alerts.push(...sharedMemoryAlerts);
        }
        
        // 最新のアラートを表示
        if (alerts.length > 0 && alerts[0].message !== this.state.lastAlertMessage) {
            this.showAlert(alerts[0].message, alerts[0].severity);
            this.state.lastAlertMessage = alerts[0].message;
        }
    }

    /**
     * アラート表示
     */
    showAlert(message, type = 'info') {
        this.elements.alertBanner.className = `alert-banner ${type}`;
        this.elements.alertMessage.textContent = message;
        this.elements.alertBanner.style.display = 'flex';
        
        // 自動非表示
        setTimeout(() => {
            this.elements.alertBanner.style.display = 'none';
        }, 5000);
    }

    /**
     * タイムレンジの設定
     */
    setTimeRange(seconds) {
        this.state.selectedTimeRange = seconds;
        
        // ボタンのアクティブ状態を更新
        this.elements.timeRangeButtons.forEach(btn => {
            if (parseInt(btn.dataset.range) === seconds) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // データの再読み込み
        this.loadHistoricalData();
    }

    /**
     * 履歴データの読み込み
     */
    async loadHistoricalData() {
        if (!this.state.activeCollector || !this.state.activeCollector.sessionId) {
            console.warn('No active collector or session ID available for historical data');
            return;
        }
        
        try {
            const endTime = Date.now();
            const startTime = endTime - (this.state.selectedTimeRange * 1000);
            
            const data = await this.state.activeCollector.queryStoredMetrics({
                startTime,
                endTime,
                limit: 1000
            });
            
            // データの処理と表示
            this.processHistoricalData(data);
        } catch (error) {
            console.error('Failed to load historical data:', error);
        }
    }

    /**
     * 履歴データの処理
     */
    processHistoricalData(data) {
        // データをタイプ別に分類
        const grouped = {};
        
        data.forEach(metric => {
            if (!grouped[metric.type]) {
                grouped[metric.type] = [];
            }
            grouped[metric.type].push({
                timestamp: metric.timestamp,
                value: metric.value
            });
        });
        
        // チャートデータを更新
        Object.keys(grouped).forEach(type => {
            if (this.chartData[type]) {
                this.chartData[type] = grouped[type].slice(-this.config.chartMaxPoints);
            }
        });
        
        // チャートを再描画
        this.updateAllCharts();
    }

    /**
     * データのエクスポート
     */
    async exportData() {
        if (!this.state.activeCollector) {
            this.showAlert('メトリクスコレクターが初期化されていません', 'error');
            return;
        }
        
        try {
            const sessionInfo = this.state.activeCollector.getSessionInfo();
            const summary = this.state.activeCollector.getSummary();
            
            // 現在のセッションデータを取得
            const data = {
                exportDate: new Date().toISOString(),
                collectorType: this.state.collectorType,
                sessionInfo,
                summary,
                chartData: this.chartData,
                alerts: this.state.alerts
            };
            
            // 履歴データも含める場合
            if (this.state.activeCollector.sessionId) {
                const historicalData = await this.state.activeCollector.queryStoredMetrics({
                    sessionId: this.state.activeCollector.sessionId
                });
                data.historicalData = historicalData;
            }
            
            // JSONファイルとしてダウンロード
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-metrics_${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showAlert('データをエクスポートしました', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showAlert('エクスポートに失敗しました: ' + error.message, 'error');
        }
    }

    /**
     * 設定画面の表示
     */
    showSettings() {
        // TODO: 設定モーダルの実装
        console.log('Settings not implemented yet');
        this.showAlert('設定機能は開発中です', 'info');
    }

    /**
     * ウィンドウリサイズの処理
     */
    handleResize() {
        // チャートのリサイズ
        Object.values(this.state.charts).forEach(chart => {
            if (chart.ctx && chart.ctx.canvas) {
                const canvas = chart.ctx.canvas;
                const dpr = window.devicePixelRatio || 1;
                
                canvas.width = canvas.offsetWidth * dpr;
                canvas.height = canvas.offsetHeight * dpr;
                chart.ctx.scale(dpr, dpr);
                
                chart.width = canvas.offsetWidth;
                chart.height = canvas.offsetHeight;
            }
        });
        
        // 再描画
        if (this.state.isCollecting) {
            this.updateAllCharts();
        }
    }

    /**
     * SharedMemoryメトリクスの更新
     */
    updateSharedMemoryMetrics(sharedMemoryStats) {
        // SharedMemory統計のDOM要素を更新
        const elements = {
            writeOperations: document.getElementById('sharedMemoryWrites'),
            avgWriteTime: document.getElementById('sharedMemoryAvgWriteTime'),
            bufferUtilization: document.getElementById('sharedMemoryBufferUtilization'),
            bufferProgress: document.getElementById('sharedMemoryBufferProgress'),
            atomicFailures: document.getElementById('sharedMemoryAtomicFailures'),
            bufferOverflows: document.getElementById('sharedMemoryBufferOverflows')
        };
        
        // 要素が存在する場合のみ更新
        if (elements.writeOperations) {
            elements.writeOperations.innerHTML = `${sharedMemoryStats.writeOperations.toLocaleString()}<span class="metric-unit">ops</span>`;
        }
        
        if (elements.avgWriteTime) {
            elements.avgWriteTime.innerHTML = `${sharedMemoryStats.avgWriteTime.toFixed(3)}<span class="metric-unit">ms</span>`;
        }
        
        if (elements.bufferUtilization) {
            elements.bufferUtilization.innerHTML = `${sharedMemoryStats.bufferUtilization.toFixed(1)}<span class="metric-unit">%</span>`;
        }
        
        if (elements.bufferProgress) {
            elements.bufferProgress.style.width = `${sharedMemoryStats.bufferUtilization}%`;
            
            // バッファ使用率に応じて色を変更
            if (sharedMemoryStats.bufferUtilization >= 85) {
                elements.bufferProgress.className = 'progress-bar error';
            } else if (sharedMemoryStats.bufferUtilization >= 70) {
                elements.bufferProgress.className = 'progress-bar warning';
            } else {
                elements.bufferProgress.className = 'progress-bar';
            }
        }
        
        if (elements.atomicFailures) {
            elements.atomicFailures.textContent = sharedMemoryStats.atomicFailures.toLocaleString();
        }
        
        if (elements.bufferOverflows) {
            elements.bufferOverflows.textContent = sharedMemoryStats.bufferOverflows.toLocaleString();
        }
    }
    
    /**
     * SharedMemoryアラートのチェック
     */
    checkSharedMemoryAlerts(stats) {
        const alerts = [];
        const thresholds = this.config.alertThresholds.sharedMemory;
        
        // バッファ使用率チェック
        if (stats.bufferUtilization >= thresholds.bufferUtilization.max) {
            alerts.push({
                type: 'sharedMemoryBuffer',
                severity: 'error',
                message: `SharedMemoryバッファ使用率が高すぎます: ${stats.bufferUtilization.toFixed(1)}%`
            });
        } else if (stats.bufferUtilization >= thresholds.bufferUtilization.warning) {
            alerts.push({
                type: 'sharedMemoryBuffer',
                severity: 'warning',
                message: `SharedMemoryバッファ使用率が高いです: ${stats.bufferUtilization.toFixed(1)}%`
            });
        }
        
        // アトミック操作失敗チェック
        if (stats.atomicFailures >= thresholds.atomicFailures.max) {
            alerts.push({
                type: 'sharedMemoryAtomic',
                severity: 'error',
                message: `アトミック操作失敗が多発しています: ${stats.atomicFailures}回`
            });
        } else if (stats.atomicFailures >= thresholds.atomicFailures.warning) {
            alerts.push({
                type: 'sharedMemoryAtomic',
                severity: 'warning',
                message: `アトミック操作失敗が発生しています: ${stats.atomicFailures}回`
            });
        }
        
        // 書き込み遅延チェック
        if (stats.avgWriteTime >= thresholds.writeLatency.max) {
            alerts.push({
                type: 'sharedMemoryLatency',
                severity: 'error',
                message: `SharedMemory書き込み遅延が長すぎます: ${stats.avgWriteTime.toFixed(3)}ms`
            });
        } else if (stats.avgWriteTime >= thresholds.writeLatency.warning) {
            alerts.push({
                type: 'sharedMemoryLatency',
                severity: 'warning',
                message: `SharedMemory書き込み遅延が高いです: ${stats.avgWriteTime.toFixed(3)}ms`
            });
        }
        
        return alerts;
    }

    /**
     * クリーンアップ
     */
    async cleanup() {
        this.stopUpdateLoop();
        
        if (this.state.isCollecting) {
            await this.stopCollection();
        }
        
        // アクティブコレクターのクリーンアップ
        if (this.state.activeCollector && this.state.activeCollector.cleanup) {
            try {
                await this.state.activeCollector.cleanup();
            } catch (error) {
                console.warn('Error during collector cleanup:', error);
            }
        }
        
        // イベントリスナーの削除
        window.removeEventListener('metrics-update', this.handleMetricsUpdate);
        window.removeEventListener('resize', this.handleResize);
    }
}