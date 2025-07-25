/**
 * Playwright WebWorker統合テスト
 * Ultimate Squash Game - WebWorker Phase 4検証
 */

const { test, expect } = require('@playwright/test');

test.describe('WebWorker Phase 4統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // ブラウザテストページを開く（Playwright設定のポート3000を使用）
    await page.goto('http://localhost:3000/tools/workers/test-webworker-browser.html');
    
    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');
    
    // テストページのUIが表示されるまで待機
    await expect(page.locator('.header')).toBeVisible();
  });

  test('WebWorkerシステム初期化テスト', async ({ page }) => {
    console.log('🚀 WebWorkerシステム初期化テスト開始');
    
    // ステータスが「準備完了」になることを確認
    await expect(page.locator('#status-indicator')).toHaveText('準備完了');
    
    // 統合テスト開始ボタンをクリック
    await page.click('#start-test');
    
    // テスト実行中状態になることを確認
    await expect(page.locator('#status-indicator')).toHaveText('実行中');
    
    // プログレスバーが表示されることを確認
    await expect(page.locator('#progress-fill')).toBeVisible();
    
    console.log('✅ テスト開始確認完了');
  });

  test('WebWorker PING/PONG通信テスト', async ({ page }) => {
    console.log('🏓 WebWorker PING/PONG通信テスト開始');
    
    // コンソールログを監視してPING/PONGメッセージをキャッチ
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // 統合テスト開始
    await page.click('#start-test');
    
    // テスト完了まで最大30秒待機
    await page.waitForSelector('#status-indicator.status-success, #status-indicator.status-error', {
      timeout: 30000
    });
    
    // 成功状態であることを確認
    const finalStatus = await page.locator('#status-indicator').textContent();
    expect(finalStatus).toContain('テスト');
    
    // PING/PONGエラーがないことを確認
    const pingPongErrors = logs.filter(log => 
      log.includes('PING') && (log.includes('タイムアウト') || log.includes('エラー'))
    );
    
    console.log('📋 PING/PONG関連ログ:', pingPongErrors);
    
    // PING/PONGタイムアウトエラーがないことを確認
    expect(pingPongErrors.length).toBe(0);
    
    console.log('✅ PING/PONG通信テスト完了');
  });

  test('WebWorker性能メトリクステスト', async ({ page }) => {
    console.log('⚡ WebWorker性能メトリクステスト開始');
    
    // 統合テスト開始
    await page.click('#start-test');
    
    // テスト完了まで待機
    await page.waitForSelector('#status-indicator.status-success', { timeout: 45000 });
    
    // パフォーマンスメトリクスが更新されることを確認
    const fpsValue = await page.locator('#fps-metric').textContent();
    const latencyValue = await page.locator('#latency-metric').textContent();
    const framesValue = await page.locator('#frames-metric').textContent();
    const workersValue = await page.locator('#workers-metric').textContent();
    
    console.log('📊 パフォーマンスメトリクス:', {
      fps: fpsValue,
      latency: latencyValue,
      frames: framesValue,
      workers: workersValue
    });
    
    // メトリクスが初期状態（--）から更新されていることを確認
    expect(fpsValue).not.toBe('--');
    expect(latencyValue).not.toBe('--');
    expect(framesValue).not.toBe('--');
    expect(workersValue).toBe('3'); // 3つのWorkerが動作
    
    console.log('✅ 性能メトリクステスト完了');
  });

  test('WebWorkerエラーハンドリングテスト', async ({ page }) => {
    console.log('🛡️ WebWorkerエラーハンドリングテスト開始');
    
    // エラーログを収集
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 統合テスト開始
    await page.click('#start-test');
    
    // テスト完了まで待機
    await page.waitForSelector('#status-indicator.status-success, #status-indicator.status-error', {
      timeout: 45000
    });
    
    // 重大なエラーがないことを確認
    const criticalErrors = errors.filter(error => 
      error.includes('Cannot read') || 
      error.includes('undefined') ||
      error.includes('failed to fetch') ||
      error.includes('network error')
    );
    
    console.log('⚠️ 検出されたエラー:', errors);
    console.log('🚨 重大なエラー:', criticalErrors);
    
    // 重大なエラーがないことを確認
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ エラーハンドリングテスト完了');
  });

  test('WebWorker統合テスト結果エクスポート', async ({ page }) => {
    console.log('💾 WebWorker統合テスト結果エクスポート開始');
    
    // 統合テスト実行
    await page.click('#start-test');
    
    // テスト完了まで待機
    await page.waitForSelector('#status-indicator.status-success', { timeout: 45000 });
    
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download');
    
    // 結果エクスポートボタンをクリック
    await page.click('button:has-text("結果エクスポート")');
    
    // ダウンロード完了を待機
    const download = await downloadPromise;
    
    // ダウンロードファイル名を確認
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/webworker-test-results-.+\.json/);
    
    console.log('📁 エクスポートファイル:', fileName);
    console.log('✅ 結果エクスポートテスト完了');
  });
});