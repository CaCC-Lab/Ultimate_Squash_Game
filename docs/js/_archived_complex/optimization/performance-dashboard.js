/**
 * Performance Dashboard - Gemini提案の統合メトリクス可視化システム
 * 
 * TTI、FPS、メモリ使用量等をリアルタイムで表示
 * PyodidePerformanceTrackerと既存のPerformanceMonitorを統合
 */

export class PerformanceDashboard {
    constructor() {
        this.isVisible = false;
        this.updateInterval = null;
        this.dashboardElement = null;
        this.bundleMetrics = null;
        this.charts = {
            fps: null,
            memory: null,
            tti: null,
            pythonExecution: null
        };
        
        this.performanceTracker = window.pyodideTracker || null;
        this.performanceMonitor = window.performanceMonitor || null;
        
        console.log('[Performance Dashboard] Initialized');
        console.log('[Performance Dashboard] Tracker available:', !!this.performanceTracker);
        console.log('[Performance Dashboard] Monitor available:', !!this.performanceMonitor);
    }
    
    /**
     * ダッシュボードの表示/非表示切り替え
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * ダッシュボードを表示
     */
    show() {
        if (this.isVisible) return;
        
        this.createDashboardElement();
        this.startUpdating();
        this.isVisible = true;
        
        console.log('[Performance Dashboard] Shown');
    }
    
    /**
     * ダッシュボードを非表示
     */
    hide() {
        if (!this.isVisible) return;
        
        if (this.dashboardElement) {
            this.dashboardElement.remove();
            this.dashboardElement = null;
        }
        
        this.stopUpdating();
        this.isVisible = false;
        
        console.log('[Performance Dashboard] Hidden');
    }
    
    /**
     * ダッシュボードHTML要素の作成
     */
    createDashboardElement() {
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.id = 'performance-dashboard';
        this.dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h3>🚀 Pyodide Performance Dashboard</h3>
                <button class="close-btn" onclick="window.performanceDashboard?.hide()">×</button>
            </div>
            
            <div class="metrics-grid">
                <!-- TTI & 初期化メトリクス -->
                <div class="metric-card initialization">
                    <h4>⏱️ 初期化メトリクス</h4>
                    <div class="metric-value">
                        <span class="label">TTI (Time To Interactive):</span>
                        <span id="tti-value" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">総初期化時間:</span>
                        <span id="init-duration" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">初期化状態:</span>
                        <span id="init-status" class="value status">-</span>
                    </div>
                    <div class="stage-breakdown">
                        <h5>ステージ詳細:</h5>
                        <div id="stage-list" class="stage-list"></div>
                    </div>
                </div>
                
                <!-- FPS メトリクス -->
                <div class="metric-card fps">
                    <h4>📊 FPS & レンダリング</h4>
                    <div class="metric-value">
                        <span class="label">現在FPS:</span>
                        <span id="current-fps" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">平均FPS:</span>
                        <span id="average-fps" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">最小/最大FPS:</span>
                        <span id="min-max-fps" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">Jank検出:</span>
                        <span id="jank-status" class="value status">-</span>
                    </div>
                    <canvas id="fps-chart" width="300" height="100"></canvas>
                </div>
                
                <!-- メモリメトリクス -->
                <div class="metric-card memory">
                    <h4>💾 メモリ使用量</h4>
                    <div class="metric-value">
                        <span class="label">現在メモリ:</span>
                        <span id="current-memory" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">ピークメモリ:</span>
                        <span id="peak-memory" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">メモリトレンド:</span>
                        <span id="memory-trend" class="value status">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">リーク検出:</span>
                        <span id="leak-status" class="value status">-</span>
                    </div>
                    <canvas id="memory-chart" width="300" height="100"></canvas>
                </div>
                
                <!-- Python実行メトリクス -->
                <div class="metric-card python">
                    <h4>🐍 Python実行</h4>
                    <div class="metric-value">
                        <span class="label">平均実行時間:</span>
                        <span id="avg-python-time" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">最遅実行時間:</span>
                        <span id="max-python-time" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">実行回数:</span>
                        <span id="python-executions" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">ブロッキング回数:</span>
                        <span id="blocking-executions" class="value">-</span>
                    </div>
                </div>
                
                <!-- ブラウザプロファイル -->
                <div class="metric-card browser">
                    <h4>🌐 ブラウザプロファイル</h4>
                    <div class="metric-value">
                        <span class="label">ブラウザ:</span>
                        <span id="browser-name" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">計算スコア:</span>
                        <span id="compute-score" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">ハードウェア:</span>
                        <span id="hardware-info" class="value">-</span>
                    </div>
                    <div class="metric-value">
                        <span class="label">接続タイプ:</span>
                        <span id="connection-type" class="value">-</span>
                    </div>
                </div>
                
                <!-- Python Bundle 情報 (Gemini最適化) -->
                <div class="metric-card bundle">
                    <div id="bundle-info">
                        <h4>🚀 Python Bundle (待機中...)</h4>
                        <p>バンドルローダー初期化中...</p>
                    </div>
                </div>
                
                <!-- 推奨事項 -->
                <div class="metric-card recommendations">
                    <h4>💡 最適化推奨事項</h4>
                    <div id="recommendations-list" class="recommendations-list">
                        <p>メトリクス分析中...</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-footer">
                <button onclick="window.performanceDashboard?.exportReport()">📄 レポート出力</button>
                <button onclick="window.performanceDashboard?.resetMetrics()">🔄 メトリクスリセット</button>
                <button onclick="window.performanceDashboard?.printReport()">🖨️ コンソール出力</button>
            </div>
        `;
        
        // スタイルを追加
        this.addDashboardStyles();
        
        // ダッシュボードをDOMに追加
        document.body.appendChild(this.dashboardElement);
        
        // 初期データを表示
        this.updateDashboard();
    }
    
    /**
     * ダッシュボードスタイルの追加
     */
    addDashboardStyles() {
        if (document.getElementById('performance-dashboard-styles')) {
            return; // 既に追加済み
        }
        
        const styles = document.createElement('style');
        styles.id = 'performance-dashboard-styles';
        styles.textContent = `
            #performance-dashboard {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 800px;
                max-height: 90vh;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 20px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid #444;
                padding-bottom: 10px;
            }
            
