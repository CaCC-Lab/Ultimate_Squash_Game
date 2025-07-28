/**
 * WebWorker並列処理フェーズ4 - Analytics Worker
 * Ultimate Squash Game専用分析・メトリクス・統計Worker
 *
 * 機能:
 * - パフォーマンスメトリクス収集
 * - ゲーム統計分析
 * - プレイヤー行動分析
 * - リアルタイムダッシュボード
 */

import { MessageType, MessagePriority, PerformanceMetrics, MessageBuilder, MessageValidator } from '../communication/message-protocol.js';
import { WorkerAOTLoader } from '../communication/aot-loader.js';

/**
 * Analytics Worker
 * ゲーム分析・統計処理専用Worker
 */
class AnalyticsWorker {
  constructor() {
    this.workerId = 'analytics';
    this.aotLoader = new WorkerAOTLoader(this.workerId);
    this.initialized = false;

    // メトリクス収集設定
    this.metricsConfig = {
      collectInterval: 1000, // 1秒ごと
      retentionPeriod: 300000, // 5分間保持
      performanceThresholds: {
        fps: { min: 30, warning: 45, good: 60 },
        frameTime: { max: 33.33, warning: 22.22, good: 16.67 }, // ms
        memoryUsage: { max: 100, warning: 50, good: 30 }, // MB
        latency: { max: 100, warning: 50, good: 20 } // ms
      }
    };

    // メトリクスデータストレージ
    this.metricsData = {
      performance: [],
      gameState: [],
      playerBehavior: [],
      aiPerformance: [],
      systemHealth: []
    };

    // リアルタイム統計
    this.realTimeStats = {
      currentFPS: 0,
      averageFPS: 0,
      frameTimeHistory: [],
      memoryUsage: 0,
      totalGameTime: 0,
      sessionsPlayed: 0,
      scoresAchieved: [],
      playerInputPatterns: new Map()
    };

    // アラート管理
    this.alertSystem = {
      activeAlerts: new Map(),
      alertHistory: [],
      thresholdViolations: new Map(),
      lastAlertTime: new Map()
    };

    // 統計分析結果
    this.analysisResults = {
      playerSkillLevel: 0.5, // 0.0-1.0
      gameplayTrends: [],
      performanceBottlenecks: [],
      optimizationSuggestions: []
    };

    // Worker統計
    this.workerStats = {
      metricsProcessed: 0,
      alertsGenerated: 0,
      analysisRuns: 0,
      dataPointsCollected: 0,
      uptime: 0
    };

    this.setupMessageHandlers();
    this.startMetricsCollection();

    console.log('📊 AnalyticsWorker初期化完了');
  }

  /**
     * メッセージハンドラーの設定
     */
  setupMessageHandlers() {
    self.onmessage = (event) => {
      const message = event.data;

      if (!MessageValidator.validateMessage(message)) {
        console.error('❌ 無効なメッセージ:', message);
        return;
      }

      this.handleMessage(message);
    };
  }

  /**
     * メッセージの処理
     * @param {WorkerMessage} message 受信メッセージ
     */
  async handleMessage(message) {
    const startTime = performance.now();

    try {
      let response = null;

      switch (message.type) {
        case MessageType.INIT:
          response = await this.handleInit(message);
          break;

        case MessageType.METRICS_UPDATE:
          response = await this.handleMetricsUpdate(message);
          break;

        case MessageType.PERFORMANCE_REPORT:
          response = await this.handlePerformanceReport(message);
          break;

        case MessageType.UPDATE_GAME_STATE:
          response = await this.handleGameStateUpdate(message);
          break;

        case MessageType.PLAYER_INPUT:
          response = await this.handlePlayerInput(message);
          break;

        case MessageType.FRAME_STATS:
          response = await this.handleFrameStats(message);
          break;

        case MessageType.MEMORY_USAGE:
          response = await this.handleMemoryUsage(message);
          break;

        case MessageType.PING:
          response = this.handlePing(message);
          break;

        case MessageType.TERMINATE:
          await this.handleTerminate(message);
          break;

        default:
          console.warn(`未対応メッセージタイプ: ${message.type}`);
          response = this.createErrorResponse(message, `未対応メッセージタイプ: ${message.type}`);
      }

      // レスポンス送信
      if (response) {
        this.sendResponse(response);
      }

    } catch (error) {
      console.error('❌ Analytics メッセージ処理エラー:', error);
      const errorResponse = this.createErrorResponse(message, error.message);
      this.sendResponse(errorResponse);
    }

    // Worker統計更新
    const processingTime = performance.now() - startTime;
    this.updateWorkerStats(processingTime);
  }

