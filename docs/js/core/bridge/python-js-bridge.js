/**
 * Python-JavaScript Bridge
 * Pythonゲームエンジンと週替わりチャレンジシステムの連携
 */

export class PythonJSBridge {
  constructor() {
    this.websocket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
     * WebSocket接続を初期化
     * @param {string} url - WebSocketサーバーのURL（デフォルト: ws://localhost:8765）
     */
  async connect(url = 'ws://localhost:8765') {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          console.log('Python-JS Bridge connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.websocket.onclose = () => {
          console.log('WebSocket connection closed');
          this.attemptReconnect(url);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
     * メッセージハンドリング
     */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      // リスナーを実行
      const listeners = this.listeners.get(type) || [];
      listeners.forEach(callback => callback(payload));
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
     * イベントリスナーを登録
     */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /**
     * イベントリスナーを削除
     */
  off(type, callback) {
    const listeners = this.listeners.get(type) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
     * Pythonにメッセージを送信
     */
  send(type, payload) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.websocket.send(message);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  /**
     * 再接続を試みる
     */
  attemptReconnect(url) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect(url).catch(console.error);
      }, 2000 * this.reconnectAttempts); // 指数バックオフ
    }
  }

  /**
     * 接続を閉じる
     */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

/**
 * ゲームイベントの定義
 */
export const GameEvents = {
  // Python → JavaScript
  GAME_STARTED: 'game:started',
  GAME_ENDED: 'game:ended',
  SCORE_UPDATED: 'score:updated',
  BALL_HIT: 'ball:hit',
  POWER_UP_COLLECTED: 'powerup:collected',

  // JavaScript → Python
  LOAD_CHALLENGE: 'challenge:load',
  UPDATE_DIFFICULTY: 'difficulty:update',
  APPLY_MODIFIER: 'modifier:apply',
  REQUEST_GAME_STATE: 'game:request_state'
};

/**
 * チャレンジとゲームの統合
 */
export class ChallengeGameIntegration {
  constructor(bridge, challengeManager) {
    this.bridge = bridge;
    this.challengeManager = challengeManager;
    this.currentChallenge = null;
    this.gameState = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // ゲーム開始時
    this.bridge.on(GameEvents.GAME_STARTED, (data) => {
      console.log('Game started:', data);
      this.gameState = data;

      // 現在のチャレンジをPythonに送信
      if (this.currentChallenge) {
        this.bridge.send(GameEvents.LOAD_CHALLENGE, {
          challenge: this.currentChallenge,
          modifiers: this.currentChallenge.gameModifiers
        });
      }
    });

    // スコア更新時
    this.bridge.on(GameEvents.SCORE_UPDATED, (data) => {
      if (this.currentChallenge && this.challengeManager) {
        // チャレンジの進捗を更新
        this.challengeManager.updateProgress({
          score: data.score,
          ballsHit: data.ballsHit,
          powerUpsCollected: data.powerUpsCollected,
          gameTime: data.gameTime
        });
      }
    });

    // ゲーム終了時
    this.bridge.on(GameEvents.GAME_ENDED, (data) => {
      if (this.currentChallenge && this.challengeManager) {
        // チャレンジの完了を評価
        const result = this.challengeManager.evaluateChallenge(data);
        console.log('Challenge result:', result);

        // 結果をUIに反映
        this.updateUI(result);
      }
    });
  }

  /**
     * チャレンジを開始
     */
  startChallenge(challenge) {
    this.currentChallenge = challenge;

    // Pythonにチャレンジ情報を送信
    this.bridge.send(GameEvents.LOAD_CHALLENGE, {
      challenge: {
        id: challenge.id,
        type: challenge.type,
        difficulty: challenge.difficulty,
        targets: challenge.targets,
        gameModifiers: challenge.gameModifiers
      }
    });
  }

  /**
     * UI更新（オーバーライド可能）
     */
  updateUI(result) {
    // デフォルト実装
    console.log('Challenge completed:', result);
  }
}

// シングルトンインスタンスをエクスポート
export const pythonBridge = new PythonJSBridge();
