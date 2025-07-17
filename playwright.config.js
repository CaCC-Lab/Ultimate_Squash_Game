import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',
  
  // タイムアウト設定
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  // 並列実行
  fullyParallel: true,
  
  // 失敗時のリトライ
  retries: process.env.CI ? 2 : 0,
  
  // ワーカー数
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // 共通設定
  use: {
    // ベースURL（開発サーバー）
    baseURL: 'http://localhost:8000',
    
    // 失敗時のスクリーンショット
    screenshot: 'only-on-failure',
    
    // 失敗時のビデオ
    video: 'retain-on-failure',
    
    // トレース
    trace: 'on-first-retry',
    
    // ヘッドレスモード（デバッグ時はfalse）
    headless: true,
  },

  // ブラウザプロジェクト
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイル対応
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  // 開発サーバー設定
  webServer: {
    command: 'python3 -m http.server 8000',
    port: 8000,
    reuseExistingServer: !process.env.CI,
    cwd: './docs',
    timeout: 120 * 1000, // 2分のタイムアウト
  },
});