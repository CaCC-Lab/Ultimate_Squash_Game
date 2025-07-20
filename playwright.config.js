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
  
  // 並列実行設定
  fullyParallel: true,
  
  // 失敗時のリトライ
  retries: process.env.CI ? 2 : 0,
  
  // ワーカー数（CI環境では控えめに）
  workers: process.env.CI ? 2 : undefined,
  
  // レポーター
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // 共通設定
  use: {
    // ベースURL（HTTPサーバー用）
    baseURL: 'http://localhost:3000',
    
    // 失敗時のスクリーンショット
    screenshot: 'only-on-failure',
    
    // 失敗時のビデオ
    video: 'retain-on-failure',
    
    // トレース（デバッグ用）
    trace: 'on-first-retry',
    
    // タイムアウト設定
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // ヘッドレスモード（デバッグ時はfalse）
    headless: true,
  },
  
  // テストタイムアウト（Pyodide初期化に時間がかかるため延長）
  timeout: 90000, // 90秒

  // プロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // WebSocket対応の設定
        launchOptions: {
          args: ['--disable-web-security', '--allow-running-insecure-content']
        }
      },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // モバイル対応テスト
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // タッチ操作対応
        hasTouch: true,
        isMobile: true
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true
      },
    },
    
    // ネットワーク条件テスト専用プロジェクト
    {
      name: 'network-conditions',
      testMatch: ['**/network-conditions.spec.js', '**/network-performance.spec.js'],
      use: { 
        ...devices['Desktop Chrome'],
        // ネットワークテスト用の設定
        launchOptions: {
          args: [
            '--disable-web-security', 
            '--allow-running-insecure-content',
            '--disable-features=NetworkService', // ネットワーク制御のため
          ]
        },
        // 長いタイムアウト設定（ネットワーク遅延を考慮）
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
      timeout: 120000, // 2分（ネットワーク条件テスト用）
    },
  ],

  // 出力ディレクトリ
  outputDir: 'test-results/',
  
  // グローバルセットアップ（WebSocketサーバー起動）
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  
  // 期待値設定
  expect: {
    // WebSocketの応答を考慮したタイムアウト
    timeout: 5000,
  },
  
  // WebSocketサーバーとHTTPサーバーの連携
  webServer: [
    {
      command: 'python src/websocket_server.py',
      port: 8765,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        'SDL_VIDEODRIVER': 'dummy',  // ヘッドレスPygame
      },
      // ポート競合時の自動リトライ
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'python -m http.server 3000',
      port: 3000,
      timeout: 10000,
      reuseExistingServer: !process.env.CI,
      cwd: '.',
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});