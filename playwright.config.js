import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル - WebSocket統合ブラウザゲーム用
 *
 * 個人開発規約遵守:
 * - TDD必須: 失敗するテストから開始
 * - モック禁止: 実際のWebSocketサーバーと通信
 * - エラー3要素: 詳細なエラーレポート
 */

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // 無効化されたテストディレクトリを除外
  testIgnore: '**/disabled-complex/**',

  // シンプルな設定（並列実行を無効化してテスト安定化）
  fullyParallel: false,

  // リトライなし（問題を明確に特定するため）
  retries: 0,

  // ワーカー数を1に固定（安定性優先）
  workers: 1,

  // シンプルなレポーター
  reporter: [['list']],

  // 共通設定
  use: {
    // ベースURL（HTTPサーバー用）
    baseURL: 'http://localhost:3000',

    // 最小限のデバッグ設定
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',

    // 短いタイムアウト設定（快速フィードバック）
    actionTimeout: 5000,
    navigationTimeout: 10000,

    // ヘッドレスモード
    headless: true
  },

  // 短いテストタイムアウト（Gemini提案：10秒以内）
  timeout: 15000,

  // シンプルなプロジェクト設定（Chromiumのみ）
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security']
        }
      }
    }
  ],

  // 出力ディレクトリ
  outputDir: 'test-results/',

  // グローバルセットアップを無効化（安定化のため）
  // globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),

  // 期待値設定
  expect: {
    timeout: 3000
  },

  // シンプルなHTTPサーバーのみ（WebSocketサーバーは無効化）
  webServer: {
    command: 'python -m http.server 3000',
    port: 3000,
    timeout: 10000,
    reuseExistingServer: !process.env.CI
  }
});