  /**
     * Worker初期化処理
     * @param {WorkerMessage} message 初期化メッセージ
     */
  async handleInit(message) {
    if (this.initialized) {
      return this.createSuccessResponse(message, { status: 'already_initialized' });
    }

    console.log('🔧 AnalyticsWorker初期化中...');

    try {
      const { config, aotModules } = message.payload;

      // AOTモジュールの初期化
      if (aotModules && aotModules.size > 0) {
        await this.aotLoader.initialize(aotModules);
        console.log('📦 Analytics AOTモジュール読み込み完了');
      }

      // Analytics設定の適用
      if (config && config.analyticsSettings) {
        this.applyAnalyticsConfig(config.analyticsSettings);
      }

      this.initialized = true;
      this.workerStats.uptime = performance.now();

      console.log('✅ AnalyticsWorker初期化完了');

      // INIT_COMPLETEメッセージを送信
      return new MessageBuilder()
        .id(message.id)  // 元のメッセージIDを使用して応答関係を明確化
        .type(MessageType.INIT_COMPLETE)
        .priority(MessagePriority.CRITICAL)
        .payload({
          status: 'initialized',
          workerId: this.workerId,
          capabilities: ['metrics', 'performance', 'statistics'],
          metricsConfig: this.metricsConfig
        })
        .build();

    } catch (error) {
      console.error('❌ AnalyticsWorker初期化失敗:', error);
      throw error;
    }
  }

  /**
     * Analytics設定の適用
     * @param {Object} analyticsSettings Analytics設定
     */
  applyAnalyticsConfig(analyticsSettings) {
    this.metricsConfig = { ...this.metricsConfig, ...analyticsSettings };
    console.log('⚙️ Analytics設定更新:', this.metricsConfig);
  }

