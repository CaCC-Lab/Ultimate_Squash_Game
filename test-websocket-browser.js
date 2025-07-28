// ブラウザでWebSocket接続をテストするスクリプト
const { chromium } = require('playwright');

async function testWebSocketInBrowser() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // コンソールログを監視
  page.on('console', msg => {
    console.log(`[ブラウザ] ${msg.type()}: ${msg.text()}`);
  });

  // ページエラーを監視
  page.on('pageerror', error => {
    console.log(`[ページエラー] ${error.message}`);
  });

  try {
    console.log('🌐 WebSocketテストページを開いています...');
    await page.goto('http://localhost:8080/websocket-test.html');

    console.log('⏳ ページ読み込み完了を待機...');
    await page.waitForTimeout(2000);

    console.log('🔌 接続ボタンをクリック...');
    await page.click('text=接続');

    console.log('⏳ WebSocket接続完了を待機...');
    await page.waitForTimeout(5000);

    // 接続ステータスをチェック
    const status = await page.locator('#status').textContent();
    console.log(`🔍 接続ステータス: ${status}`);

    if (status.includes('🟢 接続中')) {
      console.log('✅ WebSocket接続成功!');

      console.log('📤 テストメッセージを送信...');
      await page.click('text=テストメッセージ送信');

      await page.waitForTimeout(2000);

      // ログの内容を確認
      const logContent = await page.locator('#log').textContent();
      console.log('📋 ログ内容:');
      console.log(logContent);
    } else {
      console.log('❌ WebSocket接続失敗');

      // ログの内容を確認
      const logContent = await page.locator('#log').textContent();
      console.log('📋 エラーログ:');
      console.log(logContent);
    }

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  } finally {
    console.log('🔌 ブラウザを10秒後に閉じます...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testWebSocketInBrowser().catch(console.error);
