/**
 * WebWorker並列処理フェーズ4 - AIWorker
 * Ultimate Squash Game専用AI戦略・予測・難易度調整Worker
 *
 * 機能:
 * - AI戦略決定
 * - ボール軌道予測
 * - 難易度調整
 * - 学習機能
 */

import { MessageType, MessagePriority, AIMoveRequest, AIMoveResponse, MessageBuilder, MessageValidator, AIStrategy } from '../communication/message-protocol.js';
import { WorkerAOTLoader } from '../communication/aot-loader.js';

/**
 * AIWorker
 * ゲームAI処理専用Worker
 */
class AIWorker {
  constructor() {
    this.workerId = 'ai';
    this.aotLoader = new WorkerAOTLoader(this.workerId);
    this.initialized = false;

    // AI設定
    this.aiConfig = {
      difficulty: 0.5,  // 0.0 (Easy) - 1.0 (Hard)
      reactionTime: 200, // ms
      predictionAccuracy: 0.7,
      adaptiveLearning: true,
      maxPredictionFrames: 60
    };

    // AI状態
    this.aiState = {
      currentStrategy: AIStrategy.DEFENSIVE,
      targetPosition: { x: 50, y: 300 },
      confidence: 0.8,
      lastDecisionTime: 0,
      reactionDelay: 0
    };

    // 学習データ
    this.learningData = {
      playerPatterns: [],
      successfulMoves: [],
      failedMoves: [],
      adaptationWeight: 0.1
    };

    // パフォーマンス統計
    this.stats = {
      decisionsProcessed: 0,
      predictionsMade: 0,
      correctPredictions: 0,
      averageDecisionTime: 0,
      totalDecisionTime: 0,
      strategyChanges: 0
    };

    this.setupMessageHandlers();
    console.log('🤖 AIWorker初期化完了');
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

        case MessageType.AI_MOVE_REQUEST:
          response = await this.handleMoveRequest(message);
          break;

        case MessageType.AI_DIFFICULTY_UPDATE:
          response = await this.handleDifficultyUpdate(message);
          break;

        case MessageType.AI_STRATEGY_CHANGE:
          response = await this.handleStrategyChange(message);
          break;

        case MessageType.UPDATE_GAME_STATE:
          response = await this.handleGameStateUpdate(message);
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
      console.error('❌ AIメッセージ処理エラー:', error);
      const errorResponse = this.createErrorResponse(message, error.message);
      this.sendResponse(errorResponse);
    }