  /**
     * メトリクス収集開始
     */
  startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformanceTrends();
      this.checkAlertConditions();
      this.cleanupOldData();
    }, this.metricsConfig.collectInterval);

    console.log('📊 メトリクス収集開始');
  }

  /**
     * システムメトリクス収集
     */
  collectSystemMetrics() {
    const timestamp = performance.now();

    // メモリ使用量（概算）
    const memoryUsage = this.estimateMemoryUsage();

    // FPS計算
    this.calculateFPS(timestamp);

    // システムヘルス記録
    const healthMetrics = {
      timestamp,
      memoryUsage,
      fps: this.realTimeStats.currentFPS,
      frameTime: this.realTimeStats.frameTimeHistory[this.realTimeStats.frameTimeHistory.length - 1] || 0,
      activeWorkers: 3, // game-logic, ai, analytics
      alertCount: this.alertSystem.activeAlerts.size
    };

    this.metricsData.systemHealth.push(healthMetrics);
    this.workerStats.dataPointsCollected++;
  }

  /**
     * FPS計算
     * @param {number} timestamp 現在のタイムスタンプ
     */
  calculateFPS(timestamp) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
      return;
    }

    const frameTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // フレーム時間履歴に追加
    this.realTimeStats.frameTimeHistory.push(frameTime);
    if (this.realTimeStats.frameTimeHistory.length > 60) {
      this.realTimeStats.frameTimeHistory.shift();
    }

    // FPS計算
    if (frameTime > 0) {
      this.realTimeStats.currentFPS = 1000 / frameTime;

      // 平均FPS計算
      const avgFrameTime = this.realTimeStats.frameTimeHistory.reduce((sum, ft) => sum + ft, 0) / this.realTimeStats.frameTimeHistory.length;
      this.realTimeStats.averageFPS = 1000 / avgFrameTime;
    }
  }

  /**
     * メトリクス更新処理
     * @param {WorkerMessage} message メトリクス更新メッセージ
     */
  async handleMetricsUpdate(message) {
    const metricsData = message.payload;
    const timestamp = performance.now();

    // メトリクスデータの分類と保存
    if (metricsData.type === 'performance') {
      this.metricsData.performance.push({
        timestamp,
        ...metricsData.data
      });
    } else if (metricsData.type === 'gameplay') {
      this.metricsData.gameState.push({
        timestamp,
        ...metricsData.data
      });
    }

    // リアルタイム更新
    this.updateRealTimeStats(metricsData);

    this.workerStats.metricsProcessed++;

    return this.createSuccessResponse(message, {
      metricsReceived: true,
      timestamp,
      dataPoints: this.workerStats.dataPointsCollected
    });
  }

  /**
     * パフォーマンスレポート処理
     * @param {WorkerMessage} message パフォーマンスレポートメッセージ
     */
  async handlePerformanceReport(message) {
    const performanceData = message.payload;

    // パフォーマンスメトリクスの分析
    const analysis = this.analyzePerformanceData(performanceData);

    // 警告やアラートの生成
    this.checkPerformanceThresholds(performanceData);

    // 分析結果の保存
    this.analysisResults.performanceBottlenecks.push({
      timestamp: performance.now(),
      analysis,
      rawData: performanceData
    });

    return this.createSuccessResponse(message, {
      analysisComplete: true,
      performance: analysis,
      recommendations: this.generatePerformanceRecommendations(analysis)
    });
  }

  /**
     * パフォーマンスデータ分析
     * @param {PerformanceMetrics} performanceData パフォーマンスデータ
     * @returns {Object} 分析結果
     */
  analyzePerformanceData(performanceData) {
    const fps = performanceData.fps[0];
    const frameTime = performanceData.frameTime[0];
    const memoryUsage = performanceData.memoryUsage[0];
    const cpuUsage = performanceData.cpuUsage[0];
    const workerLatency = performanceData.workerLatency;

    return {
      fpsStatus: this.categorizeMetric(fps, this.metricsConfig.performanceThresholds.fps),
      frameTimeStatus: this.categorizeMetric(frameTime, this.metricsConfig.performanceThresholds.frameTime, true),
      memoryStatus: this.categorizeMetric(memoryUsage, this.metricsConfig.performanceThresholds.memoryUsage, true),
      overallHealth: this.calculateOverallHealth(fps, frameTime, memoryUsage, cpuUsage),
      bottlenecks: this.identifyBottlenecks(fps, frameTime, memoryUsage, cpuUsage, workerLatency)
    };
  }

  /**
     * メトリクスのカテゴライズ
     * @param {number} value 値
     * @param {Object} thresholds 閾値設定
     * @param {boolean} reverse 逆方向評価（小さい方が良い）
     * @returns {string} カテゴリ ('good', 'warning', 'critical')
     */
  categorizeMetric(value, thresholds, reverse = false) {
    if (reverse) {
      if (value <= thresholds.good) return 'good';
      if (value <= thresholds.warning) return 'warning';
      return 'critical';
    } else {
      if (value >= thresholds.good) return 'good';
      if (value >= thresholds.warning) return 'warning';
      return 'critical';
    }
  }

  /**
     * 全体ヘルス計算
     * @param {number} fps FPS
     * @param {number} frameTime フレーム時間
     * @param {number} memoryUsage メモリ使用量
     * @param {number} cpuUsage CPU使用率
     * @returns {number} ヘルススコア (0.0-1.0)
     */
  calculateOverallHealth(fps, frameTime, memoryUsage, cpuUsage) {
    const fpsScore = Math.min(fps / 60, 1.0);
    const frameTimeScore = Math.max(0, 1.0 - frameTime / 50);
    const memoryScore = Math.max(0, 1.0 - memoryUsage / 100);
    const cpuScore = Math.max(0, 1.0 - cpuUsage / 100);

    return (fpsScore + frameTimeScore + memoryScore + cpuScore) / 4;
  }

  /**
     * ボトルネック特定
     * @param {number} fps FPS
     * @param {number} frameTime フレーム時間
     * @param {number} memoryUsage メモリ使用量
     * @param {number} cpuUsage CPU使用率
     * @param {Float32Array} workerLatency Worker遅延
     * @returns {Array} ボトルネック一覧
     */
  identifyBottlenecks(fps, frameTime, memoryUsage, cpuUsage, workerLatency) {
    const bottlenecks = [];

    if (fps < 30) bottlenecks.push({ type: 'fps', severity: 'high', value: fps });
    if (frameTime > 33) bottlenecks.push({ type: 'frameTime', severity: 'medium', value: frameTime });
    if (memoryUsage > 80) bottlenecks.push({ type: 'memory', severity: 'medium', value: memoryUsage });
    if (cpuUsage > 80) bottlenecks.push({ type: 'cpu', severity: 'high', value: cpuUsage });

    // Worker遅延分析
    const avgLatency = workerLatency[3]; // 平均遅延
    if (avgLatency > 50) {
      bottlenecks.push({ type: 'workerLatency', severity: 'medium', value: avgLatency });
    }

    return bottlenecks;
  }

  /**
     * パフォーマンス推奨事項生成
     * @param {Object} analysis 分析結果
     * @returns {Array} 推奨事項
     */
  generatePerformanceRecommendations(analysis) {
    const recommendations = [];

    if (analysis.fpsStatus === 'critical') {
      recommendations.push({
        type: 'fps_optimization',
        priority: 'high',
        action: 'ゲームループの最適化、描画処理の軽量化を検討',
        impact: 'high'
      });
    }

    if (analysis.memoryStatus === 'critical') {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        action: 'メモリリークの確認、不要オブジェクトのガベージコレクション',
        impact: 'medium'
      });
    }

    if (analysis.bottlenecks.some(b => b.type === 'workerLatency')) {
      recommendations.push({
        type: 'worker_optimization',
        priority: 'medium',
        action: 'Worker間通信の最適化、メッセージサイズの削減',
        impact: 'medium'
      });
    }

    return recommendations;
  }

  /**
     * ゲーム状態更新処理
     * @param {WorkerMessage} message ゲーム状態更新メッセージ
     */
  async handleGameStateUpdate(message) {
    const gameState = message.payload;
    const timestamp = performance.now();

    // ゲーム状態の分析と記録
    const stateAnalysis = this.analyzeGameState(gameState);

    this.metricsData.gameState.push({
      timestamp,
      state: gameState,
      analysis: stateAnalysis
    });

    // プレイヤースキルレベルの更新
    this.updatePlayerSkillLevel(gameState);

    return this.createSuccessResponse(message, {
      stateAnalyzed: true,
      skillLevel: this.analysisResults.playerSkillLevel
    });
  }

  /**
     * ゲーム状態分析
     * @param {Object} gameState ゲーム状態
     * @returns {Object} 分析結果
     */
  analyzeGameState(gameState) {
    // スコア進行の分析
    const totalScore = (gameState.score?.[0] || 0) + (gameState.score?.[1] || 0);

    // ボール速度の分析
    const ballSpeed = Math.sqrt(
      (gameState.ballVelocity?.[0] || 0) ** 2 +
            (gameState.ballVelocity?.[1] || 0) ** 2
    );

    return {
      totalScore,
      ballSpeed,
      gameIntensity: Math.min(ballSpeed / 15, 1.0),
      competitiveness: Math.abs((gameState.score?.[0] || 0) - (gameState.score?.[1] || 0)) <= 2
    };
  }

  /**
     * プレイヤースキルレベル更新
     * @param {Object} gameState ゲーム状態
     */
  updatePlayerSkillLevel(gameState) {
    // 簡易スキルレベル計算
    const ralliesPlayed = this.metricsData.gameState.length;
    const successfulHits = this.metricsData.gameState.filter(data =>
      data.state.gameFlags?.getFlag?.(2) // BALL_HIT_RACKET
    ).length;

    if (ralliesPlayed > 0) {
      const hitRate = successfulHits / ralliesPlayed;
      this.analysisResults.playerSkillLevel = Math.min(hitRate, 1.0);
    }
  }

  /**
     * プレイヤー入力処理
     * @param {WorkerMessage} message プレイヤー入力メッセージ
     */
  async handlePlayerInput(message) {
    const inputData = message.payload;
    const timestamp = performance.now();

    // 入力パターンの分析
    this.analyzePlayerInput(inputData, timestamp);

    return this.createSuccessResponse(message, {
      inputAnalyzed: true
    });
  }

  /**
     * プレイヤー入力分析
     * @param {Object} inputData 入力データ
     * @param {number} timestamp タイムスタンプ
     */
  analyzePlayerInput(inputData, timestamp) {
    const inputType = inputData.inputType;

    if (!this.realTimeStats.playerInputPatterns.has(inputType)) {
      this.realTimeStats.playerInputPatterns.set(inputType, []);
    }

    const inputHistory = this.realTimeStats.playerInputPatterns.get(inputType);
    inputHistory.push({
      timestamp,
      data: inputData.inputData
    });

    // 最新100件のみ保持
    if (inputHistory.length > 100) {
      inputHistory.shift();
    }

    this.realTimeStats.playerInputPatterns.set(inputType, inputHistory);
  }

  /**
     * フレーム統計処理
     * @param {WorkerMessage} message フレーム統計メッセージ
     */
  async handleFrameStats(message) {
    const frameStats = message.payload;

    // フレーム統計の記録
    this.realTimeStats.frameTimeHistory.push(frameStats.frameTime);

    return this.createSuccessResponse(message, {
      frameStatsRecorded: true
    });
  }

  /**
     * メモリ使用量処理
     * @param {WorkerMessage} message メモリ使用量メッセージ
     */
  async handleMemoryUsage(message) {
    const memoryData = message.payload;

    this.realTimeStats.memoryUsage = memoryData.total;

    // メモリ使用量アラートチェック
    this.checkMemoryAlerts(memoryData.total);

    return this.createSuccessResponse(message, {
      memoryUsageRecorded: true,
      currentUsage: memoryData.total
    });
  }

  /**
     * パフォーマンストレンド分析
     */
  analyzePerformanceTrends() {
    const recentData = this.metricsData.systemHealth.slice(-30); // 最新30データポイント

    if (recentData.length < 10) return;

    // FPSトレンド
    const fpsValues = recentData.map(d => d.fps);
    const fpsTrend = this.calculateTrend(fpsValues);

    // メモリ使用量トレンド
    const memoryValues = recentData.map(d => d.memoryUsage);
    const memoryTrend = this.calculateTrend(memoryValues);

    // トレンド結果の保存
    this.analysisResults.gameplayTrends = [
      { metric: 'fps', trend: fpsTrend, latest: fpsValues[fpsValues.length - 1] },
      { metric: 'memory', trend: memoryTrend, latest: memoryValues[memoryValues.length - 1] }
    ];

    this.workerStats.analysisRuns++;
  }

  /**
     * トレンド計算
     * @param {Array} values 値の配列
     * @returns {string} トレンド ('improving', 'stable', 'declining')
     */
  calculateTrend(values) {
    if (values.length < 5) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
     * アラート条件チェック
     */
  checkAlertConditions() {
    this.checkPerformanceAlerts();
    this.checkMemoryAlerts(this.realTimeStats.memoryUsage);
    this.checkFPSAlerts();
  }

  /**
     * パフォーマンスアラートチェック
     */
  checkPerformanceAlerts() {
    const thresholds = this.metricsConfig.performanceThresholds;

    // FPSアラート
    if (this.realTimeStats.currentFPS < thresholds.fps.min) {
      this.generateAlert('fps_critical', {
        severity: 'high',
        message: `FPS critically low: ${this.realTimeStats.currentFPS.toFixed(1)}`,
        threshold: thresholds.fps.min,
        current: this.realTimeStats.currentFPS
      });
    }
  }

  /**
     * メモリアラートチェック
     * @param {number} memoryUsage メモリ使用量
     */
  checkMemoryAlerts(memoryUsage) {
    const threshold = this.metricsConfig.performanceThresholds.memoryUsage.max;

    if (memoryUsage > threshold) {
      this.generateAlert('memory_high', {
        severity: 'medium',
        message: `High memory usage: ${memoryUsage.toFixed(1)}MB`,
        threshold,
        current: memoryUsage
      });
    }
  }

  /**
     * FPSアラートチェック
     */
  checkFPSAlerts() {
    const recentFPS = this.realTimeStats.frameTimeHistory.slice(-10);
    if (recentFPS.length < 10) return;

    const avgFPS = 1000 / (recentFPS.reduce((sum, ft) => sum + ft, 0) / recentFPS.length);

    if (avgFPS < 30) {
      this.generateAlert('fps_sustained_low', {
        severity: 'high',
        message: `Sustained low FPS: ${avgFPS.toFixed(1)}`,
        threshold: 30,
        current: avgFPS
      });
    }
  }

  /**
     * アラート生成
     * @param {string} alertId アラートID
     * @param {Object} alertData アラートデータ
     */
  generateAlert(alertId, alertData) {
    const now = performance.now();
    const lastAlertTime = this.alertSystem.lastAlertTime.get(alertId) || 0;

    // 同じアラートの頻発を防ぐ（5秒間隔）
    if (now - lastAlertTime < 5000) return;

    const alert = {
      id: alertId,
      timestamp: now,
      ...alertData
    };

    this.alertSystem.activeAlerts.set(alertId, alert);
    this.alertSystem.alertHistory.push(alert);
    this.alertSystem.lastAlertTime.set(alertId, now);

    this.workerStats.alertsGenerated++;

    // メインスレッドにアラート通知
    this.sendAlertNotification(alert);

    console.warn(`🚨 Alert generated: ${alertId}`, alertData);
  }

  /**
     * アラート通知送信
     * @param {Object} alert アラート情報
     */
  sendAlertNotification(alert) {
    const message = new MessageBuilder()
      .type(MessageType.RESPONSE)
      .priority(MessagePriority.HIGH)
      .payload({
        alertType: 'performance_alert',
        alert: alert
      })
      .build();

    self.postMessage(message);
  }

  /**
     * 古いデータのクリーンアップ
     */
  cleanupOldData() {
    const now = performance.now();
    const retentionPeriod = this.metricsConfig.retentionPeriod;

    // 各データタイプのクリーンアップ
    Object.keys(this.metricsData).forEach(key => {
      this.metricsData[key] = this.metricsData[key].filter(
        data => now - data.timestamp < retentionPeriod
      );
    });

    // アラート履歴のクリーンアップ
    this.alertSystem.alertHistory = this.alertSystem.alertHistory.filter(
      alert => now - alert.timestamp < retentionPeriod
    );

    // アクティブアラートの期限切れチェック
    for (const [alertId, alert] of this.alertSystem.activeAlerts) {
      if (now - alert.timestamp > 30000) { // 30秒で自動解除
        this.alertSystem.activeAlerts.delete(alertId);
      }
    }
  }

  /**
     * メモリ使用量推定
     * @returns {number} 推定メモリ使用量（MB）
     */
  estimateMemoryUsage() {
    const dataSizes = {
      performance: this.metricsData.performance.length * 100,
      gameState: this.metricsData.gameState.length * 200,
      playerBehavior: this.metricsData.playerBehavior.length * 50,
      aiPerformance: this.metricsData.aiPerformance.length * 150,
      systemHealth: this.metricsData.systemHealth.length * 80,
      alerts: this.alertSystem.alertHistory.length * 30,
      realTimeStats: 500,
      analysisResults: 300
    };

    return Object.values(dataSizes).reduce((sum, size) => sum + size, 0) / 1024; // KB -> MB
  }

  /**
     * リアルタイム統計更新
     * @param {Object} metricsData メトリクスデータ
     */
  updateRealTimeStats(metricsData) {
    switch (metricsData.type) {
      case 'session_start':
        this.realTimeStats.sessionsPlayed++;
        break;

      case 'score_update':
        this.realTimeStats.scoresAchieved.push(metricsData.data.score);
        break;

      case 'game_time':
        this.realTimeStats.totalGameTime += metricsData.data.deltaTime;
        break;
    }
  }

  /**
     * パフォーマンス閾値チェック
     * @param {PerformanceMetrics} performanceData パフォーマンスデータ
     */
  checkPerformanceThresholds(performanceData) {
    const fps = performanceData.fps[0];
    const frameTime = performanceData.frameTime[0];
    const memoryUsage = performanceData.memoryUsage[0];

    // 閾値違反の記録
    const violations = [];

    if (fps < this.metricsConfig.performanceThresholds.fps.min) {
      violations.push({ metric: 'fps', value: fps, threshold: this.metricsConfig.performanceThresholds.fps.min });
    }

    if (frameTime > this.metricsConfig.performanceThresholds.frameTime.max) {
      violations.push({ metric: 'frameTime', value: frameTime, threshold: this.metricsConfig.performanceThresholds.frameTime.max });
    }

    if (memoryUsage > this.metricsConfig.performanceThresholds.memoryUsage.max) {
      violations.push({ metric: 'memoryUsage', value: memoryUsage, threshold: this.metricsConfig.performanceThresholds.memoryUsage.max });
    }

    // 違反があればアラート生成
    violations.forEach(violation => {
      this.generateAlert(`threshold_violation_${violation.metric}`, {
        severity: 'medium',
        message: `Threshold violation: ${violation.metric} = ${violation.value}`,
        threshold: violation.threshold,
        current: violation.value
      });
    });
  }

  /**
     * Pingハンドリング
     * @param {WorkerMessage} message Pingメッセージ
     */
  handlePing(message) {
    return new MessageBuilder()
      .id(message.id)  // 元のPINGメッセージIDを使用してレスポンス相関を確立
      .type(MessageType.PONG)
      .priority(MessagePriority.NORMAL)
      .payload({
        timestamp: performance.now(),
        workerId: this.workerId,
        stats: this.getWorkerStats()
      })
      .build();
  }

  /**
     * Worker終了処理
     * @param {WorkerMessage} message 終了メッセージ
     */
  async handleTerminate(message) {
    console.log('🛑 AnalyticsWorker終了中...');

    // 分析結果の最終エクスポート
    const finalReport = this.generateFinalReport();

    // クリーンアップ処理
    this.initialized = false;

    const response = this.createSuccessResponse(message, {
      terminated: true,
      finalReport,
      totalDataPoints: this.workerStats.dataPointsCollected,
      totalAlerts: this.workerStats.alertsGenerated
    });

    this.sendResponse(response);

    // Worker終了
    self.close();
  }

  /**
     * 最終レポート生成
     * @returns {Object} 最終レポート
     */
  generateFinalReport() {
    return {
      sessionSummary: {
        uptime: performance.now(),
        sessionsPlayed: this.realTimeStats.sessionsPlayed,
        totalGameTime: this.realTimeStats.totalGameTime,
        dataPointsCollected: this.workerStats.dataPointsCollected
      },
      performanceSummary: {
        averageFPS: this.realTimeStats.averageFPS,
        peakMemoryUsage: Math.max(...this.metricsData.systemHealth.map(d => d.memoryUsage)),
        alertsGenerated: this.workerStats.alertsGenerated
      },
      playerAnalysis: {
        skillLevel: this.analysisResults.playerSkillLevel,
        inputPatterns: Object.fromEntries(this.realTimeStats.playerInputPatterns),
        gameplayTrends: this.analysisResults.gameplayTrends
      },
      recommendations: this.analysisResults.optimizationSuggestions
    };
  }

  /**
     * Worker統計情報の取得
     * @returns {Object} 統計情報
     */
  getWorkerStats() {
    return {
      ...this.workerStats,
      realTimeStats: {
        currentFPS: this.realTimeStats.currentFPS,
        averageFPS: this.realTimeStats.averageFPS,
        memoryUsage: this.realTimeStats.memoryUsage,
        activeAlerts: this.alertSystem.activeAlerts.size
      },
      dataRetention: {
        performance: this.metricsData.performance.length,
        gameState: this.metricsData.gameState.length,
        systemHealth: this.metricsData.systemHealth.length
      },
      uptime: performance.now() - this.workerStats.uptime
    };
  }

  /**
     * Worker統計の更新
     * @param {number} processingTime 処理時間
     */
  updateWorkerStats(processingTime) {
    this.workerStats.metricsProcessed++;

    // 処理時間が長い場合の警告
    if (processingTime > 50) {
      console.warn(`⚠️ Analytics処理時間が長い: ${processingTime.toFixed(1)}ms`);
    }
  }

  /**
     * 成功レスポンスの作成
     * @param {WorkerMessage} originalMessage 元メッセージ
     * @param {any} payload レスポンスペイロード
     * @returns {WorkerMessage} 成功レスポンス
     */
  createSuccessResponse(originalMessage, payload) {
    return new MessageBuilder()
      .type(MessageType.SUCCESS)
      .priority(originalMessage.priority || MessagePriority.NORMAL)
      .payload(payload)
      .build();
  }

  /**
     * エラーレスポンスの作成
     * @param {WorkerMessage} originalMessage 元メッセージ
     * @param {string} errorMessage エラーメッセージ
     * @returns {WorkerMessage} エラーレスポンス
     */
  createErrorResponse(originalMessage, errorMessage) {
    return new MessageBuilder()
      .type(MessageType.ERROR)
      .priority(MessagePriority.HIGH)
      .payload({
        error: errorMessage,
        originalMessageType: originalMessage.type,
        workerId: this.workerId
      })
      .build();
  }

  /**
     * レスポンス送信
     * @param {Object} response レスポンスオブジェクト
     */
  sendResponse(response) {
    if (response.transferList) {
      // Transferable Objectsを含む場合
      self.postMessage(response.message, response.transferList);
    } else {
      // 通常のメッセージ
      self.postMessage(response);
    }
  }
}

// AnalyticsWorkerのインスタンス化
const analyticsWorker = new AnalyticsWorker();

console.log('📊 AnalyticsWorker ready for messages');
