// WebSocket + ChallengeGenerator 統合テスト
const { test, expect } = require('@playwright/test');

// モックWebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.sentMessages = [];

    // 接続をシミュレート
    this.connectionTimer = setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1000, reason: 'Normal closure' });
    }
  }

  simulateError() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onerror) {
      this.onerror(new Error('Connection failed'));
    }
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1006, reason: 'Abnormal closure' });
    }
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ type: 'message', data: JSON.stringify(data) });
    }
  }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// 統合テスト用の簡略化されたシステム
class WebSocketChallengeIntegration {
  constructor() {
    this.websocket = null;
    this.challengeManager = null;
    this.connectionStatus = 'disconnected';
    this.initializationLog = [];
  }

  async initializeWebSocketConnection() {
    this.initializationLog.push('initializeWebSocketConnection called');

    try {
      this.updateConnectionStatus('connecting');

      // WebSocket接続を確立
      this.websocket = new MockWebSocket('ws://localhost:8765');

      this.websocket.onopen = () => {
        this.updateConnectionStatus('connected');
        this.initializeChallengeManager();
      };

      this.websocket.onerror = (error) => {
        this.updateConnectionStatus('disconnected');
        // オフラインモードでチャレンジマネージャーを初期化
        this.initializeChallengeManager();
      };

      this.websocket.onclose = () => {
        this.updateConnectionStatus('disconnected');
      };

    } catch (error) {
      this.updateConnectionStatus('disconnected');
      this.initializeChallengeManager();
    }
  }

  updateConnectionStatus(status) {
    this.connectionStatus = status;
    this.initializationLog.push(`Connection status: ${status}`);
  }

  initializeChallengeManager() {
    if (this.challengeManager) {
      this.initializationLog.push('ChallengeManager already initialized');
      return;
    }

    // ChallengeGeneratorのモック
    this.challengeManager = {
      generateWeeklyChallenge: (date) => ({
        type: 'score',
        target: 1000,
        difficulty: 'basic'
      })
    };

    this.initializationLog.push('ChallengeManager initialized');
  }

  startChallenge(type, params) {
    this.initializationLog.push(`startChallenge: ${type}`);

    if (this.websocket && this.websocket.readyState === MockWebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'challenge_start',
        challenge: { type, params }
      }));
      return true;
    }
    return false;
  }
}

test.describe('WebSocket-Challenge Integration Tests', () => {
  let integration;

  test.beforeEach(() => {
    integration = new WebSocketChallengeIntegration();
  });

  test('WebSocket接続後にチャレンジマネージャーが初期化される', async () => {
    await integration.initializeWebSocketConnection();

    // WebSocket接続を待つ
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(integration.connectionStatus).toBe('connected');
    expect(integration.challengeManager).toBeDefined();
    expect(integration.initializationLog).toContain('ChallengeManager initialized');
  });

  test('オフラインモードでもチャレンジマネージャーが初期化される', async () => {
    // WebSocketエラーをシミュレート
    const originalWebSocket = MockWebSocket;
    global.MockWebSocket = class FailingWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this.errorTimer = setTimeout(() => this.simulateError(), 5);
      }

      close() {
        if (this.errorTimer) {
          clearTimeout(this.errorTimer);
          this.errorTimer = null;
        }
        super.close();
      }
    };

    integration.websocket = null;
    await integration.initializeWebSocketConnection();

    // エラー処理を待つ
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(integration.connectionStatus).toBe('disconnected');
    expect(integration.challengeManager).toBeDefined();
    expect(integration.initializationLog).toContain('ChallengeManager initialized');

    global.MockWebSocket = originalWebSocket;
  });

  test('チャレンジ開始メッセージがWebSocket経由で送信される', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    const sent = integration.startChallenge('high_score', { target: 100 });

    expect(sent).toBe(true);
    expect(integration.websocket.sentMessages).toHaveLength(1);

    const message = JSON.parse(integration.websocket.sentMessages[0]);
    expect(message).toEqual({
      type: 'challenge_start',
      challenge: {
        type: 'high_score',
        params: { target: 100 }
      }
    });
  });

  test('WebSocket切断後もチャレンジ機能が動作する', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    // 接続確立を確認
    expect(integration.connectionStatus).toBe('connected');

    // WebSocket切断
    integration.websocket.close();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(integration.connectionStatus).toBe('disconnected');

    // チャレンジマネージャーは引き続き利用可能
    expect(integration.challengeManager).toBeDefined();
    const challenge = integration.challengeManager.generateWeeklyChallenge(new Date());
    expect(challenge).toBeDefined();
    expect(challenge.type).toBe('score');
  });

  test('重複した初期化呼び出しでも問題ない', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    const firstManager = integration.challengeManager;

    // 再度初期化を試みる
    integration.initializeChallengeManager();

    expect(integration.challengeManager).toBe(firstManager);
    expect(integration.initializationLog.filter(
      log => log === 'ChallengeManager already initialized'
    )).toHaveLength(1);
  });

  test('接続状態の遷移が正しく記録される', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(integration.initializationLog).toContain('Connection status: connecting');
    expect(integration.initializationLog).toContain('Connection status: connected');
  });

  test('WebSocket未接続時のチャレンジ開始は失敗する', async () => {
    // WebSocketを初期化せずにチャレンジ開始を試みる
    const sent = integration.startChallenge('time_limit', { limit: 30 });

    expect(sent).toBe(false);
    expect(integration.initializationLog).toContain('startChallenge: time_limit');
  });

  test('WebSocketメッセージ受信の処理', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    let receivedMessage = null;
    integration.websocket.onmessage = (event) => {
      receivedMessage = JSON.parse(event.data);
    };

    // サーバーからのメッセージをシミュレート
    integration.websocket.simulateMessage({
      type: 'challenge_update',
      data: { progress: 50 }
    });

    expect(receivedMessage).toEqual({
      type: 'challenge_update',
      data: { progress: 50 }
    });
  });

  test('エラーリカバリー後の再接続', async () => {
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    // エラーをシミュレート
    integration.websocket.simulateError();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(integration.connectionStatus).toBe('disconnected');

    // 再接続を試みる
    await integration.initializeWebSocketConnection();
    await new Promise(resolve => setTimeout(resolve, 20));

    // 新しい接続が確立される
    expect(integration.connectionStatus).toBe('connected');
    expect(integration.websocket.readyState).toBe(MockWebSocket.OPEN);
  });
});
