/**
 * 簡易WebWorkerパフォーマンステスト
 * Playwrightで実行してWorker通信状況を確認
 */

const { test, expect } = require('@playwright/test');

test('WebWorker Performance Test - Debug Communication', async ({ page }) => {
  // ログを収集
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`Browser: [${msg.type()}] ${msg.text()}`);
  });

  // エラーを収集
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(`Page Error: ${error.message}`);
  });

  try {
    // テストページを作成
    console.log('🔍 簡易パフォーマンステストページを作成中...');

    await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebWorker Performance Test</title>
        </head>
        <body>
            <h1>WebWorker Performance Test</h1>
            <div id="status">初期化中...</div>
            <div id="results"></div>
            
            <script type="module">
                import { WebWorkerPerformanceTest } from '/tools/performance/webworker-performance-test.js';
                
                console.log('📊 WebWorkerPerformanceTest開始');
                
                async function runTest() {
                    try {
                        const test = new WebWorkerPerformanceTest();
                        
                        document.getElementById('status').textContent = 'テスト実行中...';
                        console.log('🚀 パフォーマンステスト実行開始');
                        
                        const results = await test.runFullPerformanceTest();
                        
                        console.log('✅ パフォーマンステスト完了');
                        console.log('結果:', JSON.stringify(results, null, 2));
                        
                        document.getElementById('status').textContent = 'テスト完了';
                        document.getElementById('results').innerHTML = '<pre>' + JSON.stringify(results, null, 2) + '</pre>';
                        
                        // 結果をwindowオブジェクトに保存（Playwrightから取得用）
                        window.testResults = results;
                        window.testCompleted = true;
                        
                    } catch (error) {
                        console.error('❌ パフォーマンステストエラー:', error);
                        document.getElementById('status').textContent = 'テスト失敗: ' + error.message;
                        window.testError = error.message;
                        window.testCompleted = true;
                    }
                }
                
                runTest();
            </script>
        </body>
        </html>
        `);

    // HTTPサーバーのポートでアクセス
    await page.goto('http://localhost:8080');

    console.log('⏳ テスト完了を待機中...');

    // テスト完了まで最大2分待機
    await page.waitForFunction(() => window.testCompleted, { timeout: 120000 });

    // 結果を取得
    const testResults = await page.evaluate(() => window.testResults);
    const testError = await page.evaluate(() => window.testError);

    if (testError) {
      console.error('❌ テストエラー:', testError);
      console.log('📝 収集されたログ:');
      logs.forEach(log => console.log('  ' + log));
      throw new Error(testError);
    }

    if (!testResults) {
      console.error('❌ テスト結果が取得できませんでした');
      console.log('📝 収集されたログ:');
      logs.forEach(log => console.log('  ' + log));
      throw new Error('テスト結果が空です');
    }

    // 結果分析
    console.log('📊 テスト結果分析:');
    console.log('ベースライン:', {
      messageCount: testResults.baseline?.messageCount || 0,
      averageFps: testResults.baseline?.averageFps || 0,
      averageResponseTime: testResults.baseline?.averageResponseTime || 0
    });

    console.log('最適化版:', {
      messageCount: testResults.optimized?.messageCount || 0,
      averageFps: testResults.optimized?.averageFps || 0,
      averageResponseTime: testResults.optimized?.averageResponseTime || 0,
      transferableObjectsRatio: testResults.optimized?.transferableObjectsRatio || 0
    });

    // 通信成功の確認
    const communicationWorking = (testResults.baseline?.messageCount || 0) > 0 ||
                                    (testResults.optimized?.messageCount || 0) > 0;

    console.log(`🔗 Worker通信状況: ${communicationWorking ? '✅ 正常' : '❌ 失敗'}`);

    if (!communicationWorking) {
      console.log('⚠️ Worker通信が動作していません。debug logsを確認してください:');
      const relevantLogs = logs.filter(log =>
        log.includes('WorkerManager') ||
                log.includes('PING') ||
                log.includes('PONG') ||
                log.includes('sendMessage') ||
                log.includes('Transferable')
      );
      relevantLogs.forEach(log => console.log('  ' + log));
    }

    // 目標値チェック
    const targets = {
      fpsEfficiency: 80,
      responseTime: 100,
      transferableObjectsRatio: 70
    };

    const comparison = testResults.comparison || {};
    console.log('🎯 目標達成状況:');
    console.log(`  FPS効率: ${comparison.fpsEfficiency?.toFixed(1) || 'N/A'}% (目標: ${targets.fpsEfficiency}%)`);
    console.log(`  レスポンス時間: ${testResults.optimized?.averageResponseTime?.toFixed(1) || 'N/A'}ms (目標: <${targets.responseTime}ms)`);
    console.log(`  Transferable Objects使用率: ${testResults.optimized?.transferableObjectsRatio?.toFixed(1) || 'N/A'}% (目標: >${targets.transferableObjectsRatio}%)`);

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    console.log('📝 収集されたログ:');
    logs.forEach(log => console.log('  ' + log));
    console.log('📝 収集されたエラー:');
    errors.forEach(error => console.log('  ' + error));
    throw error;
  }
});
