// チャレンジジェネレーターの動作のみをテストするスクリプト
const { chromium } = require('playwright');

async function testChallengeGenerator() {
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
        console.log('🌐 game.htmlを開いています...');
        await page.goto('http://localhost:8080/game.html');
        
        console.log('⏳ ページ読み込み完了を待機...');
        await page.waitForTimeout(3000);
        
        // チャレンジジェネレーターのテスト
        console.log('🎯 ChallengeGeneratorをテスト中...');
        const challengeTest = await page.evaluate(() => {
            // ChallengeGeneratorがグローバルに利用可能かチェック
            const hasChallengeGenerator = typeof window.ChallengeGenerator !== 'undefined';
            console.log('window.ChallengeGenerator available:', hasChallengeGenerator);
            console.log('window.ChallengeGenerator type:', typeof window.ChallengeGenerator);
            
            if (!hasChallengeGenerator) {
                return {
                    success: false,
                    error: 'ChallengeGenerator not found in window'
                };
            }
            
            try {
                // ChallengeGeneratorのインスタンスを作成
                const generator = new window.ChallengeGenerator();
                console.log('ChallengeGenerator instance created:', generator);
                
                // 週替わりチャレンジを生成
                const challenge = generator.generateWeeklyChallenge(new Date());
                console.log('Generated challenge:', challenge);
                
                return {
                    success: true,
                    challenge: challenge
                };
            } catch (error) {
                console.error('ChallengeGenerator error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('🔍 チャレンジジェネレーター結果:', challengeTest);
        
        if (challengeTest.success) {
            console.log('✅ ChallengeGenerator正常動作!');
            console.log('📋 生成されたチャレンジ:', challengeTest.challenge);
        } else {
            console.log('❌ ChallengeGeneratorエラー:', challengeTest.error);
        }
        
    } catch (error) {
        console.error('❌ テストエラー:', error.message);
    } finally {
        console.log('🔌 ブラウザを5秒後に閉じます...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testChallengeGenerator().catch(console.error);