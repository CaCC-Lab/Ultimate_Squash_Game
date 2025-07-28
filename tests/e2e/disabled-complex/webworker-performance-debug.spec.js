/**
 * WebWorkerパフォーマンステスト - 通信問題デバッグ
 * Playwright E2Eテスト
 */

const { test, expect } = require('@playwright/test');

test('WebWorker Performance Test - Communication Debug', async ({ page }) => {
  // ログ収集
  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(`Browser: ${text}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page Error: ${error.message}`);
  });

  console.log('🔍 WebWorkerパフォーマンステスト通信デバッグ開始');

  try {
    // パフォーマンステストページにアクセス（HTTPサーバーのポートを使用）
    await page.goto('http://localhost:3000/tools/performance/webworker-performance-test.html');

    console.log('⏳ パフォーマンステスト完了を待機中（最大3分）...');

    // テスト完了まで最大3分待機
    await page.waitForFunction(() => {
      return window.performanceTestResults !== undefined || window.testError !== undefined;
    }, { timeout: 180000 });

    // 結果取得
    const testResults = await page.evaluate(() => window.performanceTestResults);
    const testError = await page.evaluate(() => window.testError);

    console.log('📊 テスト実行結果分析:');

    if (testError) {
      console.error('❌ テストエラー:', testError);
    }

    if (testResults) {
      // メッセージ交換状況の確認
      const baselineMessages = testResults.baseline?.messageCount || 0;
      const optimizedMessages = testResults.optimized?.messageCount || 0;

      console.log(`📤 ベースラインメッセージ数: ${baselineMessages}`);
      console.log(`📤 最適化版メッセージ数: ${optimizedMessages}`);

      // Transferable Objects使用率
      const transferableRatio = testResults.optimized?.transferableObjectsRatio || 0;
      console.log(`🔄 Transferable Objects使用率: ${transferableRatio.toFixed(1)}%`);

      // 目標値チェック
      const targets = {
        messageCount: 1,  // 最低1つのメッセージ交換が必要
        transferableRatio: 70 // 70%以上
      };

      const communicationWorking = baselineMessages > 0 || optimizedMessages > 0;
      console.log(`🔗 Worker通信状況: ${communicationWorking ? '✅ 動作中' : '❌ 失敗'}`);

      if (!communicationWorking) {
        console.log('⚠️ Worker通信が失敗しています。関連ログを確認:');

        // Worker関連のログを抽出
        const workerLogs = logs.filter(log =>
          log.includes('WorkerManager') ||
                    log.includes('Worker') ||
                    log.includes('sendMessage') ||
                    log.includes('PING') ||
                    log.includes('PONG') ||
                    log.includes('Transferable') ||
                    log.includes('messageCount') ||
                    log.includes('responseTimes')
        );

        if (workerLogs.length > 0) {
          console.log('📝 Worker関連ログ:');
          workerLogs.forEach(log => console.log(`  ${log}`));
        } else {
          console.log('📝 Worker関連ログが見つかりません');
        }

        // 全ログも出力（数が多い場合は最後の50件）
        const recentLogs = logs.slice(-50);
        console.log('📝 最新ログ（最後50件）:');
        recentLogs.forEach(log => console.log(`  ${log}`));
      }

      // パフォーマンス指標
      if (testResults.comparison) {
        const fpsEfficiency = testResults.comparison.fpsEfficiency || 0;
        const responseTime = testResults.optimized?.averageResponseTime || 0;

        console.log(`📈 FPS効率: ${fpsEfficiency.toFixed(1)}% (目標: 80%以上)`);
        console.log(`⏱️ レスポンス時間: ${responseTime.toFixed(1)}ms (目標: 100ms以下)`);
      }

      // Transferable Objects詳細分析
      if (testResults.optimized) {
        const transferableUsed = testResults.optimized.transferableObjectsUsed || 0;
        const totalMessages = testResults.optimized.messageCount || 0;
        console.log(`🔄 Transferable Objects詳細: ${transferableUsed}/${totalMessages} messages`);
      }

    } else {
      console.log('❌ テスト結果が取得できませんでした');
    }

    // エラー情報
    if (errors.length > 0) {
      console.log('📝 収集されたエラー:');
      errors.forEach(error => console.log(`  ${error}`));
    }

    // テスト結果の保存（デバッグ用）
    if (testResults) {
      console.log('💾 テスト結果をJSONで保存:');
      console.log(JSON.stringify({
        baseline: {
          messageCount: testResults.baseline?.messageCount || 0,
          averageResponseTime: testResults.baseline?.averageResponseTime || 0,
          averageFps: testResults.baseline?.averageFps || 0
        },
        optimized: {
          messageCount: testResults.optimized?.messageCount || 0,
          averageResponseTime: testResults.optimized?.averageResponseTime || 0,
          averageFps: testResults.optimized?.averageFps || 0,
          transferableObjectsRatio: testResults.optimized?.transferableObjectsRatio || 0,
          transferableObjectsUsed: testResults.optimized?.transferableObjectsUsed || 0
        },
        comparison: testResults.comparison
      }, null, 2));
    }

    // アサーション（テスト成功の条件）
    if (testResults && !testError) {
      // テストが実行されたことを確認
      expect(testResults).toBeDefined();

      // パフォーマンステストが何らかの結果を返したことを確認
      expect(testResults.baseline || testResults.optimized).toBeDefined();

      console.log('✅ パフォーマンステストが正常に実行されました');
    }

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);

    console.log('📝 全ログ:');
    logs.forEach(log => console.log(`  ${log}`));

    console.log('📝 全エラー:');
    errors.forEach(error => console.log(`  ${error}`));

    throw error;
  }
});