    // パフォーマンス統計更新
    const decisionTime = performance.now() - startTime;
    this.updateDecisionStats(decisionTime);
  }

  /**
     * Worker初期化処理
     * @param {WorkerMessage} message 初期化メッセージ
     */
  async handleInit(message) {
    if (this.initialized) {
      return this.createSuccessResponse(message, { status: 'already_initialized' });
    }

    console.log('🔧 AIWorker初期化中...');

    try {
      const { config, aotModules } = message.payload;

      // AOTモジュールの初期化
      if (aotModules && aotModules.size > 0) {
        await this.aotLoader.initialize(aotModules);
        console.log('📦 AI AOTモジュール読み込み完了');
      }

      // AI設定の適用
      if (config && config.aiSettings) {
        this.applyAIConfig(config.aiSettings);
      }

      this.initialized = true;
      console.log('✅ AIWorker初期化完了');

      // INIT_COMPLETEメッセージを送信
      return new MessageBuilder()
        .id(message.id)  // 元のメッセージIDを使用して応答関係を明確化
        .type(MessageType.INIT_COMPLETE)
        .priority(MessagePriority.CRITICAL)
        .payload({
          status: 'initialized',
          workerId: this.workerId,
          capabilities: ['strategy', 'prediction', 'difficulty'],
          aiConfig: this.aiConfig,
          availableStrategies: Object.keys(AIStrategy)
        })
        .build();

    } catch (error) {
      console.error('❌ AIWorker初期化失敗:', error);
      throw error;
    }
  }

  /**
     * AI設定の適用
     * @param {Object} aiSettings AI設定
     */
  applyAIConfig(aiSettings) {
    this.aiConfig = { ...this.aiConfig, ...aiSettings };

    // 設定に応じてAI状態を調整
    this.adjustAIBehavior();

    console.log('⚙️ AI設定更新:', this.aiConfig);
  }

  /**
     * AI移動要求処理
     * @param {WorkerMessage} message 移動要求メッセージ
     */
  async handleMoveRequest(message) {
    if (!this.initialized) {
      throw new Error('AIWorker not initialized');
    }

    const moveRequest = message.payload;
    const decisionStartTime = performance.now();

    // リアクションタイム遅延の適用
    if (this.aiState.reactionDelay > 0) {
      await this.sleep(this.aiState.reactionDelay);
    }

    // AI移動決定の実行
    const moveResponse = await this.calculateAIMove(moveRequest);

    // 学習データの更新
    this.updateLearningData(moveRequest, moveResponse);

    // 統計更新
    this.stats.decisionsProcessed++;
    this.stats.predictionsMade++;

    const response = new MessageBuilder()
      .type(MessageType.AI_MOVE_RESPONSE)
      .priority(MessagePriority.NORMAL)
      .payload(moveResponse)
      .build();

    return {
      message: response,
      transferList: moveResponse.getTransferList()
    };
  }

  /**
     * AI移動計算
     * @param {AIMoveRequest} request 移動要求
     * @returns {AIMoveResponse} 移動応答
     */
  async calculateAIMove(request) {
    const ballPos = { x: request.ballPosition[0], y: request.ballPosition[1] };
    const ballVel = { x: request.ballVelocity[0], y: request.ballVelocity[1] };
    const racketPos = { x: request.racketPosition[0], y: request.racketPosition[1] };
    const difficulty = request.difficulty[0];

    // 戦略の選択
    const strategy = this.selectStrategy(ballPos, ballVel, racketPos, difficulty);

    // ボール軌道予測
    const predictedPosition = this.predictBallTrajectory(ballPos, ballVel);

    // 戦略に基づく目標位置の計算
    const targetPosition = this.calculateTargetPosition(strategy, predictedPosition, racketPos, difficulty);

    // 信頼度の計算
    const confidence = this.calculateConfidence(ballPos, ballVel, targetPosition, difficulty);

    // 移動応答の作成
    const response = new AIMoveResponse();
    response.targetPosition[0] = targetPosition.x;
    response.targetPosition[1] = targetPosition.y;
    response.confidence[0] = confidence;
    response.strategy[0] = strategy;

    // タイムスタンプ設定
    const timestamp = performance.now();
    response.timestamp[0] = Math.floor(timestamp / 0x100000000);
    response.timestamp[1] = timestamp % 0x100000000;

    return response;
  }

  /**
     * 戦略選択
     * @param {Object} ballPos ボール位置
     * @param {Object} ballVel ボール速度
     * @param {Object} racketPos ラケット位置
     * @param {number} difficulty 難易度
     * @returns {number} 選択された戦略
     */
  selectStrategy(ballPos, ballVel, racketPos, difficulty) {
    // 適応学習が有効な場合
    if (this.aiConfig.adaptiveLearning && this.learningData.playerPatterns.length > 10) {
      return this.selectAdaptiveStrategy(ballPos, ballVel, racketPos);
    }

    // 難易度ベースの戦略選択
    const strategies = [
      { strategy: AIStrategy.DEFENSIVE, weight: 0.5 - difficulty * 0.3 },
      { strategy: AIStrategy.AGGRESSIVE, weight: difficulty * 0.4 },
      { strategy: AIStrategy.PREDICTIVE, weight: difficulty * 0.5 },
      { strategy: AIStrategy.ADAPTIVE, weight: difficulty * 0.3 },
      { strategy: AIStrategy.RANDOM, weight: 0.1 }
    ];

    // ボール位置・速度に基づく重み調整
    if (ballVel.x > 0) { // ボールが右向き（AI側に向かっている）
      strategies.find(s => s.strategy === AIStrategy.DEFENSIVE).weight += 0.2;
    } else {
      strategies.find(s => s.strategy === AIStrategy.AGGRESSIVE).weight += 0.2;
    }

    // 重み付きランダム選択
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const { strategy, weight } of strategies) {
      currentWeight += weight;
      if (random <= currentWeight) {
        if (strategy !== this.aiState.currentStrategy) {
          this.stats.strategyChanges++;
        }
        this.aiState.currentStrategy = strategy;
        return strategy;
      }
    }

    return AIStrategy.DEFENSIVE; // フォールバック
  }

  /**
     * 適応学習による戦略選択
     * @param {Object} ballPos ボール位置
     * @param {Object} ballVel ボール速度
     * @param {Object} racketPos ラケット位置
     * @returns {number} 選択された戦略
     */
  selectAdaptiveStrategy(ballPos, ballVel, racketPos) {
    // プレイヤーのパターンを分析
    const recentPatterns = this.learningData.playerPatterns.slice(-20);

    // パターンマッチングによる予測
    const similarSituations = recentPatterns.filter(pattern => {
      const posDiff = Math.abs(pattern.ballPos.x - ballPos.x) + Math.abs(pattern.ballPos.y - ballPos.y);
      const velDiff = Math.abs(pattern.ballVel.x - ballVel.x) + Math.abs(pattern.ballVel.y - ballVel.y);
      return posDiff < 100 && velDiff < 10;
    });

    if (similarSituations.length > 0) {
      // 類似状況で最も成功した戦略を選択
      const strategySuccessRate = {};
      similarSituations.forEach(situation => {
        const strategy = situation.aiStrategy;
        if (!strategySuccessRate[strategy]) {
          strategySuccessRate[strategy] = { success: 0, total: 0 };
        }
        strategySuccessRate[strategy].total++;
        if (situation.success) {
          strategySuccessRate[strategy].success++;
        }
      });

      let bestStrategy = AIStrategy.DEFENSIVE;
      let bestRate = 0;

      for (const [strategy, data] of Object.entries(strategySuccessRate)) {
        const rate = data.success / data.total;
        if (rate > bestRate) {
          bestRate = rate;
          bestStrategy = parseInt(strategy);
        }
      }

      return bestStrategy;
    }

    // 学習データが不十分な場合は通常の戦略選択
    return AIStrategy.PREDICTIVE;
  }

  /**
     * ボール軌道予測
     * @param {Object} ballPos ボール位置
     * @param {Object} ballVel ボール速度
     * @returns {Object} 予測位置
     */
  predictBallTrajectory(ballPos, ballVel) {
    const gameWidth = 800;
    const gameHeight = 600;
    const ballRadius = 10;
    const racketX = 50;

    let predX = ballPos.x;
    let predY = ballPos.y;
    let velX = ballVel.x;
    let velY = ballVel.y;

    // ラケット到達時間の予測
    const timeToRacket = (racketX - predX) / velX;

    if (timeToRacket <= 0) {
      // ボールが離れていく場合
      return { x: predX, y: predY, confidence: 0.1 };
    }

    // 壁での反射を考慮した軌道計算
    for (let frame = 0; frame < this.aiConfig.maxPredictionFrames; frame++) {
      predX += velX;
      predY += velY;

      // 上下の壁での反射
      if (predY - ballRadius <= 0 || predY + ballRadius >= gameHeight) {
        velY = -velY;
        predY = Math.max(ballRadius, Math.min(gameHeight - ballRadius, predY));
      }

      // ラケット位置に到達
      if (predX <= racketX && velX < 0) {
        break;
      }
    }

    // 予測精度の計算
    const accuracy = this.aiConfig.predictionAccuracy * (1 - Math.min(timeToRacket / 100, 0.5));

    // 精度に基づくノイズ追加
    const noise = (1 - accuracy) * 50;
    predY += (Math.random() - 0.5) * noise;

    return {
      x: predX,
      y: Math.max(0, Math.min(gameHeight, predY)),
      confidence: accuracy
    };
  }

  /**
     * 目標位置の計算
     * @param {number} strategy 戦略
     * @param {Object} predictedPos 予測位置
     * @param {Object} racketPos 現在のラケット位置
     * @param {number} difficulty 難易度
     * @returns {Object} 目標位置
     */
  calculateTargetPosition(strategy, predictedPos, racketPos, difficulty) {
    const gameHeight = 600;
    const racketHeight = 100;

    let targetY = predictedPos.y - racketHeight / 2;

    switch (strategy) {
      case AIStrategy.DEFENSIVE:
        // 中央寄りの安全な位置
        targetY = this.lerp(targetY, gameHeight / 2, 0.3);
        break;

      case AIStrategy.AGGRESSIVE:
        // 攻撃的な位置（ボール直撃狙い）
        targetY = predictedPos.y - racketHeight / 2;
        break;

      case AIStrategy.PREDICTIVE:
        // 予測位置への最適移動
        targetY = predictedPos.y - racketHeight / 2;
        // 難易度によるずらし調整
        targetY += (Math.random() - 0.5) * (1 - difficulty) * 50;
        break;

      case AIStrategy.ADAPTIVE:
        // 学習データに基づく調整
        targetY = this.calculateAdaptivePosition(predictedPos, racketPos, difficulty);
        break;

      case AIStrategy.RANDOM:
        // ランダムな動き（低難易度）
        targetY += (Math.random() - 0.5) * 100;
        break;
    }

    // 難易度による反応速度調整
    const reactionSpeed = difficulty * 0.8 + 0.2;
    targetY = this.lerp(racketPos.y, targetY, reactionSpeed);

    // 画面内に制限
    targetY = Math.max(0, Math.min(gameHeight - racketHeight, targetY));

    return {
      x: racketPos.x,
      y: targetY
    };
  }

  /**
     * 適応的位置計算
     * @param {Object} predictedPos 予測位置
     * @param {Object} racketPos ラケット位置
     * @param {number} difficulty 難易度
     * @returns {number} 目標Y位置
     */
  calculateAdaptivePosition(predictedPos, racketPos, difficulty) {
    // 最近の成功パターンを分析
    const successfulMoves = this.learningData.successfulMoves.slice(-10);

    if (successfulMoves.length > 0) {
      const avgOffset = successfulMoves.reduce((sum, move) => sum + move.targetOffset, 0) / successfulMoves.length;
      return predictedPos.y + avgOffset * this.learningData.adaptationWeight;
    }

    return predictedPos.y - 50; // デフォルト
  }

  /**
     * 信頼度の計算
     * @param {Object} ballPos ボール位置
     * @param {Object} ballVel ボール速度
     * @param {Object} targetPos 目標位置
     * @param {number} difficulty 難易度
     * @returns {number} 信頼度 (0.0-1.0)
     */
  calculateConfidence(ballPos, ballVel, targetPos, difficulty) {
    let confidence = this.aiConfig.predictionAccuracy;

    // ボール速度による信頼度調整
    const ballSpeed = Math.sqrt(ballVel.x ** 2 + ballVel.y ** 2);
    confidence *= Math.max(0.3, 1 - ballSpeed / 20);

    // 距離による信頼度調整
    const distance = Math.abs(ballPos.x - targetPos.x);
    confidence *= Math.max(0.4, 1 - distance / 400);

    // 難易度による調整
    confidence *= (0.3 + difficulty * 0.7);

    // 学習データに基づく調整
    if (this.stats.predictionsMade > 0) {
      const successRate = this.stats.correctPredictions / this.stats.predictionsMade;
      confidence *= (0.5 + successRate * 0.5);
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
     * 難易度更新処理
     * @param {WorkerMessage} message 難易度更新メッセージ
     */
  async handleDifficultyUpdate(message) {
    const { difficulty, gradual } = message.payload;

    if (gradual) {
      // 段階的な難易度変更
      this.gradualDifficultyChange(difficulty);
    } else {
      // 即座の難易度変更
      this.aiConfig.difficulty = Math.max(0, Math.min(1, difficulty));
    }

    // AI動作の調整
    this.adjustAIBehavior();

    console.log(`🎚️ AI難易度更新: ${this.aiConfig.difficulty}`);

    return this.createSuccessResponse(message, {
      newDifficulty: this.aiConfig.difficulty,
      aiConfig: this.aiConfig
    });
  }

  /**
     * 段階的難易度変更
     * @param {number} targetDifficulty 目標難易度
     */
  gradualDifficultyChange(targetDifficulty) {
    const step = 0.05;
    const current = this.aiConfig.difficulty;

    if (Math.abs(targetDifficulty - current) > step) {
      this.aiConfig.difficulty += targetDifficulty > current ? step : -step;

      // 次のステップをスケジュール
      setTimeout(() => this.gradualDifficultyChange(targetDifficulty), 1000);
    } else {
      this.aiConfig.difficulty = targetDifficulty;
    }
  }

  /**
     * AI動作調整
     */
  adjustAIBehavior() {
    // 難易度に応じた設定調整
    const difficulty = this.aiConfig.difficulty;

    this.aiConfig.reactionTime = 300 - (difficulty * 200); // 300ms -> 100ms
    this.aiConfig.predictionAccuracy = 0.3 + (difficulty * 0.6); // 0.3 -> 0.9
    this.aiState.reactionDelay = this.aiConfig.reactionTime * (1 + Math.random() * 0.5);
  }

  /**
     * 戦略変更処理
     * @param {WorkerMessage} message 戦略変更メッセージ
     */
  async handleStrategyChange(message) {
    const { strategy, temporary } = message.payload;

    const oldStrategy = this.aiState.currentStrategy;
    this.aiState.currentStrategy = strategy;

    if (temporary) {
      // 一時的な戦略変更
      setTimeout(() => {
        this.aiState.currentStrategy = oldStrategy;
      }, temporary);
    }

    this.stats.strategyChanges++;

    console.log(`🧠 AI戦略変更: ${oldStrategy} -> ${strategy}`);

    return this.createSuccessResponse(message, {
      oldStrategy,
      newStrategy: strategy,
      temporary
    });
  }

  /**
     * ゲーム状態更新処理
     * @param {WorkerMessage} message ゲーム状態更新メッセージ
     */
  async handleGameStateUpdate(message) {
    // 学習データの更新
    const gameState = message.payload;
    this.updateGameStateLearning(gameState);

    return this.createSuccessResponse(message, {
      learningDataUpdated: true
    });
  }

  /**
     * ゲーム状態学習データ更新
     * @param {Object} gameState ゲーム状態
     */
  updateGameStateLearning(gameState) {
    // プレイヤーパターンの記録
    this.learningData.playerPatterns.push({
      ballPos: { x: gameState.ballPosition[0], y: gameState.ballPosition[1] },
      ballVel: { x: gameState.ballVelocity[0], y: gameState.ballVelocity[1] },
      racketPos: { x: gameState.racketPosition[0], y: gameState.racketPosition[1] },
      timestamp: performance.now(),
      aiStrategy: this.aiState.currentStrategy
    });

    // データサイズ制限
    if (this.learningData.playerPatterns.length > 1000) {
      this.learningData.playerPatterns = this.learningData.playerPatterns.slice(-500);
    }
  }

  /**
     * 学習データ更新
     * @param {AIMoveRequest} request 移動要求
     * @param {AIMoveResponse} response 移動応答
     */
  updateLearningData(request, response) {
    const moveData = {
      ballPos: { x: request.ballPosition[0], y: request.ballPosition[1] },
      ballVel: { x: request.ballVelocity[0], y: request.ballVelocity[1] },
      racketPos: { x: request.racketPosition[0], y: request.racketPosition[1] },
      targetPos: { x: response.targetPosition[0], y: response.targetPosition[1] },
      strategy: response.strategy[0],
      confidence: response.confidence[0],
      timestamp: performance.now()
    };

    this.learningData.successfulMoves.push(moveData);

    // データサイズ制限
    if (this.learningData.successfulMoves.length > 500) {
      this.learningData.successfulMoves = this.learningData.successfulMoves.slice(-250);
    }
  }

  /**
     * 線形補間ユーティリティ
     * @param {number} a 開始値
     * @param {number} b 終了値
     * @param {number} t 補間係数 (0.0-1.0)
     * @returns {number} 補間結果
     */
  lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  /**
     * スリープユーティリティ
     * @param {number} ms ミリ秒
     * @returns {Promise} スリープPromise
     */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    console.log('🛑 AIWorker終了中...');

    // 学習データの保存（将来的にはローカルストレージやサーバーに）
    this.saveLearningData();

    // クリーンアップ処理
    this.initialized = false;

    const response = this.createSuccessResponse(message, {
      terminated: true,
      finalStats: this.getWorkerStats(),
      learningDataSize: this.learningData.playerPatterns.length
    });

    this.sendResponse(response);

    // Worker終了
    self.close();
  }

  /**
     * 学習データの保存
     */
  saveLearningData() {
    // 将来的にはローカルストレージやIndexedDBに保存
    console.log('💾 学習データ保存:', {
      patterns: this.learningData.playerPatterns.length,
      successfulMoves: this.learningData.successfulMoves.length
    });
  }

  /**
     * Worker統計情報の取得
     * @returns {Object} 統計情報
     */
  getWorkerStats() {
    const predictionAccuracy = this.stats.predictionsMade > 0
      ? this.stats.correctPredictions / this.stats.predictionsMade
      : 0;

    return {
      ...this.stats,
      predictionAccuracy,
      uptime: performance.now(),
      currentDifficulty: this.aiConfig.difficulty,
      currentStrategy: this.aiState.currentStrategy,
      learningDataSize: {
        patterns: this.learningData.playerPatterns.length,
        successfulMoves: this.learningData.successfulMoves.length
      },
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
     * メモリ使用量の概算
     * @returns {number} メモリ使用量（MB）
     */
  getMemoryUsage() {
    const objectSizes = {
      aiConfig: 100,
      aiState: 150,
      learningData: this.learningData.playerPatterns.length * 50 + this.learningData.successfulMoves.length * 40,
      stats: 100,
      aotLoader: this.aotLoader ? 300 : 0
    };

    return Object.values(objectSizes).reduce((sum, size) => sum + size, 0) / 1024; // KB -> MB
  }

  /**
     * 決定統計の更新
     * @param {number} decisionTime 決定処理時間
     */
  updateDecisionStats(decisionTime) {
    this.stats.totalDecisionTime += decisionTime;
    if (this.stats.decisionsProcessed > 0) {
      this.stats.averageDecisionTime = this.stats.totalDecisionTime / this.stats.decisionsProcessed;
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

// AIWorkerのインスタンス化
const aiWorker = new AIWorker();

console.log('🤖 AIWorker ready for messages');
