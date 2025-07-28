/**
 * Configuration Loader Utility
 * 中央設定管理システム - ハードコーディングを排除
 */

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = 'config/app-config.json';
    this.defaultConfig = this.getDefaultConfig();
    this.loadPromise = null;
  }

  /**
     * デフォルト設定（フォールバック用）
     */
  getDefaultConfig() {
    return {
      game: {
        canvas: {
          width: 800,
          height: 600
        },
        audio: {
          frequency: 22050,
          size: -16,
          channels: 2,
          buffer: 512
        }
      },
      ai: {
        model: {
          default: 'mistral',
          fallback: 'gemma'
        },
        eventPolling: {
          interval: 500
        }
      },
      initialization: {
        pyodide: {
          timeout: {
            initial: 30000,
            checkInterval: 100
          }
        }
      },
      retry: {
        default: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          factor: 2
        }
      }
    };
  }

  /**
     * 設定ファイルを読み込む
     */
  async load() {
    // 既に読み込み中の場合は、その Promise を返す
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // 既に読み込み済みの場合
    if (this.config) {
      return this.config;
    }

    this.loadPromise = this._performLoad();
    return this.loadPromise;
  }

  /**
     * 実際の読み込み処理
     */
  async _performLoad() {
    try {
      const response = await fetch(this.configPath);
      if (!response.ok) {
        throw new Error(`Config file not found: ${response.status}`);
      }

      this.config = await response.json();
      console.log('[ConfigLoader] Configuration loaded successfully');

      // 環境変数による上書き
      this.applyEnvironmentOverrides();

      return this.config;
    } catch (error) {
      console.warn('[ConfigLoader] Failed to load config, using defaults:', error);
      this.config = this.defaultConfig;
      return this.config;
    }
  }

  /**
     * 環境変数による設定の上書き
     */
  applyEnvironmentOverrides() {
    // URLパラメータから設定を取得
    const params = new URLSearchParams(window.location.search);

    // デバッグモード
    if (params.has('debug')) {
      this.set('development.debugging.verboseMode', true);
    }

    // AIモデルの上書き
    if (params.has('aiModel')) {
      this.set('ai.model.default', params.get('aiModel'));
    }

    // CSPモードの上書き
    if (params.has('cspEnforce')) {
      this.set('security.csp.reportOnly', false);
    }
  }

  /**
     * ネストされたプロパティを取得
     * @param {string} path - ドット区切りのパス (例: 'ai.model.default')
     * @param {*} defaultValue - デフォルト値
     */
  get(path, defaultValue = null) {
    if (!this.config) {
      console.warn('[ConfigLoader] Config not loaded, using default config');
      this.config = this.defaultConfig;
    }

    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
     * ネストされたプロパティを設定
     * @param {string} path - ドット区切りのパス
     * @param {*} value - 設定する値
     */
  set(path, value) {
    if (!this.config) {
      this.config = this.defaultConfig;
    }

    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
     * 設定全体を取得
     */
  getAll() {
    return this.config || this.defaultConfig;
  }

  /**
     * 特定のセクションを取得
     * @param {string} section - セクション名 (例: 'ai', 'game')
     */
  getSection(section) {
    return this.get(section, {});
  }

  /**
     * リトライ設定を取得
     * @param {string} context - コンテキスト ('default', 'pyodideInit', 'networkRequests')
     */
  getRetryConfig(context = 'default') {
    const retryConfig = this.get(`retry.${context}`, this.get('retry.default'));
    return {
      maxRetries: retryConfig.maxRetries || 3,
      initialDelay: retryConfig.initialDelay || 1000,
      maxDelay: retryConfig.maxDelay || 10000,
      factor: retryConfig.factor || 2,
      jitterPercent: retryConfig.jitterPercent || 0.3
    };
  }

  /**
     * AI設定を取得
     */
  getAIConfig() {
    return {
      model: this.get('ai.model.default', 'mistral'),
      fallbackModel: this.get('ai.model.fallback', 'gemma'),
      commentaryEnabled: this.get('ai.commentary.enabled', true),
      commentaryInterval: this.get('ai.commentary.minInterval', 5000),
      cacheExpiry: this.get('ai.commentary.cacheExpiry', 30000),
      language: this.get('ai.commentary.language', 'ja'),
      adaEnabled: this.get('ai.ada.enabled', true),
      adaInterval: this.get('ai.ada.adjustmentInterval', 10000),
      eventPollingInterval: this.get('ai.eventPolling.interval', 500)
    };
  }

  /**
     * キャンバス設定を取得
     */
  getCanvasConfig() {
    return {
      width: this.get('game.canvas.width', 800),
      height: this.get('game.canvas.height', 600),
      style: this.get('game.canvas.style', {})
    };
  }

  /**
     * Pyodide設定を取得
     */
  getPyodideConfig() {
    return {
      version: this.get('initialization.pyodide.version', '0.26.4'),
      indexURL: this.get('initialization.pyodide.indexURL'),
      timeout: this.get('initialization.pyodide.timeout.initial', 30000),
      checkInterval: this.get('initialization.pyodide.timeout.checkInterval', 100),
      packages: this.get('initialization.pyodide.packages', {})
    };
  }
}

// シングルトンインスタンスを作成
const configLoader = new ConfigLoader();

// グローバルに公開
window.configLoader = configLoader;

// 自動読み込み（ページロード時）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    configLoader.load().catch(console.error);
  });
} else {
  configLoader.load().catch(console.error);
}

// エクスポート（ES6モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfigLoader, configLoader };
}