            .dashboard-header h3 {
                margin: 0;
                color: #00ff00;
                text-shadow: 0 0 5px #00ff00;
            }
            
            .close-btn {
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
            }
            
            .close-btn:hover {
                background: #ff6666;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .metric-card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #555;
                border-radius: 8px;
                padding: 15px;
                min-height: 150px;
            }
            
            .metric-card h4 {
                margin: 0 0 15px 0;
                color: #ffaa00;
                text-shadow: 0 0 3px #ffaa00;
            }
            
            .metric-value {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                align-items: center;
            }
            
            .metric-value .label {
                color: #ccc;
                flex: 1;
            }
            
            .metric-value .value {
                color: #00ff88;
                font-weight: bold;
                text-align: right;
                min-width: 80px;
            }
            
            .metric-value .value.status {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
            }
            
            .value.status.good { background: #00aa00; color: white; }
            .value.status.warning { background: #aa8800; color: white; }
            .value.status.error { background: #aa0000; color: white; }
            .value.status.info { background: #0088aa; color: white; }
            
            .stage-breakdown {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #444;
            }
            
            .stage-breakdown h5 {
                margin: 0 0 5px 0;
                color: #ffaa00;
                font-size: 11px;
            }
            
            .stage-list {
                max-height: 80px;
                overflow-y: auto;
                font-size: 10px;
            }
            
            .stage-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
                padding: 2px 4px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 3px;
            }
            
            .recommendations-list {
                font-size: 11px;
                line-height: 1.4;
                max-height: 120px;
                overflow-y: auto;
            }
            
            .recommendations-list ul {
                margin: 0;
                padding-left: 15px;
            }
            
            .recommendations-list li {
                margin-bottom: 5px;
                color: #ffaa88;
            }
            
            /* Python Bundle 情報スタイル */
            .metric-card.bundle {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 1px solid #3498db;
            }
            
            .bundle-recommendations {
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px solid #444;
                font-size: 10px;
            }
            
            .bundle-recommendations ul {
                margin: 5px 0 0 0;
                padding-left: 12px;
            }
            
            .bundle-recommendations li {
                margin-bottom: 3px;
                color: #88aaff;
            }
            
            /* バンドル最適化レベルのカラーリング */
            .metric-value.excellent { color: #00ff88; }
            .metric-value.good { color: #88ff00; }
            .metric-value.warning { color: #ffaa00; }
            .metric-value.error { color: #ff4444; }
            
            .dashboard-footer {
                display: flex;
                gap: 10px;
                justify-content: center;
                padding-top: 15px;
                border-top: 1px solid #444;
            }
            
            .dashboard-footer button {
                background: #0066aa;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 11px;
                font-family: inherit;
            }
            
            .dashboard-footer button:hover {
                background: #0088cc;
            }
            
            canvas {
                width: 100%;
                height: 60px;
                margin-top: 10px;
                border: 1px solid #444;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.3);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * 定期更新の開始
     */
    startUpdating() {
        if (this.updateInterval) return;
        
        this.updateInterval = setInterval(() => {
            this.updateDashboard();
        }, 1000); // 1秒ごとに更新
    }
    
    /**
     * 定期更新の停止
     */
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * ダッシュボードデータの更新
     */
    updateDashboard() {
        if (!this.dashboardElement) return;
        
        // PyodidePerformanceTrackerからメトリクス取得
        let trackerMetrics = null;
        if (this.performanceTracker) {
            trackerMetrics = this.performanceTracker.getCurrentMetrics();
        }
        
        // PerformanceMonitorからメトリクス取得
        let monitorMetrics = null;
        if (this.performanceMonitor) {
            monitorMetrics = this.performanceMonitor.getMetrics();
        }
        
        // TTI & 初期化メトリクス
        this.updateInitializationMetrics(trackerMetrics);
        
        // FPSメトリクス
        this.updateFPSMetrics(trackerMetrics, monitorMetrics);
        
        // メモリメトリクス
        this.updateMemoryMetrics(trackerMetrics, monitorMetrics);
        
        // Python実行メトリクス
        this.updatePythonMetrics(trackerMetrics);
        
        // ブラウザプロファイル
        this.updateBrowserProfile();
        
        // 推奨事項
        this.updateRecommendations(trackerMetrics, monitorMetrics);
    }
    
    /**
     * 初期化メトリクスの更新
     */
    updateInitializationMetrics(metrics) {
        if (!metrics) return;
        
        const ttiElement = document.getElementById('tti-value');
        const durationElement = document.getElementById('init-duration');
        const statusElement = document.getElementById('init-status');
        const stageListElement = document.getElementById('stage-list');
        
        if (ttiElement && metrics.initialization) {
            ttiElement.textContent = `${metrics.initialization.tti.toFixed(2)}ms`;
        }
        
        if (durationElement && metrics.initialization) {
            durationElement.textContent = `${metrics.initialization.totalDuration.toFixed(2)}ms`;
        }
        
        if (statusElement && metrics.initialization) {
            const isComplete = metrics.initialization.isComplete;
            statusElement.textContent = isComplete ? 'Complete' : 'In Progress';
            statusElement.className = `value status ${isComplete ? 'good' : 'warning'}`;
        }
        
        // ステージ詳細の更新
        if (stageListElement && this.performanceTracker) {
            const stages = this.performanceTracker.initializationMetrics.stages;
            stageListElement.innerHTML = '';
            
            for (const [stageName, stageData] of stages) {
                const stageItem = document.createElement('div');
                stageItem.className = 'stage-item';
                stageItem.innerHTML = `
                    <span>${stageName}:</span>
                    <span>${stageData.duration.toFixed(2)}ms</span>
                `;
                stageListElement.appendChild(stageItem);
            }
        }
    }
    
    /**
     * FPSメトリクスの更新
     */
    updateFPSMetrics(trackerMetrics, monitorMetrics) {
        const currentFpsElement = document.getElementById('current-fps');
        const averageFpsElement = document.getElementById('average-fps');
        const minMaxFpsElement = document.getElementById('min-max-fps');
        const jankStatusElement = document.getElementById('jank-status');
        
        let fpsData = null;
        
        // データソースの優先順位: tracker > monitor
        if (trackerMetrics && trackerMetrics.fps) {
            fpsData = trackerMetrics.fps;
        } else if (monitorMetrics && monitorMetrics.fps) {
            fpsData = monitorMetrics.fps;
        }
        
        if (fpsData && currentFpsElement) {
            currentFpsElement.textContent = `${fpsData.current.toFixed(1)}`;
            
            // FPSに基づく色分け
            if (fpsData.current >= 55) {
                currentFpsElement.style.color = '#00ff88';
            } else if (fpsData.current >= 30) {
                currentFpsElement.style.color = '#ffaa00';
            } else {
                currentFpsElement.style.color = '#ff4444';
            }
        }
        
        if (fpsData && averageFpsElement) {
            averageFpsElement.textContent = `${fpsData.average.toFixed(1)}`;
        }
        
        if (fpsData && minMaxFpsElement) {
            minMaxFpsElement.textContent = `${fpsData.min.toFixed(1)} / ${fpsData.max.toFixed(1)}`;
        }
        
        // Jank検出（フレーム時間のばらつき）
        if (jankStatusElement) {
            const jankDetected = fpsData && (fpsData.current < 30 || fpsData.max - fpsData.min > 30);
            jankStatusElement.textContent = jankDetected ? 'Detected' : 'None';
            jankStatusElement.className = `value status ${jankDetected ? 'warning' : 'good'}`;
        }
        
        // FPSチャートの更新
        this.updateFPSChart(fpsData);
    }
    
    /**
     * メモリメトリクスの更新
     */
    updateMemoryMetrics(trackerMetrics, monitorMetrics) {
        const currentMemoryElement = document.getElementById('current-memory');
        const peakMemoryElement = document.getElementById('peak-memory');
        const memoryTrendElement = document.getElementById('memory-trend');
        const leakStatusElement = document.getElementById('leak-status');
        
        let memoryData = null;
        
        if (trackerMetrics && trackerMetrics.memory) {
            memoryData = trackerMetrics.memory;
        } else if (monitorMetrics && monitorMetrics.memory) {
            memoryData = monitorMetrics.memory;
        }
        
        if (memoryData && currentMemoryElement) {
            currentMemoryElement.textContent = `${memoryData.current.toFixed(2)}MB`;
        }
        
        if (memoryData && peakMemoryElement) {
            peakMemoryElement.textContent = `${memoryData.peak.toFixed(2)}MB`;
        }
        
        if (memoryData && memoryTrendElement) {
            const trend = memoryData.trend || 'stable';
            memoryTrendElement.textContent = trend;
            memoryTrendElement.className = `value status ${
                trend === 'increasing' ? 'warning' : 
                trend === 'decreasing' ? 'good' : 'info'
            }`;
        }
        
        if (leakStatusElement) {
            const leakDetected = memoryData && memoryData.trend === 'increasing';
            leakStatusElement.textContent = leakDetected ? 'Potential' : 'None';
            leakStatusElement.className = `value status ${leakDetected ? 'error' : 'good'}`;
        }
        
        // メモリチャートの更新
        this.updateMemoryChart(memoryData);
    }
    
    /**
     * Python実行メトリクスの更新
     */
    updatePythonMetrics(metrics) {
        if (!metrics || !metrics.python) return;
        
        const avgTimeElement = document.getElementById('avg-python-time');
        const maxTimeElement = document.getElementById('max-python-time');
        const executionsElement = document.getElementById('python-executions');
        const blockingElement = document.getElementById('blocking-executions');
        
        if (avgTimeElement) {
            avgTimeElement.textContent = `${metrics.python.averageExecution.toFixed(2)}ms`;
        }
        
        if (maxTimeElement) {
            maxTimeElement.textContent = `${metrics.python.slowestExecution.toFixed(2)}ms`;
        }
        
        if (executionsElement) {
            executionsElement.textContent = `${metrics.python.totalExecutions}`;
        }
        
        if (blockingElement) {
            // 16ms以上の実行をブロッキングとして扱う
            const blockingCount = this.performanceTracker?.runtimeMetrics.pythonExecutionTimes
                .filter(exec => exec.duration > 16).length || 0;
            blockingElement.textContent = `${blockingCount}`;
            blockingElement.style.color = blockingCount > 0 ? '#ffaa00' : '#00ff88';
        }
    }
    
    /**
     * ブラウザプロファイルの更新
     */
    updateBrowserProfile() {
        if (!this.performanceTracker) return;
        
        const profile = this.performanceTracker.browserProfile;
        
        const browserNameElement = document.getElementById('browser-name');
        const computeScoreElement = document.getElementById('compute-score');
        const hardwareInfoElement = document.getElementById('hardware-info');
        const connectionTypeElement = document.getElementById('connection-type');
        
        if (browserNameElement) {
            const browserName = profile.isChrome ? 'Chrome' : 
                               profile.isFirefox ? 'Firefox' : 
                               profile.isWebKit ? 'Safari' : 'Unknown';
            browserNameElement.textContent = browserName;
        }
        
        if (computeScoreElement) {
            computeScoreElement.textContent = `${profile.computeScore.toFixed(1)}`;
        }
        
        if (hardwareInfoElement) {
            hardwareInfoElement.textContent = `${profile.hardwareConcurrency} cores, ${profile.deviceMemory}GB`;
        }
        
        if (connectionTypeElement) {
            connectionTypeElement.textContent = profile.connectionType;
        }
    }
    
    /**
     * 推奨事項の更新
     */
    updateRecommendations(trackerMetrics, monitorMetrics) {
        const recommendationsElement = document.getElementById('recommendations-list');
        if (!recommendationsElement) return;
        
        const recommendations = [];
        
        // TTI分析
        if (trackerMetrics && trackerMetrics.initialization.tti > 5000) {
            recommendations.push('TTIが5秒を超えています。初期化の最適化を検討してください。');
        }
        
        // FPS分析
        const fpsData = trackerMetrics?.fps || monitorMetrics?.fps;
        if (fpsData && fpsData.average < 30) {
            recommendations.push('平均FPSが30を下回っています。レンダリングの最適化が必要です。');
        }
        
        // メモリ分析
        const memoryData = trackerMetrics?.memory || monitorMetrics?.memory;
        if (memoryData && memoryData.trend === 'increasing') {
            recommendations.push('メモリ使用量が増加傾向です。メモリリークの可能性があります。');
        }
        
        // Python実行時間分析
        if (trackerMetrics && trackerMetrics.python.averageExecution > 16) {
            recommendations.push('Python実行時間が長い傾向です。処理の分割を検討してください。');
        }
        
        // ブラウザ固有の推奨事項
        if (this.performanceTracker) {
            const profile = this.performanceTracker.browserProfile;
            
            if (profile.isWebKit && profile.computeScore < 50) {
                recommendations.push('Safariで低スコアです。WebKit固有の最適化を適用してください。');
            }
            
            if (profile.hardwareConcurrency <= 2) {
                recommendations.push('低性能環境です。並列処理を制限することを推奨します。');
            }
        }
        
        if (recommendations.length === 0) {
            recommendations.push('現在のパフォーマンスは良好です。');
        }
        
        const html = '<ul>' + recommendations.map(rec => `<li>${rec}</li>`).join('') + '</ul>';
        recommendationsElement.innerHTML = html;
    }
    
    /**
     * FPSチャートの更新
     */
    updateFPSChart(fpsData) {
        const canvas = document.getElementById('fps-chart');
        if (!canvas || !fpsData) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // チャートクリア
        ctx.clearRect(0, 0, width, height);
        
        // FPSデータの取得（最新60データポイント）
        const fpsHistory = this.performanceTracker?.runtimeMetrics.fps.slice(-60) || [];
        if (fpsHistory.length < 2) return;
        
        // チャート描画
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = width / (fpsHistory.length - 1);
        const maxFps = 60;
        
        fpsHistory.forEach((fps, index) => {
            const x = index * stepX;
            const y = height - (fps / maxFps) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 60FPS基準線
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.stroke();
        
        // 30FPS警告線
        ctx.strokeStyle = '#aa4400';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }
    
    /**
     * メモリチャートの更新
     */
    updateMemoryChart(memoryData) {
        const canvas = document.getElementById('memory-chart');
        if (!canvas || !memoryData) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // チャートクリア
        ctx.clearRect(0, 0, width, height);
        
        // メモリデータの取得
        const memoryHistory = this.performanceTracker?.runtimeMetrics.memorySnapshots.slice(-60) || [];
        if (memoryHistory.length < 2) return;
        
        // チャート描画
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = width / (memoryHistory.length - 1);
        const maxMemory = Math.max(...memoryHistory.map(m => m.usedJSHeapSize)) * 1.1;
        
        memoryHistory.forEach((snapshot, index) => {
            const x = index * stepX;
            const y = height - (snapshot.usedJSHeapSize / maxMemory) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    /**
     * レポートのエクスポート
     */
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            trackerMetrics: this.performanceTracker?.getCurrentMetrics() || null,
            monitorMetrics: this.performanceMonitor?.getMetrics() || null,
            browserProfile: this.performanceTracker?.browserProfile || null,
            initializationReport: this.performanceTracker?.generateInitializationReport() || null
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log('[Performance Dashboard] Report exported');
    }
    
    /**
     * メトリクスのリセット
     */
    resetMetrics() {
        if (this.performanceTracker) {
            // FPS、メモリ、Python実行時間のデータをクリア
            this.performanceTracker.runtimeMetrics = {
                fps: [],
                frameTimings: [],
                memorySnapshots: [],
                pythonExecutionTimes: [],
                gameLoopPerformance: []
            };
        }
        
        if (this.performanceMonitor) {
            this.performanceMonitor.reset();
        }
        
        console.log('[Performance Dashboard] Metrics reset');
    }
    
    /**
     * Pythonバンドルメトリクスの更新（Gemini提案バンドリング統合）
     */
    updateBundleMetrics(bundleStats) {
        if (!bundleStats) return;
        
        this.bundleMetrics = bundleStats;
        
        // ダッシュボードが表示されている場合のみ更新
        if (!this.isVisible) return;
        
        const bundleInfoElement = document.getElementById('bundle-info');
        if (!bundleInfoElement) return;
        
        const metrics = bundleStats.loadMetrics;
        const performance = bundleStats.performance;
        
        bundleInfoElement.innerHTML = `
            <h4>🚀 Python Bundle (Gemini最適化)</h4>
            <div class="metric-row">
                <span>最適化レベル:</span>
                <span class="metric-value ${this.getOptimizationClass(metrics.optimizationLevel)}">${metrics.optimizationLevel}</span>
            </div>
            <div class="metric-row">
                <span>バンドルサイズ:</span>
                <span class="metric-value">${this.formatBytes(metrics.bundleSize)}</span>
            </div>
            <div class="metric-row">
                <span>ロード時間:</span>
                <span class="metric-value">${metrics.loadTime.toFixed(2)}ms</span>
            </div>
            <div class="metric-row">
                <span>パース時間:</span>
                <span class="metric-value">${metrics.parseTime.toFixed(2)}ms</span>
            </div>
            <div class="metric-row">
                <span>キャッシュ:</span>
                <span class="metric-value ${metrics.cacheHit ? 'good' : 'warning'}">${metrics.cacheHit ? 'HIT' : 'MISS'}</span>
            </div>
            <div class="metric-row">
                <span>効率性:</span>
                <span class="metric-value ${this.getEfficiencyClass(performance.efficiency)}">${performance.efficiency}%</span>
            </div>
            ${bundleStats.recommendations.length > 0 ? 
                `<div class="bundle-recommendations">
                    <strong>推奨:</strong>
                    <ul>${bundleStats.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
                </div>` : ''
            }
        `;
        
        console.log('[Performance Dashboard] Bundle metrics updated:', bundleStats);
    }
    
    /**
     * 最適化レベルのCSSクラス取得
     */
    getOptimizationClass(level) {
        switch (level) {
            case 'precompiled': return 'excellent';
            case 'bundled': return 'good';
            case 'fallback': return 'warning';
            default: return 'error';
        }
    }
    
    /**
     * 効率性のCSSクラス取得
     */
    getEfficiencyClass(efficiency) {
        if (efficiency >= 80) return 'excellent';
        if (efficiency >= 60) return 'good';
        if (efficiency >= 40) return 'warning';
        return 'error';
    }
    
    /**
     * バイトサイズのフォーマット
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * コンソールレポート出力
     */
    printReport() {
        if (this.performanceTracker) {
            this.performanceTracker.printReport();
        }
        
        if (this.performanceMonitor) {
            const metrics = this.performanceMonitor.getMetrics();
            console.log('\\n=== PerformanceMonitor Report ===');
            console.log('FPS:', metrics.fps);
            console.log('Memory:', metrics.memory);
            console.log('=================================\\n');
        }
    }
}

// グローバルインスタンス
export const performanceDashboard = new PerformanceDashboard();

// ブラウザ環境でのグローバル公開
if (typeof window !== 'undefined') {
    window.performanceDashboard = performanceDashboard;
    
    // キーボードショートカット（Ctrl+Shift+P）でダッシュボードをトグル
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'P') {
            event.preventDefault();
            performanceDashboard.toggle();
        }
    });
    
    console.log('[Performance Dashboard] Use Ctrl+Shift+P to toggle dashboard');
}