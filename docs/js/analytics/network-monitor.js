/**
 * ネットワーク状態監視システム
 * オンライン/オフライン状態の監視、接続品質の測定、診断情報の提供
 */

class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionInfo = this.getConnectionInfo();
    this.metrics = {
      latency: 0,
      bandwidth: 0,
      packetLoss: 0,
      jitter: 0
    };
    this.statusElement = null;
    this.callbacks = {
      online: [],
      offline: [],
      degraded: []
    };

    this.initialize();
  }

  /**
   * ネットワーク監視システムを初期化
   */
  initialize() {
    // オンライン/オフラインイベントリスナーを設定
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Connection APIの変更を監視
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => this.handleConnectionChange());
    }

    // 定期的な接続品質チェック
    setInterval(() => this.measureConnectionQuality(), 30000); // 30秒間隔

    // 初期測定
    this.measureConnectionQuality();

    // ステータス表示エリアを作成
    this.createStatusDisplay();
  }

  /**
   * ステータス表示UIを作成
   */
  createStatusDisplay() {
    // 既存の要素をチェック
    this.statusElement = document.getElementById('network-status');

    if (!this.statusElement) {
      this.statusElement = document.createElement('div');
      this.statusElement.id = 'network-status';
      this.statusElement.className = 'network-status';
      this.statusElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(this.statusElement);
    }

    this.updateStatusDisplay();
  }

  /**
   * ステータス表示を更新
   */
  updateStatusDisplay() {
    if (!this.statusElement) return;

    let statusText = '';
    let className = 'network-status';
    let backgroundColor = '';

    if (!this.isOnline) {
      statusText = 'オフライン';
      className += ' offline';
      backgroundColor = '#ff4444';
    } else if (this.isConnectionDegraded()) {
      statusText = `低速 (${this.getConnectionDescription()})`;
      className += ' degraded';
      backgroundColor = '#ff8800';
    } else {
      statusText = `オンライン (${this.getConnectionDescription()})`;
      className += ' online';
      backgroundColor = '#44aa44';
    }

    this.statusElement.textContent = statusText;
    this.statusElement.className = className;
    this.statusElement.style.backgroundColor = backgroundColor;
    this.statusElement.style.color = 'white';
  }

  /**
   * 接続情報を取得
   */
  getConnectionInfo() {
    if (!navigator.connection) {
      return {
        effectiveType: 'unknown',
        downlink: undefined,
        rtt: undefined
      };
    }

    return {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    };
  }

  /**
   * 接続の説明文を生成
   */
  getConnectionDescription() {
    const conn = this.connectionInfo;

    if (conn.effectiveType) {
      switch (conn.effectiveType) {
        case 'slow-2g':
          return '2G (低速)';
        case '2g':
          return '2G';
        case '3g':
          return '3G';
        case '4g':
          return '4G';
        default:
          return conn.effectiveType;
      }
    }

    if (this.metrics.latency > 0) {
      return `${this.metrics.latency}ms`;
    }

    return '不明';
  }

  /**
   * 接続が劣化しているかをチェック
   */
  isConnectionDegraded() {
    const conn = this.connectionInfo;

    // Connection APIによる判定
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return true;
    }

    if (conn.rtt && conn.rtt > 300) {
      return true;
    }

    if (conn.downlink && conn.downlink < 1.0) {
      return true;
    }

    // 測定値による判定
    if (this.metrics.latency > 500) {
      return true;
    }

    return false;
  }

  /**
   * 接続品質を測定
   */
  async measureConnectionQuality() {
    if (!this.isOnline) return;

    try {
      await this.measureLatency();
      await this.estimateBandwidth();
    } catch (error) {
      console.warn('接続品質測定エラー:', error);
    }
  }

  /**
   * レイテンシを測定
   */
  async measureLatency() {
    const samples = [];
    const iterations = 3;

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();

        // 小さなリソースを取得してレイテンシを測定
        const response = await fetch(window.location.origin + '/favicon.ico?' + Date.now(), {
          method: 'HEAD',
          cache: 'no-cache'
        });

        const endTime = performance.now();

        if (response.ok) {
          samples.push(endTime - startTime);
        }
      } catch (error) {
        // エラーは無視して続行
      }

      // 測定間隔
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (samples.length > 0) {
      this.metrics.latency = Math.round(samples.reduce((a, b) => a + b) / samples.length);
    }
  }

  /**
   * 帯域幅を推定
   */
  async estimateBandwidth() {
    try {
      const startTime = performance.now();

      // 小さなテストファイルをダウンロード（実際の実装では適切なテストリソースを使用）
      const response = await fetch(window.location.origin + '/?bandwidth-test=' + Date.now(), {
        cache: 'no-cache'
      });

      const data = await response.blob();
      const endTime = performance.now();

      const duration = (endTime - startTime) / 1000; // 秒
      const sizeBytes = data.size;
      const bandwidthBps = sizeBytes / duration;

      this.metrics.bandwidth = Math.round(bandwidthBps / 1024); // KB/s
    } catch (error) {
      // エラーは無視
    }
  }

  /**
   * オンライン状態になった時の処理
   */
  handleOnline() {
    console.log('ネットワーク接続が復帰しました');
    this.isOnline = true;
    this.updateStatusDisplay();
    this.measureConnectionQuality();

    // コールバックを実行
    this.callbacks.online.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('オンラインコールバックエラー:', error);
      }
    });
  }

  /**
   * オフライン状態になった時の処理
   */
  handleOffline() {
    console.log('ネットワーク接続が切断されました');
    this.isOnline = false;
    this.updateStatusDisplay();

    // コールバックを実行
    this.callbacks.offline.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('オフラインコールバックエラー:', error);
      }
    });
  }

  /**
   * 接続状態変更時の処理
   */
  handleConnectionChange() {
    console.log('ネットワーク接続状態が変更されました');
    this.connectionInfo = this.getConnectionInfo();
    this.updateStatusDisplay();

    if (this.isConnectionDegraded()) {
      this.callbacks.degraded.forEach(callback => {
        try {
          callback(this.connectionInfo);
        } catch (error) {
          console.error('接続劣化コールバックエラー:', error);
        }
      });
    }
  }

  /**
   * イベントリスナーを追加
   */
  addEventListener(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * イベントリスナーを削除
   */
  removeEventListener(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  /**
   * 現在の診断情報を取得
   */
  getDiagnostics() {
    return {
      online: this.isOnline,
      connection: this.connectionInfo,
      metrics: { ...this.metrics },
      isDegraded: this.isConnectionDegraded(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 診断情報をJSON形式で出力
   */
  exportDiagnostics() {
    const diagnostics = this.getDiagnostics();
    const jsonString = JSON.stringify(diagnostics, null, 2);

    console.log('ネットワーク診断情報:', jsonString);
    return jsonString;
  }
}

// グローバル診断機能を追加
window.networkDiagnostics = {
  getInfo: function() {
    if (window.networkMonitor) {
      return window.networkMonitor.getDiagnostics();
    }

    return {
      online: navigator.onLine,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      timestamp: new Date().toISOString()
    };
  }
};

// ゲーム用ネットワーク適応システム
class GameNetworkAdapter {
  constructor(game) {
    this.game = game;
    this.networkMonitor = new NetworkMonitor();
    this.adaptationSettings = {
      offline: {
        enableOfflineMode: true,
        reducedFeatures: true
      },
      degraded: {
        reduceAnimations: true,
        lowerFrameRate: true,
        simplifyGraphics: true
      }
    };

    this.setupEventHandlers();
  }

  /**
   * イベントハンドラーを設定
   */
  setupEventHandlers() {
    // オフライン時の処理
    this.networkMonitor.addEventListener('offline', () => {
      this.adaptToOfflineMode();
    });

    // オンライン復帰時の処理
    this.networkMonitor.addEventListener('online', () => {
      this.adaptToOnlineMode();
    });

    // 接続劣化時の処理
    this.networkMonitor.addEventListener('degraded', (connectionInfo) => {
      this.adaptToSlowConnection(connectionInfo);
    });
  }

  /**
   * オフラインモードに適応
   */
  adaptToOfflineMode() {
    console.log('ゲームをオフラインモードに適応');

    // オフライン機能を有効化
    if (this.game && this.game.enableOfflineMode) {
      this.game.enableOfflineMode();
    }

    // UI通知
    this.showNotification('オフラインモードで動作中', 'warning');
  }

  /**
   * オンラインモードに復帰
   */
  adaptToOnlineMode() {
    console.log('ゲームをオンラインモードに復帰');

    // オンライン機能を復元
    if (this.game && this.game.enableOnlineMode) {
      this.game.enableOnlineMode();
    }

    // UI通知
    this.showNotification('オンライン接続が復帰しました', 'success');
  }

  /**
   * 低速接続に適応
   */
  adaptToSlowConnection(connectionInfo) {
    console.log('低速接続を検出、ゲーム設定を調整');

    // パフォーマンス設定を調整
    if (this.game && this.game.adjustPerformanceSettings) {
      this.game.adjustPerformanceSettings({
        reducedAnimations: true,
        lowerQuality: true
      });
    }

    // UI通知
    this.showNotification(`低速接続を検出 (${connectionInfo.effectiveType})`, 'info');
  }

  /**
   * 通知を表示
   */
  showNotification(message, type = 'info') {
    // 既存の通知システムがあれば使用、なければシンプルな実装
    if (window.showGameNotification) {
      window.showGameNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * 現在の適応状態を取得
   */
  getAdaptationStatus() {
    return {
      networkState: this.networkMonitor.isOnline ? 'online' : 'offline',
      isDegraded: this.networkMonitor.isConnectionDegraded(),
      diagnostics: this.networkMonitor.getDiagnostics()
    };
  }
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NetworkMonitor, GameNetworkAdapter };
}

// DOMContentLoaded時に自動初期化
document.addEventListener('DOMContentLoaded', () => {
  // グローバルネットワークモニターを作成
  window.networkMonitor = new NetworkMonitor();

  // ゲームオブジェクトが利用可能な場合は適応システムも初期化
  if (window.game) {
    window.gameNetworkAdapter = new GameNetworkAdapter(window.game);
  }
});
