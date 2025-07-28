const { test, expect } = require('@playwright/test');

test('Quick sessionId debug test', async ({ page }) => {
  test.setTimeout(30000); // 30秒のタイムアウト

  // コンソールメッセージを収集
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[Browser] ${msg.type()}: ${text}`);
    consoleMessages.push(text);
  });

  // デモページにアクセス
  await page.goto('http://localhost:3000/docs/js/optimization/metrics-demo.html');

  // 収集開始ボタンをクリック
  await page.click('#startBtn');

  // セッション作成が完了することを確認
  await page.waitForFunction(() => {
    const sessionInfo = document.querySelector('#sessionInfo').textContent;
    return sessionInfo && sessionInfo !== 'セッション未開始' && sessionInfo.includes('sessionId');
  }, { timeout: 10000 });

  console.log('Session created successfully');

  // 少しメトリクスを収集（3秒間）
  await page.waitForTimeout(3000);

  // 手動で永続化を実行
  await page.evaluate(() => {
    if (window.metricsCollector) {
      window.metricsCollector.persistMetrics();
    }
  });

  // 永続化完了を待つ
  await page.waitForTimeout(2000);

  // クエリを実行
  await page.click('button[onclick="queryRecentMetrics()"]');

  // クエリ結果を確認
  await page.waitForFunction(() => {
    const element = document.querySelector('#queryResults');
    const text = element ? element.textContent : '';
    return text && text !== 'クエリを実行してください' && text.trim().length > 10;
  }, { timeout: 10000 });

  const queryResults = await page.locator('#queryResults').textContent();
  console.log('Query results:', queryResults);

  const results = JSON.parse(queryResults);
  console.log('Parsed results count:', results.length);

  if (results.length > 0) {
    console.log('First result:', JSON.stringify(results[0], null, 2));
    console.log('Has sessionId:', !!results[0].sessionId);
  }

  // 関連するコンソールメッセージを表示
  const relevantMessages = consoleMessages.filter(msg =>
    msg.includes('[DB]') ||
        msg.includes('[WORKER]') ||
        msg.includes('[METRICS]') ||
        msg.includes('sessionId') ||
        msg.includes('Session')
  );

  console.log('\n=== Relevant Console Messages ===');
  relevantMessages.forEach((msg, index) => {
    console.log(`${index + 1}: ${msg}`);
  });

  // テスト assertions
  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBeGreaterThan(0);

  if (results.length > 0) {
    const metric = results[0];
    console.log('\n=== Testing metric properties ===');
    console.log('metric has sessionId:', !!metric.sessionId);
    console.log('metric.sessionId value:', metric.sessionId);

    expect(metric).toHaveProperty('sessionId');
    expect(metric).toHaveProperty('timestamp');
    expect(metric).toHaveProperty('type');
    expect(metric).toHaveProperty('value');
  }
});
