// WebSocket接続デバッグ用スクリプト
const { chromium } = require('playwright');

async function debugWebSocketConnection() {
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
        console.log('🌐 ブラウザでgame.htmlを開いています...');
        await page.goto('http://localhost:8080/docs/game.html');
        
        console.log('⏳ 15秒待機してWebSocket接続の結果を確認...');
        await page.waitForTimeout(15000);
        
        // 接続ステータスをチェック
        const connectionStatus = await page.locator('#connectionStatus').textContent();
        console.log(`🔌 接続ステータス: ${connectionStatus}`);
        
        // WebSocketオブジェクトの状態を確認
        const wsState = await page.evaluate(() => {
            return {
                hasPythonBridge: typeof window.pythonBridge !== 'undefined',
                hasWebSocket: window.pythonBridge && window.pythonBridge.websocket ? true : false,
                readyState: window.pythonBridge && window.pythonBridge.websocket ? window.pythonBridge.websocket.readyState : 'N/A'
            };
        });
        
        console.log('🔍 WebSocket状態:', wsState);
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugWebSocketConnection().catch(console.error);