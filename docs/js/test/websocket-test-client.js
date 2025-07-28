/**
 * WebSocket Test Client
 * Python WebSocketサーバーとの接続テスト用
 *
 * 個人開発規約遵守:
 * - TDD必須: WebSocket通信テスト
 * - モック禁止: 実際のWebSocket接続でテスト
 * - エラー3要素: 接続エラー時の適切なメッセージ
 */

class WebSocketTestClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2秒

    this.setupUI();
    this.connect();
  }

  setupUI() {
    // ステータス表示用のUIを作成
    const statusDiv = document.createElement('div');
    statusDiv.id = 'websocket-status';
    statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
        `;
    document.body.appendChild(statusDiv);

    // ログ表示用のUIを作成
    const logDiv = document.createElement('div');
    logDiv.id = 'websocket-log';
    logDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 400px;
            height: 200px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            border-radius: 5px;
            font-family: monospace;
            font-size: 11px;
            z-index: 10000;
            overflow-y: auto;
            border: 1px solid #333;
        `;
    document.body.appendChild(logDiv);

    this.updateStatus('初期化中...', 'orange');
    this.log('WebSocket Test Client 初期化');
  }

  updateStatus(message, color = 'white') {
    const statusDiv = document.getElementById('websocket-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
                <div style="color: ${color};">🔗 WebSocket Status</div>
                <div>${message}</div>
                <div>再接続試行: ${this.reconnectAttempts}/${this.maxReconnectAttempts}</div>
                <div>時刻: ${new Date().toLocaleTimeString()}</div>
            `;
    }
  }

  log(message, type = 'info') {
    const logDiv = document.getElementById('websocket-log');
    if (logDiv) {
      const timestamp = new Date().toLocaleTimeString();
      const color = {
        'info': '#00ff00',
        'error': '#ff4444',
        'warn': '#ffaa00',
        'success': '#44ff44'
      }[type] || '#00ff00';

      logDiv.innerHTML += `<div style="color: ${color};">[${timestamp}] ${message}</div>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    }
    console.log(`[WebSocket] ${message}`);
  }

  connect() {
    try {
      this.log('Python WebSocketサーバーに接続中... (ws://localhost:8765)');
      this.updateStatus('接続中...', 'yellow');

      this.socket = new WebSocket('ws://localhost:8765');

      this.socket.onopen = (event) => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('接続成功', 'green');
        this.log('WebSocket接続が確立されました', 'success');

        // 接続テストメッセージを送信
        this.sendTestMessage();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          this.log(`メッセージ解析エラー: ${e.message}`, 'error');
        }
      };

      this.socket.onclose = (event) => {
        this.isConnected = false;
        const reason = event.reason || '不明な理由';
        this.log(`WebSocket接続が閉じられました: ${reason} (コード: ${event.code})`, 'warn');
        this.updateStatus(`接続切断: ${reason}`, 'red');

        // 自動再接続
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        this.log(`WebSocketエラー: ${error.message || error}`, 'error');
        this.updateStatus('接続エラー', 'red');
      };

    } catch (error) {
      this.log(`接続失敗: ${error.message}`, 'error');
      this.updateStatus(`接続失敗: ${error.message}`, 'red');
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.log(`${this.reconnectDelay/1000}秒後に再接続を試行... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warn');
      this.updateStatus(`再接続待機... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'orange');

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      this.log('最大再接続試行回数に達しました', 'error');
      this.updateStatus('再接続失敗', 'red');
    }
  }

  sendTestMessage() {
    if (this.isConnected && this.socket) {
      const testMessage = {
        type: 'game:request_state',
        payload: {},
        timestamp: new Date().toISOString()
      };

      this.socket.send(JSON.stringify(testMessage));
      this.log('テストメッセージを送信: game:request_state', 'info');
    }
  }

  handleMessage(data) {
    const { type, payload, timestamp } = data;

    this.log(`受信: ${type}`, 'success');

    switch (type) {
      case 'game:state':
        this.handleGameState(payload);
        break;

      case 'game:update':
        this.handleGameUpdate(payload);
        break;

      case 'challenge:loaded':
        this.log(`チャレンジが読み込まれました: ${payload.id}`, 'success');
        break;

      case 'score:updated':
        this.handleScoreUpdate(payload);
        break;

      default:
        this.log(`未知のメッセージタイプ: ${type}`, 'warn');
    }
  }

  handleGameState(state) {
    this.log(`ゲーム状態: スコア=${state.score}, ボール数=${state.balls_hit}, 時間=${state.game_time}`, 'info');
  }

  handleGameUpdate(state) {
    // ゲーム状態更新の処理
    if (state.score !== undefined) {
      this.log(`スコア更新: ${state.score}`, 'info');
    }
  }

  handleScoreUpdate(data) {
    this.log(`スコア更新: ${data.score} (ヒット: ${data.ballsHit}, 時間: ${data.gameTime}秒)`, 'success');
  }

  // テスト用のメソッド
  sendTestChallenge() {
    if (this.isConnected && this.socket) {
      const challengeData = {
        type: 'challenge:load',
        payload: {
          id: 'test-challenge-1',
          name: 'テストチャレンジ',
          objectives: ['スコア100点を達成'],
          gameModifiers: {
            ballSpeed: 1.2,
            paddleSize: 0.8
          }
        },
        timestamp: new Date().toISOString()
      };

      this.socket.send(JSON.stringify(challengeData));
      this.log('テストチャレンジを送信', 'info');
    }
  }

  sendTestDifficulty() {
    if (this.isConnected && this.socket) {
      const difficultyData = {
        type: 'difficulty:update',
        payload: {
          level: 3
        },
        timestamp: new Date().toISOString()
      };

      this.socket.send(JSON.stringify(difficultyData));
      this.log('難易度設定を送信: レベル3', 'info');
    }
  }
}

// グローバル関数（テスト用）
window.sendTestChallenge = function() {
  if (window.wsTestClient) {
    window.wsTestClient.sendTestChallenge();
  }
};

window.sendTestDifficulty = function() {
  if (window.wsTestClient) {
    window.wsTestClient.sendTestDifficulty();
  }
};

// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
  window.wsTestClient = new WebSocketTestClient();

  // テスト用のコントロールボタンを追加
  const controlsDiv = document.createElement('div');
  controlsDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 5px;
        z-index: 10000;
    `;
  controlsDiv.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">WebSocket Test Controls</h4>
        <button onclick="sendTestChallenge()">Send Test Challenge</button><br><br>
        <button onclick="sendTestDifficulty()">Send Test Difficulty</button><br><br>
        <button onclick="window.wsTestClient.sendTestMessage()">Request Game State</button>
    `;
  document.body.appendChild(controlsDiv);
});

console.log('WebSocket Test Client スクリプトが読み込まれました');
