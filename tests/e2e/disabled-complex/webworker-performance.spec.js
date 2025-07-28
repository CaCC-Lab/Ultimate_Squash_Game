/**
 * WebWorker Phase 4 パフォーマンステスト（Playwright E2E）
 * Ultimate Squash Game専用WebWorker並列処理パフォーマンス測定
 *
 * 目標値:
 * - FPS効率: 80%以上
 * - レスポンス時間: 100ms以下
 * - Transferable Objects使用率: 70%以上
 */

import { test, expect } from '@playwright/test';

test.describe('WebWorker Phase 4 パフォーマンステスト', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // HTTPサーバーのベースURL
    const baseURL = 'http://localhost:8000';

    // パフォーマンステストページを作成・読み込み
    await page.goto(`${baseURL}`);

    // 必要なスクリプトを順番に読み込み
    await page.addScriptTag({
      type: 'module',
      url: '/tools/workers/communication/message-protocol.js'
    });

    await page.addScriptTag({
      type: 'module',
      url: '/tools/workers/communication/aot-loader.js'
    });

    await page.addScriptTag({
      type: 'module',
      url: '/tools/workers/communication/worker-manager.js'
    });

    await page.addScriptTag({
      type: 'module',
      url: '/tools/performance/webworker-performance-test.js'
    });

    // モジュールが読み込まれるまで少し待機
    await page.waitForTimeout(1000);

    // パフォーマンステスト関数をグローバルに公開
    await page.evaluate(() => {
      window.createWebWorkerPerformanceTest = async () => {
        const { WebWorkerPerformanceTest, runWebWorkerPerformanceTest } =
                    await import('/tools/performance/webworker-performance-test.js');
        return { WebWorkerPerformanceTest, runWebWorkerPerformanceTest };
      };
    });
  });

  test('WebWorker Phase 4 完全パフォーマンステスト', { timeout: 120000 }, async () => {
    console.log('🚀 WebWorker Phase 4 パフォーマンステスト開始');

    // パフォーマンステスト実行
    const results = await page.evaluate(async () => {
      try {
        console.log('📊 ブラウザ内でパフォーマンステスト実行中...');
        const { runWebWorkerPerformanceTest } = await window.createWebWorkerPerformanceTest();
        const testResults = await runWebWorkerPerformanceTest();
        return testResults;
      } catch (error) {
        console.error('❌ パフォーマンステストエラー:', error);
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });

    // エラーチェック
    if (results.error) {
      throw new Error(`パフォーマンステスト失敗: ${results.error}`);
    }

    console.log('📈 パフォーマンステスト結果:', JSON.stringify(results, null, 2));

    // 結果検証
    expect(results).toBeDefined();
    expect(results.baseline).toBeDefined();
    expect(results.optimized).toBeDefined();
    expect(results.comparison).toBeDefined();

    // 目標値チェック
    const { comparison } = results;

    // FPS効率目標: 80%以上
    console.log(`🎯 FPS効率: ${comparison.fpsEfficiency?.toFixed(1)}% (目標: 80%以上)`);
    expect(comparison.fpsEfficiency).toBeGreaterThanOrEqual(80);

    // レスポンス時間目標: 100ms以下
    console.log(`⚡ 平均レスポンス時間: ${results.optimized.averageResponseTime?.toFixed(1)}ms (目標: 100ms以下)`);
    expect(results.optimized.averageResponseTime).toBeLessThanOrEqual(100);

    // Transferable Objects使用率目標: 70%以上
    console.log(`🔄 Transferable Objects使用率: ${results.optimized.transferableObjectsRatio?.toFixed(1)}% (目標: 70%以上)`);
    expect(results.optimized.transferableObjectsRatio).toBeGreaterThanOrEqual(70);

    // パフォーマンス改善効果検証
    expect(comparison.fpsImprovement).toBeGreaterThan(0); // FPS改善
    expect(comparison.responseTimeImprovement).toBeGreaterThan(0); // レスポンス時間改善

    console.log('✅ WebWorker Phase 4 パフォーマンステスト合格');
  });

  test('Transferable Objects効果測定', { timeout: 120000 }, async () => {
    console.log('⚡ Transferable Objects効果測定開始');

    const transferableResults = await page.evaluate(async () => {
      try {
        // Transferable Objects専用テスト実行
        const { WebWorkerPerformanceTest } = await window.createWebWorkerPerformanceTest();
        const test = new WebWorkerPerformanceTest();

        await test.initializeWorkerManager();
        const transferableTest = await test.measureTransferableObjectsEffect();
        await test.cleanup();

        return transferableTest;
      } catch (error) {
        console.error('❌ Transferable Objects測定エラー:', error);
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });

    // エラーチェック
    if (transferableResults.error) {
      throw new Error(`Transferable Objects測定失敗: ${transferableResults.error}`);
    }

    console.log('🔄 Transferable Objects効果:', JSON.stringify(transferableResults, null, 2));

    // Transferable Objects効果の検証
    expect(transferableResults.improvement).toBeGreaterThan(0); // 改善効果があること
    expect(transferableResults.withTransferables.averageResponseTime)
      .toBeLessThan(transferableResults.withoutTransferables.averageResponseTime); // 高速化されること

    console.log(`🎯 Transferable Objects改善効果: ${transferableResults.improvement.toFixed(1)}%削減`);

    // 30%以上の改善を期待
    expect(transferableResults.improvement).toBeGreaterThanOrEqual(30);
  });

  test('メモリ使用量監視', async () => {
    console.log('🧠 メモリ使用量監視開始');

    const memoryResults = await page.evaluate(async () => {
      try {
        const { WebWorkerPerformanceTest } = await window.createWebWorkerPerformanceTest();
        const test = new WebWorkerPerformanceTest();

        await test.initializeWorkerManager();
        const memoryUsage = await test.measureMemoryUsage();
        await test.cleanup();

        return memoryUsage;
      } catch (error) {
        console.error('❌ メモリ使用量測定エラー:', error);
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });

    // エラーチェック
    if (memoryResults.error) {
      throw new Error(`メモリ使用量測定失敗: ${memoryResults.error}`);
    }

    console.log('🧠 メモリ使用量:', JSON.stringify(memoryResults, null, 2));

    // メモリ使用量の妥当性チェック
    expect(memoryResults.workerManager).toBeLessThan(100); // 100MB以下
    expect(memoryResults.totalWorkers).toBeLessThan(200); // 200MB以下

    console.log(`📊 WorkerManager: ${memoryResults.workerManager.toFixed(1)}MB`);
    console.log(`📊 Workers合計: ${memoryResults.totalWorkers.toFixed(1)}MB`);
  });

  test('WebWorker統計情報収集', async () => {
    console.log('📊 WebWorker統計情報収集開始');

    const statsResults = await page.evaluate(async () => {
      try {
        const { WebWorkerPerformanceTest } = await window.createWebWorkerPerformanceTest();
        const test = new WebWorkerPerformanceTest();

        await test.initializeWorkerManager();

        // 複数回のメッセージ交換でワーカー統計を収集
        const stats = [];
        for (let i = 0; i < 10; i++) {
          const workerStats = test.workerManager.getStats();
          stats.push(workerStats);

          // 少し待機してから次の統計を取得
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        await test.cleanup();

        return stats;
      } catch (error) {
        console.error('❌ WebWorker統計情報収集エラー:', error);
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });

    // エラーチェック
    if (statsResults.error) {
      throw new Error(`WebWorker統計情報収集失敗: ${statsResults.error}`);
    }

    console.log('📈 WebWorker統計情報:', JSON.stringify(statsResults[statsResults.length - 1], null, 2));

    const finalStats = statsResults[statsResults.length - 1];

    // 統計の妥当性チェック
    expect(finalStats.activeWorkers).toBeGreaterThanOrEqual(0);
    expect(finalStats.messagesProcessed).toBeGreaterThanOrEqual(0);
    expect(finalStats.averageResponseTime).toBeGreaterThanOrEqual(0);

    console.log(`📊 アクティブWorker数: ${finalStats.activeWorkers}`);
    console.log(`📊 処理メッセージ数: ${finalStats.messagesProcessed}`);
    console.log(`📊 平均レスポンス時間: ${finalStats.averageResponseTime.toFixed(1)}ms`);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
});
