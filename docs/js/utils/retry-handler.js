/**
 * リトライハンドラーユーティリティ
 * Exponential Backoff with Jitterパターンの実装
 */

class RetryHandler {
  /**
     * リトライ処理を実行
     * @param {Function} fn - 実行する関数
     * @param {Object} options - オプション設定
     * @param {number} options.maxRetries - 最大リトライ回数（デフォルト: 3）
     * @param {number} options.initialDelay - 初期待機時間（ミリ秒、デフォルト: 1000）
     * @param {number} options.maxDelay - 最大待機時間（ミリ秒、デフォルト: 10000）
     * @param {number} options.factor - 指数関数的増加の係数（デフォルト: 2）
     * @param {Function} options.onRetry - リトライ時のコールバック
     * @param {Function} options.shouldRetry - リトライすべきかの判定関数
     * @returns {Promise} 実行結果
     */
  static async execute(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      factor = 2,
      onRetry = null,
      shouldRetry = () => true
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 最後の試行またはリトライ不要な場合はエラーをスロー
        if (attempt === maxRetries || !shouldRetry(error, attempt)) {
          throw error;
        }

        // リトライコールバックを実行
        if (onRetry) {
          onRetry(error, attempt + 1, delay);
        }

        // Exponential Backoff with Jitter
        const jitter = Math.random() * 0.3 * delay; // 最大30%のジッター
        const waitTime = Math.min(delay + jitter, maxDelay);

        await this.sleep(waitTime);

        // 次回の遅延時間を計算
        delay = Math.min(delay * factor, maxDelay);
      }
    }

    throw lastError;
  }

  /**
     * 指定時間待機
     * @param {number} ms - 待機時間（ミリ秒）
     * @returns {Promise}
     */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
     * ネットワークエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean}
     */
  static isNetworkError(error) {
    return error.name === 'NetworkError' ||
               error.name === 'TimeoutError' ||
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.message.includes('fetch');
  }

  /**
     * 一時的なエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean}
     */
  static isTransientError(error) {
    return this.isNetworkError(error) ||
               error.message.includes('temporarily unavailable') ||
               error.message.includes('rate limit') ||
               error.code === 'ETIMEDOUT' ||
               error.code === 'ECONNRESET';
  }
}

/**
 * デコレーター: メソッドにリトライ機能を追加
 * @param {Object} options - RetryHandler.executeと同じオプション
 */
function withRetry(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      return RetryHandler.execute(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

// グローバルに公開
window.RetryHandler = RetryHandler;
window.withRetry = withRetry;
