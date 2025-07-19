// game.htmlでWebSocket接続をテストするスクリプト
const { chromium } = require('playwright');

async function testGameWebSocket() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // コンソールログを監視（デバッグ用）
    page.on('console', msg => {
        console.log(`[ブラウザ] ${msg.type()}: ${msg.text()}`);
    });
    
    // ページエラーを監視
    page.on('pageerror', error => {
        console.log(`[ページエラー] ${error.message}`);
    });
    
    try {
        console.log('🌐 game.htmlを開いています...');
        await page.goto('http://localhost:8080/game.html');
        
        console.log('⏳ ページ読み込み完了を待機...');
        await page.waitForTimeout(5000);  // 5秒待機
        
        // WebSocket接続ステータスをチェック
        const status = await page.locator('#connectionStatus').textContent();
        console.log(`🔍 WebSocket接続ステータス: ${status.trim()}`);
        
        // WebSocketオブジェクトの状態を確認
        const wsState = await page.evaluate(() => {
            return {
                hasPythonBridge: typeof window.pythonBridge !== 'undefined',
                hasWebSocket: window.pythonBridge && window.pythonBridge.websocket ? true : false,
                readyState: window.pythonBridge && window.pythonBridge.websocket ? window.pythonBridge.websocket.readyState : 'N/A',
                webSocketConstants: {
                    CONNECTING: WebSocket.CONNECTING,
                    OPEN: WebSocket.OPEN,
                    CLOSING: WebSocket.CLOSING,
                    CLOSED: WebSocket.CLOSED
                }
            };
        });
        
        console.log('🔍 WebSocket状態:', wsState);
        
        // WebSocket接続を手動で強制試行
        console.log('🔌 手動WebSocket接続を試行...');
        await page.evaluate(() => {
            if (typeof initializeWebSocketConnection === 'function') {
                console.log('📞 initializeWebSocketConnection() を直接呼び出し');
                initializeWebSocketConnection();
            } else {
                console.log('❌ initializeWebSocketConnection 関数が見つかりません');
            }
        });
        
        console.log('⏳ WebSocket接続結果を5秒待機...');
        await page.waitForTimeout(5000);
        
        // 最終ステータス確認
        const finalStatus = await page.locator('#connectionStatus').textContent();
        console.log(`🔍 最終WebSocket接続ステータス: ${finalStatus.trim()}`);
        
        // 接続が成功した場合はチャレンジボタンをテスト
        if (finalStatus.includes('🟢 接続中')) {
            console.log('✅ WebSocket接続成功! チャレンジボタンをテスト中...');
            
            const challengeButton = await page.locator('#challengeButton');
            const isVisible = await challengeButton.isVisible();
            console.log(`🎯 チャレンジボタンの表示状態: ${isVisible ? '表示中' : '非表示'}`);
            
            if (isVisible) {
                await challengeButton.click();
                console.log('🎯 チャレンジボタンをクリックしました');
                await page.waitForTimeout(2000);
            }
        } else {
            console.log('❌ WebSocket接続失敗');
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    } finally {
        console.log('🔌 ブラウザを10秒後に閉じます...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

testGameWebSocket().catch(console.error);