/**
 * WebWorker並列処理フェーズ4 - ゲームロジックWorker
 * Ultimate Squash Game専用ゲーム物理演算・状態管理Worker
 *
 * 機能:
 * - ゲーム物理演算
 * - 衝突判定処理
 * - ゲーム状態管理
 * - フレーム更新処理
 */

import { MessageType, MessagePriority, GameStateUpdate, MessageBuilder, MessageValidator, GameFlags } from '../communication/message-protocol.js';
import { WorkerAOTLoader } from '../communication/aot-loader.js';

/**
 * ゲームロジックWorker
 * メインスレッドから分離したゲーム物理演算処理
 */
class GameLogicWorker {
  constructor() {
    this.workerId = 'game-logic';
    this.aotLoader = new WorkerAOTLoader(this.workerId);
    this.initialized = false;

    // ゲーム状態
    this.gameState = {
      ballPosition: { x: 400, y: 300 },
      ballVelocity: { x: 5, y: 3 },
      racketPosition: { x: 50, y: 250 },
      racketVelocity: { x: 0, y: 0 },
      score: { player1: 0, player2: 0 },
      frameNumber: 0,
      gameFlags: {
        paused: false,
        gameOver: false,
        ballHitRacket: false,
        ballHitWall: false,
        scoreChanged: false
      }
    };

    // ゲーム設定
    this.gameConfig = {
      ballRadius: 10,
      racketWidth: 15,
      racketHeight: 100,
      gameWidth: 800,
      gameHeight: 600,
      ballSpeedMultiplier: 1.0,
      maxBallSpeed: 15
    };

    // パフォーマンス統計
    this.stats = {
      framesProcessed: 0,
      averageFrameTime: 0,
      physicsCalculations: 0,
      collisionsDetected: 0,
      totalFrameTime: 0
    };

    this.setupMessageHandlers();
    console.log('🎮 GameLogicWorker初期化完了');
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

        case MessageType.UPDATE_GAME_STATE:
          response = await this.handleGameStateUpdate(message);
          break;

        case MessageType.PLAYER_INPUT:
          response = await this.handlePlayerInput(message);
          break;

        case MessageType.START_GAME:
          response = await this.handleStartGame(message);
          break;

        case MessageType.PAUSE_GAME:
          response = await this.handlePauseGame(message);
          break;

        case MessageType.RESTART_GAME:
          response = await this.handleRestartGame(message);
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
        // handleGameStateUpdateは特殊な形式を返すことがある
        if (response.message && response.transferList) {
          this.sendResponse(response);
        } else {
          this.sendResponse(response);
        }
      }

    } catch (error) {
      console.error('❌ メッセージ処理エラー:', error);
      const errorResponse = this.createErrorResponse(message, error.message);
      this.sendResponse(errorResponse);
    }

    // パフォーマンス統計更新
    const frameTime = performance.now() - startTime;
    this.updatePerformanceStats(frameTime);
  }

  /**
     * Worker初期化処理
     * @param {WorkerMessage} message 初期化メッセージ
     */
  async handleInit(message) {
    if (this.initialized) {
      return this.createSuccessResponse(message, { status: 'already_initialized' });
    }

    console.log('🔧 GameLogicWorker初期化中...');

    try {
      const { config, aotModules } = message.payload;

      // AOTモジュールの初期化
      if (aotModules && aotModules.size > 0) {
        await this.aotLoader.initialize(aotModules);
        console.log('📦 AOTモジュール読み込み完了');
      }

      // Worker設定の適用
      if (config) {
        this.applyWorkerConfig(config);
      }

      this.initialized = true;
      console.log('✅ GameLogicWorker初期化完了');

      // INIT_COMPLETEメッセージを送信
      return new MessageBuilder()
        .id(message.id)  // 元のメッセージIDを使用して応答関係を明確化
        .type(MessageType.INIT_COMPLETE)
        .priority(MessagePriority.CRITICAL)
        .payload({
          status: 'initialized',
          workerId: this.workerId,
          capabilities: ['physics', 'collision', 'state'],
          gameConfig: this.gameConfig
        })
        .build();

    } catch (error) {
      console.error('❌ GameLogicWorker初期化失敗:', error);
      throw error;
    }
  }

  /**
     * Worker設定の適用
     * @param {WorkerConfig} config Worker設定
     */
  applyWorkerConfig(config) {
    if (config.gameSettings) {
      this.gameConfig = { ...this.gameConfig, ...config.gameSettings };
      console.log('⚙️ ゲーム設定更新:', this.gameConfig);
    }
  }

  /**
     * ゲーム状態更新処理
     * @param {WorkerMessage} message ゲーム状態更新メッセージ
     */
  async handleGameStateUpdate(message) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    // ゲーム物理演算の実行
    const frameStartTime = performance.now();

    // フラグリセット
    this.resetFrameFlags();

    // 物理演算ステップ
    this.updateBallPhysics();
    this.updateRacketPhysics();
    this.performCollisionDetection();
    this.updateGameState();

    // フレーム番号更新
    this.gameState.frameNumber++;
    this.stats.framesProcessed++;

    // 更新されたゲーム状態をPackaged形式で返す
    const gameStateUpdate = this.createGameStateUpdate();

    const response = new MessageBuilder()
      .type(MessageType.UPDATE_GAME_STATE)
      .priority(MessagePriority.HIGH)
      .payload(gameStateUpdate)
      .build();

    // フレーム処理時間の記録
    const frameTime = performance.now() - frameStartTime;
    this.stats.totalFrameTime += frameTime;
    this.stats.averageFrameTime = this.stats.totalFrameTime / this.stats.framesProcessed;

    return {
      message: response,
      transferList: gameStateUpdate.getTransferList()
    };
  }

  /**
     * プレイヤー入力処理
     * @param {WorkerMessage} message プレイヤー入力メッセージ
     */
  async handlePlayerInput(message) {
    const { inputType, inputData } = message.payload;

    switch (inputType) {
      case 'racket_move':
        this.applyRacketMovement(inputData);
        break;

      case 'racket_position':
        this.setRacketPosition(inputData);
        break;

      default:
        console.warn(`未対応入力タイプ: ${inputType}`);
    }

    return this.createSuccessResponse(message, {
      inputProcessed: true,
      inputType: inputType
    });
  }

  /**
     * ラケット移動の適用
     * @param {Object} inputData 入力データ
     */
  applyRacketMovement(inputData) {
    const { direction, intensity = 1.0 } = inputData;
    const moveSpeed = 8 * intensity;

    switch (direction) {
      case 'up':
        this.gameState.racketVelocity.y = -moveSpeed;
        break;
      case 'down':
        this.gameState.racketVelocity.y = moveSpeed;
        break;
      case 'stop':
        this.gameState.racketVelocity.y = 0;
        break;
    }

    // ラケット位置制限
    this.constrainRacketPosition();
  }

  /**
     * ラケット位置の直接設定
     * @param {Object} inputData 位置データ
     */
  setRacketPosition(inputData) {
    const { x, y } = inputData;

    if (typeof x === 'number') {
      this.gameState.racketPosition.x = Math.max(0, Math.min(this.gameConfig.gameWidth - this.gameConfig.racketWidth, x));
    }

    if (typeof y === 'number') {
      this.gameState.racketPosition.y = Math.max(0, Math.min(this.gameConfig.gameHeight - this.gameConfig.racketHeight, y));
    }
  }

  /**
     * ゲーム開始処理
     * @param {WorkerMessage} message 開始メッセージ
     */
  async handleStartGame(message) {
    this.gameState.gameFlags.paused = false;
    this.gameState.gameFlags.gameOver = false;

    console.log('🎮 ゲーム開始');

    return this.createSuccessResponse(message, {
      gameStarted: true,
      gameState: this.gameState
    });
  }

  /**
     * ゲーム一時停止処理
     * @param {WorkerMessage} message 一時停止メッセージ
     */
  async handlePauseGame(message) {
    this.gameState.gameFlags.paused = true;

    console.log('⏸️ ゲーム一時停止');

    return this.createSuccessResponse(message, {
      gamePaused: true
    });
  }

  /**
     * ゲーム再起動処理
     * @param {WorkerMessage} message 再起動メッセージ
     */
  async handleRestartGame(message) {
    // ゲーム状態のリセット
    this.resetGameState();

    console.log('🔄 ゲーム再起動');

    return this.createSuccessResponse(message, {
      gameRestarted: true,
      gameState: this.gameState
    });
  }

  /**
     * ゲーム状態のリセット
     */
  resetGameState() {
    this.gameState = {
      ballPosition: { x: this.gameConfig.gameWidth / 2, y: this.gameConfig.gameHeight / 2 },
      ballVelocity: { x: 5, y: 3 },
      racketPosition: { x: 50, y: this.gameConfig.gameHeight / 2 - this.gameConfig.racketHeight / 2 },
      racketVelocity: { x: 0, y: 0 },
      score: { player1: 0, player2: 0 },
      frameNumber: 0,
      gameFlags: {
        paused: false,
        gameOver: false,
        ballHitRacket: false,
        ballHitWall: false,
        scoreChanged: false
      }
    };

    // 統計もリセット
    this.stats.framesProcessed = 0;
    this.stats.totalFrameTime = 0;
    this.stats.averageFrameTime = 0;
  }

  /**
     * フレームフラグのリセット
     */
  resetFrameFlags() {
    this.gameState.gameFlags.ballHitRacket = false;
    this.gameState.gameFlags.ballHitWall = false;
    this.gameState.gameFlags.scoreChanged = false;
  }

  /**
     * ボール物理演算の更新
     */
  updateBallPhysics() {
    if (this.gameState.gameFlags.paused || this.gameState.gameFlags.gameOver) {
      return;
    }

    // ボール位置の更新
    this.gameState.ballPosition.x += this.gameState.ballVelocity.x * this.gameConfig.ballSpeedMultiplier;
    this.gameState.ballPosition.y += this.gameState.ballVelocity.y * this.gameConfig.ballSpeedMultiplier;

    // 最大速度制限
    const speed = Math.sqrt(
      this.gameState.ballVelocity.x ** 2 + this.gameState.ballVelocity.y ** 2
    );

    if (speed > this.gameConfig.maxBallSpeed) {
      const factor = this.gameConfig.maxBallSpeed / speed;
      this.gameState.ballVelocity.x *= factor;
      this.gameState.ballVelocity.y *= factor;
    }

    this.stats.physicsCalculations++;
  }

  /**
     * ラケット物理演算の更新
     */
  updateRacketPhysics() {
    if (this.gameState.gameFlags.paused || this.gameState.gameFlags.gameOver) {
      return;
    }

    // ラケット位置の更新
    this.gameState.racketPosition.y += this.gameState.racketVelocity.y;

    // 位置制限
    this.constrainRacketPosition();

    // 速度減衰（フリクション）
    this.gameState.racketVelocity.y *= 0.9;
  }

  /**
     * ラケット位置制限
     */
  constrainRacketPosition() {
    this.gameState.racketPosition.y = Math.max(
      0,
      Math.min(
        this.gameConfig.gameHeight - this.gameConfig.racketHeight,
        this.gameState.racketPosition.y
      )
    );
  }

  /**
     * 衝突判定処理
     */
  performCollisionDetection() {
    this.checkWallCollisions();
    this.checkRacketCollision();
    this.checkGoals();
  }

  /**
     * 壁衝突判定
     */
  checkWallCollisions() {
    const ball = this.gameState.ballPosition;
    const ballRadius = this.gameConfig.ballRadius;

    // 上下の壁
    if (ball.y - ballRadius <= 0 || ball.y + ballRadius >= this.gameConfig.gameHeight) {
      this.gameState.ballVelocity.y = -this.gameState.ballVelocity.y;
      ball.y = Math.max(ballRadius, Math.min(this.gameConfig.gameHeight - ballRadius, ball.y));
      this.gameState.gameFlags.ballHitWall = true;
      this.stats.collisionsDetected++;
    }
  }

  /**
     * ラケット衝突判定
     */
  checkRacketCollision() {
    const ball = this.gameState.ballPosition;
    const racket = this.gameState.racketPosition;
    const ballRadius = this.gameConfig.ballRadius;

    // 簡易矩形衝突判定
    if (ball.x - ballRadius <= racket.x + this.gameConfig.racketWidth &&
            ball.x + ballRadius >= racket.x &&
            ball.y - ballRadius <= racket.y + this.gameConfig.racketHeight &&
            ball.y + ballRadius >= racket.y) {

      // ボール速度反転
      this.gameState.ballVelocity.x = -this.gameState.ballVelocity.x;

      // ラケットの移動量を反映（スピン効果）
      const racketInfluence = this.gameState.racketVelocity.y * 0.3;
      this.gameState.ballVelocity.y += racketInfluence;

      // ボール位置調整（埋め込み防止）
      ball.x = racket.x + this.gameConfig.racketWidth + ballRadius;

      this.gameState.gameFlags.ballHitRacket = true;
      this.stats.collisionsDetected++;
    }
  }

  /**
     * ゴール判定
     */
  checkGoals() {
    const ball = this.gameState.ballPosition;

    // 右端（プレイヤー1得点）
    if (ball.x >= this.gameConfig.gameWidth) {
      this.gameState.score.player1++;
      this.resetBallPosition();
      this.gameState.gameFlags.scoreChanged = true;
    }

    // 左端（プレイヤー2得点）
    if (ball.x <= 0) {
      this.gameState.score.player2++;
      this.resetBallPosition();
      this.gameState.gameFlags.scoreChanged = true;
    }
  }

  /**
     * ボール位置のリセット
     */
  resetBallPosition() {
    this.gameState.ballPosition.x = this.gameConfig.gameWidth / 2;
    this.gameState.ballPosition.y = this.gameConfig.gameHeight / 2;

    // ランダムな方向でボールを再開
    const angle = (Math.random() - 0.5) * Math.PI / 3; // ±30度
    const speed = 5;
    this.gameState.ballVelocity.x = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    this.gameState.ballVelocity.y = Math.sin(angle) * speed;
  }

  /**
     * ゲーム状態の更新
     */
  updateGameState() {
    // ゲームオーバー判定
    if (this.gameState.score.player1 >= 11 || this.gameState.score.player2 >= 11) {
      this.gameState.gameFlags.gameOver = true;
    }
  }

  /**
     * GameStateUpdateオブジェクトの作成
     * @returns {GameStateUpdate} ゲーム状態更新オブジェクト
     */
  createGameStateUpdate() {
    const update = new GameStateUpdate();

    // 位置・速度データの設定
    update.ballPosition[0] = this.gameState.ballPosition.x;
    update.ballPosition[1] = this.gameState.ballPosition.y;
    update.ballVelocity[0] = this.gameState.ballVelocity.x;
    update.ballVelocity[1] = this.gameState.ballVelocity.y;
    update.racketPosition[0] = this.gameState.racketPosition.x;
    update.racketPosition[1] = this.gameState.racketPosition.y;
    update.racketVelocity[0] = this.gameState.racketVelocity.x;
    update.racketVelocity[1] = this.gameState.racketVelocity.y;

    // フレーム・タイムスタンプ
    update.frameNumber[0] = this.gameState.frameNumber;
    const timestamp = performance.now();
    update.timestamp[0] = Math.floor(timestamp / 0x100000000);
    update.timestamp[1] = timestamp % 0x100000000;

    // スコア
    update.score[0] = this.gameState.score.player1;
    update.score[1] = this.gameState.score.player2;

    // ゲームフラグ
    update.setFlag(GameFlags.PAUSED, this.gameState.gameFlags.paused);
    update.setFlag(GameFlags.GAME_OVER, this.gameState.gameFlags.gameOver);
    update.setFlag(GameFlags.BALL_HIT_RACKET, this.gameState.gameFlags.ballHitRacket);
    update.setFlag(GameFlags.BALL_HIT_WALL, this.gameState.gameFlags.ballHitWall);
    update.setFlag(GameFlags.SCORE_CHANGED, this.gameState.gameFlags.scoreChanged);

    return update;
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
    console.log('🛑 GameLogicWorker終了中...');

    // クリーンアップ処理
    this.initialized = false;

    // 終了応答
    const response = this.createSuccessResponse(message, {
      terminated: true,
      finalStats: this.getWorkerStats()
    });

    this.sendResponse(response);

    // Worker終了
    self.close();
  }

  /**
     * Worker統計情報の取得
     * @returns {Object} 統計情報
     */
  getWorkerStats() {
    return {
      ...this.stats,
      uptime: performance.now(),
      memoryUsage: this.getMemoryUsage(),
      gameState: {
        frameNumber: this.gameState.frameNumber,
        score: this.gameState.score,
        isPlaying: !this.gameState.gameFlags.paused && !this.gameState.gameFlags.gameOver
      }
    };
  }

  /**
     * メモリ使用量の概算
     * @returns {number} メモリ使用量（MB）
     */
  getMemoryUsage() {
    // 簡易メモリ使用量計算
    const objectSizes = {
      gameState: 200,
      gameConfig: 100,
      stats: 150,
      aotLoader: this.aotLoader ? 500 : 0
    };

    return Object.values(objectSizes).reduce((sum, size) => sum + size, 0) / 1024; // KB -> MB
  }

  /**
     * パフォーマンス統計の更新
     * @param {number} frameTime フレーム処理時間
     */
  updatePerformanceStats(frameTime) {
    this.stats.totalFrameTime += frameTime;
    if (this.stats.framesProcessed > 0) {
      this.stats.averageFrameTime = this.stats.totalFrameTime / this.stats.framesProcessed;
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

// GameLogicWorkerのインスタンス化
const gameLogicWorker = new GameLogicWorker();

console.log('🎮 GameLogicWorker ready for messages');
