/**
 * テスト設定ファイル
 * ハードコーディングされたURL/パスを一元管理
 */

const TEST_CONFIG = {
    // ベースURL設定
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // ページパス設定
    PAGES: {
        GAME: '/docs/game.html',
        METRICS_DEMO: '/docs/js/optimization/metrics-demo.html',
        RANKING: '/docs/js/ranking/ranking.html'
    },
    
    // タイムアウト設定
    TIMEOUTS: {
        DEFAULT: 30000,
        SHORT: 10000,
        LONG: 60000,
        GAME_LOAD: 45000
    },
    
    // メトリクス設定
    METRICS: {
        COLLECTION_WAIT: 3000,
        PERSISTENCE_WAIT: 2000,
        QUERY_WAIT: 1000
    },
    
    // ブラウザ設定
    BROWSERS: {
        CHROMIUM: 'chromium',
        FIREFOX: 'firefox',
        WEBKIT: 'webkit'
    },
    
    // ネットワーク設定
    NETWORK: {
        SLOW_3G: {
            offline: false,
            downloadThroughput: 500 * 1024 / 8,
            uploadThroughput: 500 * 1024 / 8,
            latency: 400
        },
        FAST_3G: {
            offline: false,
            downloadThroughput: 1.6 * 1024 * 1024 / 8,
            uploadThroughput: 750 * 1024 / 8,
            latency: 150
        }
    }
};

// ヘルパー関数
TEST_CONFIG.getPageUrl = function(pageName) {
    const path = this.PAGES[pageName];
    if (!path) {
        throw new Error(`Unknown page: ${pageName}`);
    }
    return `${this.BASE_URL}${path}`;
};

TEST_CONFIG.getTimeout = function(type = 'DEFAULT') {
    return this.TIMEOUTS[type] || this.TIMEOUTS.DEFAULT;
};

module.exports = TEST_CONFIG;