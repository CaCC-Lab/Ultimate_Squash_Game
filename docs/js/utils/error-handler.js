/**
 * 統一エラーハンドリングユーティリティ
 * what/why/how形式でのエラー情報の構造化
 */

export class ErrorHandler {
  /**
     * エラー情報の構造化
     * @param {Object} params - エラーパラメータ
     * @param {string} params.what - 何が起きたか
     * @param {string} params.why - なぜ起きたか
     * @param {string} params.how - どうすれば良いか
     * @param {Error} [params.originalError] - 元のエラーオブジェクト
     * @param {Object} [params.context] - 追加のコンテキスト情報
     * @returns {Error} 構造化されたエラー
     */
  static createError({ what, why, how, originalError, context = {} }) {
    const error = new Error(what);
    error.details = {
      what,
      why,
      how,
      timestamp: new Date().toISOString(),
      context
    };

    if (originalError) {
      error.originalError = originalError;
      error.stack = originalError.stack || error.stack;
    }

    return error;
  }

  /**
     * エラーのログ出力
     * @param {Error} error - エラーオブジェクト
     * @param {string} [level='error'] - ログレベル
     */
  static logError(error, level = 'error') {
    const details = error.details || {};
    const logData = {
      message: error.message,
      ...details,
      stack: error.stack
    };

    console[level]('🚨 Error Details:', logData);

    // 開発環境では詳細を表示
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Context');
      console.log('What:', details.what || error.message);
      console.log('Why:', details.why || 'Unknown reason');
      console.log('How:', details.how || 'No recovery suggestion');
      console.log('Context:', details.context || {});
      console.groupEnd();
    }
  }

  /**
     * 非同期エラーハンドラーラッパー
     * @param {Function} asyncFn - 非同期関数
     * @param {Object} errorInfo - エラー情報のテンプレート
     * @returns {Function} ラップされた関数
     */
  static wrapAsync(asyncFn, errorInfo = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const structuredError = ErrorHandler.createError({
          what: errorInfo.what || `Error in ${asyncFn.name || 'async function'}`,
          why: errorInfo.why || error.message,
          how: errorInfo.how || 'Check the error details and retry',
          originalError: error,
          context: { args }
        });

        ErrorHandler.logError(structuredError);
        throw structuredError;
      }
    };
  }

  /**
     * Promiseチェーンのエラーハンドラー
     * @param {Object} errorInfo - エラー情報のテンプレート
     * @returns {Function} エラーハンドラー関数
     */
  static handleCatch(errorInfo = {}) {
    return (error) => {
      const structuredError = ErrorHandler.createError({
        what: errorInfo.what || 'Operation failed',
        why: errorInfo.why || error.message,
        how: errorInfo.how || 'Please try again',
        originalError: error
      });

      ErrorHandler.logError(structuredError);
      throw structuredError;
    };
  }

  /**
     * リトライ可能なエラーかどうかの判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} リトライ可能かどうか
     */
  static isRetryable(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'NetworkError',
      'TimeoutError'
    ];

    return retryableErrors.some(type =>
      error.message.includes(type) ||
            error.code === type
    );
  }

  /**
     * ユーザー向けエラーメッセージの生成
     * @param {Error} error - エラーオブジェクト
     * @returns {string} ユーザー向けメッセージ
     */
  static getUserMessage(error) {
    if (error.details && error.details.how) {
      return error.details.how;
    }

    // デフォルトメッセージ
    const defaultMessages = {
      NetworkError: 'ネットワーク接続を確認してください',
      TimeoutError: '処理がタイムアウトしました。しばらく待ってから再試行してください',
      ValidationError: '入力内容を確認してください',
      AuthorizationError: 'アクセス権限がありません'
    };

    for (const [type, message] of Object.entries(defaultMessages)) {
      if (error.message.includes(type)) {
        return message;
      }
    }

    return '予期しないエラーが発生しました。しばらく待ってから再試行してください';
  }
}

// グローバルエラーハンドラーの設定
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = ErrorHandler.createError({
      what: 'Unhandled Promise Rejection',
      why: event.reason?.message || 'Unknown rejection reason',
      how: 'Check async error handling in the application',
      originalError: event.reason
    });

    ErrorHandler.logError(error);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const error = ErrorHandler.createError({
      what: 'Uncaught Error',
      why: event.error?.message || event.message,
      how: 'Check the error stack trace for debugging',
      originalError: event.error,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });

    ErrorHandler.logError(error);
  });
}

// CommonJS/ES6互換エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler };
}

export default ErrorHandler;
