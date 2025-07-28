/**
 * 実環境E2Eテスト実行設定
 * CLAUDE.mdの「モック禁止」ガイドラインに準拠したテスト実行環境
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ（実環境テストのみ）
  testDir: './tests/e2e',

  // 実環境テストのパターン
  testMatch: [
    'real-browser-comprehensive.spec.js',
    'game-flow-real-environment.spec.js',
    'sound-system.spec.js',
    'websocket-comprehensive.spec.js',
    'weekly-challenge-integration.spec.js'
  ],

  // 実環境でのタイムアウト設定（長めに設定）
  timeout: 120000, // 2分
  expect: {
    timeout: 30000 // 30秒
  },

  // 並列実行設定（実環境では慎重に）
  fullyParallel: false,
  workers: 1, // 実環境テストは順次実行

  // リトライ設定
  retries: process.env.CI ? 2 : 1,

  // レポート設定
  reporter: [
    ['html', { outputFolder: 'test-results/real-environment-report' }],
    ['json', { outputFile: 'test-results/real-environment-results.json' }],
    ['junit', { outputFile: 'test-results/real-environment-junit.xml' }],
    ['line']
  ],

  // グローバル設定（実環境向け）
  use: {
    // 実際のブラウザ操作をシミュレート
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'retain-on-failure',

    // トレース（リトライ時のみ）
    trace: 'retain-on-failure',

    // ブラウザコンテキスト設定
    ignoreHTTPSErrors: true,

    // 実環境でのネットワーク設定
    offline: false,

    // 実際のユーザーエージェント
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },

  // 実環境テスト用ブラウザプロジェクト
  projects: [
    {
      name: 'chromium-real-env',
      use: {
        ...devices['Desktop Chrome'],
        // Web Audio API対応
        contextOptions: {
          bypassCSP: false,
          permissions: ['microphone', 'camera']
        },
        // WebSocketテスト用
        ignoreHTTPSErrors: true
      },
      testMatch: [
        'real-browser-comprehensive.spec.js',
        'game-flow-real-environment.spec.js',
        'sound-system.spec.js'
      ]
    },

    {
      name: 'firefox-real-env',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          bypassCSP: false,
          permissions: ['microphone', 'camera']
        }
      },
      testMatch: [
        'real-browser-comprehensive.spec.js',
        'sound-system.spec.js'
      ]
    },

    {
      name: 'webkit-real-env',
      use: {
        ...devices['Desktop Safari'],
        contextOptions: {
          bypassCSP: false,
          permissions: ['microphone', 'camera']
        }
      },
      testMatch: [
        'real-browser-comprehensive.spec.js',
        'sound-system.spec.js'
      ]
    },

    // WebSocket専用テスト
    {
      name: 'websocket-tests',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          bypassCSP: false
        }
      },
      testMatch: [
        'websocket-comprehensive.spec.js'
      ]
    },

    // 週間チャレンジシステム専用テスト
    {
      name: 'challenge-system-tests',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          bypassCSP: false
        }
      },
      testMatch: [
        'weekly-challenge-integration.spec.js'
      ]
    },

    // モバイル実環境テスト
    {
      name: 'mobile-chrome-real',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          bypassCSP: false,
          permissions: ['microphone', 'camera']
        }
      },
      testMatch: [
        'game-flow-real-environment.spec.js'
      ]
    },

    {
      name: 'mobile-safari-real',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          bypassCSP: false,
          permissions: ['microphone', 'camera']
        }
      },
      testMatch: [
        'game-flow-real-environment.spec.js'
      ]
    }
  ],

  // 実環境テスト用のWebサーバー設定
  webServer: {
    command: 'npm run start', // 実際のサーバーを起動
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000 // 2分でタイムアウト
  },

  // グローバルセットアップ・ティアダウン
  globalSetup: require.resolve('./global-setup-real-env.js'),
  globalTeardown: require.resolve('./global-teardown-real-env.js')
});

// 実環境テスト実行コマンド用のスクリプト
export const testCommands = {
  // 全実環境テスト実行
  runAllRealTests: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js',

  // ブラウザ別実行
  runChromeReal: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=chromium-real-env',
  runFirefoxReal: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=firefox-real-env',
  runSafariReal: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=webkit-real-env',

  // 機能別実行
  runWebSocketTests: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=websocket-tests',
  runChallengeTests: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=challenge-system-tests',

  // モバイル実行
  runMobileReal: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --project=mobile-chrome-real --project=mobile-safari-real',

  // ヘッドフルモード（実際のブラウザ表示）
  runWithBrowser: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --headed',

  // デバッグモード
  runDebug: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --debug',

  // UI モード
  runUI: 'npx playwright test --config=tests/e2e/real-environment-test-runner.js --ui'
};
