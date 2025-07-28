const { test, expect } = require('@playwright/test');

test('debug metrics collector loading', async ({ page }) => {
  // コンソールメッセージを収集
  const consoleMessages = [];
  page.on('console', msg => {
    console.log(`Browser console: ${msg.type()} - ${msg.text()}`);
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // エラーを収集
  const pageErrors = [];
  page.on('pageerror', error => {
    console.log(`Page error: ${error.message}`);
    pageErrors.push(error.message);
  });

  // テストページにアクセス
  await page.goto('http://localhost:8001/test-metrics.html');

  // ページの読み込みを待つ
  await page.waitForTimeout(2000);

  // ページ内容を確認
  const status = await page.locator('#status').textContent();
  console.log('Status:', status);

  const output = await page.locator('#output').textContent();
  console.log('Output:', output);

  // エラーがないことを確認
  expect(pageErrors).toHaveLength(0);

  // メトリクスコレクターが存在することを確認
  const hasCollector = await page.evaluate(() => {
    return window.metricsCollector !== undefined;
  });
  expect(hasCollector).toBe(true);

  // 収集を開始
  await page.click('#startBtn');
  await page.waitForTimeout(1000);

  // 統計情報を取得
  const stats = await page.evaluate(() => {
    return window.metricsCollector?.getStats();
  });

  console.log('Stats:', JSON.stringify(stats, null, 2));
});
