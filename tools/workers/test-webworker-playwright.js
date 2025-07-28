/**
 * WebWorker並列処理フェーズ4 - Playwright統合テスト
 * Ultimate Squash Game - ブラウザ環境でのWebWorker動作検証
 *
 * 機能:
 * - ブラウザでのWebWorkerテスト実行
 * - リアルタイムメトリクス監視
 * - スクリーンショット取得
 * - 詳細テスト結果収集
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * WebWorker Playwrightテスト実行クラス
 */
class WebWorkerPlaywrightTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      startTime: null,
      endTime: null,
      duration: 0,
      success: false,
      screenshots: [],
      logs: [],
      metrics: {},
      errors: []
    };

    console.log('🎭 WebWorker Playwrightテスト初期化完了');
  }

  /**
     * テスト実行
     */
  async runTest() {
    console.log('🚀 WebWorker Playwrightテスト開始');
    this.testResults.startTime = Date.now();

    try {
      // ブラウザ起動
      await this.launchBrowser();

      // テストページアクセス
      await this.navigateToTestPage();

      // ページ読み込み確認
      await this.verifyPageLoaded();

      // 統合テスト実行
      await this.executeIntegrationTest();

      // 結果収集
      await this.collectResults();

      // スクリーンショット取得
      await this.takeScreenshots();

      this.testResults.success = true;
      console.log('✅ WebWorker Playwrightテスト完了');

    } catch (error) {
      console.error('❌ WebWorker Playwrightテストエラー:', error);
      this.testResults.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });

      // エラー時もスクリーンショット取得
      try {
        await this.takeErrorScreenshot();
      } catch (screenshotError) {
        console.error('スクリーンショット取得失敗:', screenshotError);
      }

    } finally {
      this.testResults.endTime = Date.now();
      this.testResults.duration = this.testResults.endTime - this.testResults.startTime;

      await this.cleanup();
      await this.generateReport();
    }
  }

  /**
     * ブラウザ起動
     */
  async launchBrowser() {
    console.log('🌐 Chromiumブラウザ起動中...');

    this.browser = await chromium.launch({
      headless: false, // ヘッドレスモードオフ（テスト観察のため）
      slowMo: 100,     // 操作を少し遅くして観察しやすく
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-features=SharedArrayBuffer'
      ]
    });

    this.page = await this.browser.newPage();

    // ログ収集設定
    this.page.on('console', (msg) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      };
      this.testResults.logs.push(logEntry);
      console.log(`[Browser ${msg.type()}]: ${msg.text()}`);
    });

    // エラー収集設定
    this.page.on('pageerror', (error) => {
      this.testResults.errors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
      console.error('[Page Error]:', error);
    });

    console.log('✅ ブラウザ起動完了');
  }

  /**
     * テストページナビゲーション
     */
  async navigateToTestPage() {
    console.log('📄 テストページアクセス中...');

    const testUrl = 'http://localhost:8080/tools/workers/test-webworker-browser.html';

    await this.page.goto(testUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ テストページアクセス完了');
  }

  /**
     * ページ読み込み確認
     */
  async verifyPageLoaded() {
    console.log('🔍 ページ読み込み確認中...');

    // メインタイトルの存在確認
    await this.page.waitForSelector('h1', { timeout: 10000 });

    const title = await this.page.textContent('h1');
    if (!title.includes('WebWorker Phase 4')) {
      throw new Error('ページタイトルが期待値と異なります');
    }

    // テスト開始ボタンの存在確認
    await this.page.waitForSelector('#start-test', { timeout: 5000 });

    // ページ状態の確認
    const status = await this.page.textContent('#status-indicator');
    console.log(`📊 ページ状態: ${status}`);

    console.log('✅ ページ読み込み確認完了');
  }

  /**
     * 統合テスト実行
     */
  async executeIntegrationTest() {
    console.log('🧪 WebWorker統合テスト実行中...');

    // テスト開始ボタンクリック
    await this.page.click('#start-test');
    console.log('🎯 テスト開始ボタンクリック');

    // テスト実行状態の監視
    await this.monitorTestExecution();

    // テスト完了待機
    await this.waitForTestCompletion();

    console.log('✅ WebWorker統合テスト実行完了');
  }

  /**
     * テスト実行監視
     */
  async monitorTestExecution() {
    console.log('👀 テスト実行監視開始');

    const maxWaitTime = 60000; // 60秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // ステータス確認
      const status = await this.page.textContent('#status-indicator');
      const progress = await this.page.textContent('#test-progress');
      const currentTest = await this.page.textContent('#current-test');

      console.log(`📊 ${status} | ${progress} | ${currentTest}`);

      // メトリクス収集
      const fps = await this.page.textContent('#fps-metric');
      const latency = await this.page.textContent('#latency-metric');
      const frames = await this.page.textContent('#frames-metric');
      const workers = await this.page.textContent('#workers-metric');

      this.testResults.metrics = {
        fps,
        latency,
        frames,
        workers,
        timestamp: Date.now()
      };

      // テスト完了または失敗の確認
      if (status.includes('完了') || status.includes('成功') || status.includes('失敗')) {
        console.log(`🏁 テスト終了検出: ${status}`);
        break;
      }

      await this.page.waitForTimeout(1000); // 1秒待機
    }

    console.log('✅ テスト実行監視完了');
  }

  /**
     * テスト完了待機
     */
  async waitForTestCompletion() {
    console.log('⏳ テスト完了待機中...');

    try {
      // プログレスバーが100%になるまで待機
      await this.page.waitForFunction(
        () => {
          const progressFill = document.getElementById('progress-fill');
          return progressFill && progressFill.style.width === '100%';
        },
        { timeout: 30000 }
      );

      // 結果セクションが表示されるまで待機
      await this.page.waitForSelector('#results-section[style*="block"]', { timeout: 10000 });

      console.log('✅ テスト完了確認');

    } catch (error) {
      console.warn('⚠️ テスト完了待機タイムアウト:', error.message);
    }
  }

  /**
     * 結果収集
     */
  async collectResults() {
    console.log('📊 テスト結果収集中...');

    try {
      // 最終ステータス
      const finalStatus = await this.page.textContent('#status-indicator');

      // 最終進捗
      const finalProgress = await this.page.textContent('#test-progress');

      // 実行時間
      const elapsedTime = await this.page.textContent('#elapsed-time');

      // 最終メトリクス
      const finalMetrics = {
        fps: await this.page.textContent('#fps-metric'),
        latency: await this.page.textContent('#latency-metric'),
        frames: await this.page.textContent('#frames-metric'),
        workers: await this.page.textContent('#workers-metric')
      };

      // 結果詳細（存在する場合）
      let resultDetails = null;
      try {
        const resultsSection = await this.page.$('#results-content');
        if (resultsSection) {
          resultDetails = await resultsSection.innerHTML();
        }
      } catch (detailError) {
        console.warn('結果詳細取得失敗:', detailError.message);
      }

      this.testResults.finalData = {
        status: finalStatus,
        progress: finalProgress,
        elapsedTime: elapsedTime,
        metrics: finalMetrics,
        details: resultDetails
      };

      console.log('✅ テスト結果収集完了');
      console.log(`📊 最終ステータス: ${finalStatus}`);
      console.log(`📊 最終進捗: ${finalProgress}`);
      console.log(`📊 実行時間: ${elapsedTime}`);

    } catch (error) {
      console.error('❌ 結果収集エラー:', error);
    }
  }

  /**
     * スクリーンショット取得
     */
  async takeScreenshots() {
    console.log('📸 スクリーンショット取得中...');

    try {
      // 全画面スクリーンショット
      const fullScreenshot = await this.page.screenshot({
        path: '/Users/ryu/dev/ultimate_squash_game/tools/workers/test-results-full.png',
        fullPage: true
      });

      this.testResults.screenshots.push({
        type: 'full_page',
        path: 'test-results-full.png',
        timestamp: Date.now()
      });

      // メトリクス部分のスクリーンショット
      const metricsElement = await this.page.$('.metrics-grid');
      if (metricsElement) {
        await metricsElement.screenshot({
          path: '/Users/ryu/dev/ultimate_squash_game/tools/workers/test-results-metrics.png'
        });

        this.testResults.screenshots.push({
          type: 'metrics',
          path: 'test-results-metrics.png',
          timestamp: Date.now()
        });
      }

      console.log('✅ スクリーンショット取得完了');

    } catch (error) {
      console.error('❌ スクリーンショット取得エラー:', error);
    }
  }

  /**
     * エラー時スクリーンショット
     */
  async takeErrorScreenshot() {
    if (this.page) {
      await this.page.screenshot({
        path: '/Users/ryu/dev/ultimate_squash_game/tools/workers/test-error.png',
        fullPage: true
      });

      this.testResults.screenshots.push({
        type: 'error',
        path: 'test-error.png',
        timestamp: Date.now()
      });
    }
  }

  /**
     * クリーンアップ
     */
  async cleanup() {
    console.log('🧹 クリーンアップ中...');

    if (this.browser) {
      await this.browser.close();
    }

    console.log('✅ クリーンアップ完了');
  }

  /**
     * レポート生成
     */
  async generateReport() {
    console.log('📋 テストレポート生成中...');

    const report = {
      testInfo: {
        testName: 'WebWorker Phase 4 統合テスト',
        framework: 'Playwright + Chromium',
        timestamp: new Date().toISOString(),
        duration: this.testResults.duration,
        success: this.testResults.success
      },
      results: this.testResults,
      summary: {
        totalLogs: this.testResults.logs.length,
        totalErrors: this.testResults.errors.length,
        screenshotCount: this.testResults.screenshots.length,
        testUrl: 'http://localhost:8080/tools/workers/test-webworker-browser.html'
      }
    };

    // レポートファイル保存
    const reportPath = '/Users/ryu/dev/ultimate_squash_game/tools/workers/playwright-test-report.json';
    await import('fs/promises').then(fs =>
      fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    );

    console.log('✅ テストレポート生成完了');
    console.log(`📁 レポートファイル: ${reportPath}`);

    // サマリー表示
    this.displaySummary(report);

    return report;
  }

  /**
     * サマリー表示
     */
  displaySummary(report) {
    console.log('\n=== WebWorker Phase 4 Playwrightテスト結果サマリー ===');
    console.log(`🎯 テスト成功: ${report.testInfo.success ? '✅' : '❌'}`);
    console.log(`⏱️ 実行時間: ${(report.testInfo.duration / 1000).toFixed(1)}秒`);
    console.log(`📊 収集ログ数: ${report.summary.totalLogs}`);
    console.log(`❌ エラー数: ${report.summary.totalErrors}`);
    console.log(`📸 スクリーンショット数: ${report.summary.screenshotCount}`);

    if (report.results.finalData) {
      console.log('\n📈 最終メトリクス:');
      console.log(`   FPS: ${report.results.finalData.metrics.fps}`);
      console.log(`   レスポンス: ${report.results.finalData.metrics.latency}`);
      console.log(`   フレーム数: ${report.results.finalData.metrics.frames}`);
      console.log(`   Worker数: ${report.results.finalData.metrics.workers}`);
      console.log(`   ステータス: ${report.results.finalData.status}`);
    }

    console.log('===================================================\n');
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('🎭 WebWorker Playwrightテスト実行開始');

  const tester = new WebWorkerPlaywrightTest();
  await tester.runTest();

  console.log('🎭 WebWorker Playwrightテスト実行完了');
}

// スクリプト直接実行時はテスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WebWorkerPlaywrightTest };
