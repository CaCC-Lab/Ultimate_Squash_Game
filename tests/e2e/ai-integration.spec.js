/**
 * AI機能統合テスト（TDD - RED Phase）
 * 
 * Web版Ultimate Squash GameへのAI機能追加
 * まず失敗するテストを書く
 */

import { test, expect } from '@playwright/test';

test.describe('AI機能統合テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // ゲーム初期化待機
  });

  test('AI機能の初期化確認', async ({ page }) => {
    console.log('🤖 AI機能初期化テスト開始...');
    
    // AI機能が存在することを確認
    const aiState = await page.evaluate(() => {
      return {
        hasAI: typeof window.gameAI !== 'undefined',
        hasAIManager: typeof window.aiManager !== 'undefined',
        hasCommentarySystem: typeof window.aiCommentary !== 'undefined'
      };
    });
    
    // これらのテストは最初は失敗する（RED）
    expect(aiState.hasAI).toBe(true);
    expect(aiState.hasAIManager).toBe(true);
    expect(aiState.hasCommentarySystem).toBe(true);
    
    console.log('✅ AI機能初期化確認完了');
  });

  test('AIコメンタリー表示機能', async ({ page }) => {
    console.log('💬 AIコメンタリーテスト開始...');
    
    // コメンタリー表示要素の存在確認
    await expect(page.locator('#ai-commentary')).toBeAttached();
    
    // ゲームイベント発生時のコメンタリー生成確認
    await page.evaluate(() => {
      // パドルヒットイベントをシミュレート
      window.dispatchEvent(new CustomEvent('game:paddleHit', {
        detail: { speed: 10, position: { x: 100, y: 200 } }
      }));
    });
    
    // コメンタリーが表示されることを確認
    await expect(page.locator('#ai-commentary')).toContainText(/.*/, { timeout: 5000 });
    
    console.log('✅ AIコメンタリー表示確認完了');
  });

  test('ADAシステム（動的難易度調整）', async ({ page }) => {
    console.log('🎮 ADAシステムテスト開始...');
    
    // ADA情報表示パネルの存在確認
    await expect(page.locator('#ada-info-panel')).toBeAttached();
    
    // ADAシステムの状態取得
    const adaState = await page.evaluate(() => {
      return window.gameADA ? {
        enabled: window.gameADA.enabled,
        difficulty: window.gameADA.currentDifficulty,
        missRate: window.gameADA.missRate,
        evaluationCount: window.gameADA.evaluationCount
      } : null;
    });
    
    expect(adaState).not.toBeNull();
    expect(adaState.enabled).toBe(true);
    expect(adaState.difficulty).toBeGreaterThan(0);
    
    console.log('✅ ADAシステム確認完了');
  });

  test('AI機能のオン/オフ切り替え', async ({ page }) => {
    console.log('🔄 AI機能切り替えテスト開始...');
    
    // AI機能トグルボタンの存在確認
    await expect(page.locator('#ai-toggle-button')).toBeAttached();
    
    // 初期状態の確認
    const initialState = await page.locator('#ai-toggle-button').getAttribute('data-ai-enabled');
    expect(initialState).toBe('true');
    
    // トグルボタンをクリック
    await page.locator('#ai-toggle-button').click();
    
    // 状態が変更されたことを確認
    const newState = await page.locator('#ai-toggle-button').getAttribute('data-ai-enabled');
    expect(newState).toBe('false');
    
    // AIコメンタリーが非表示になることを確認
    await expect(page.locator('#ai-commentary')).toBeHidden();
    
    console.log('✅ AI機能切り替え確認完了');
  });

  test('AI機能のパフォーマンス影響', async ({ page }) => {
    console.log('⚡ パフォーマンステスト開始...');
    
    // FPS計測開始
    await page.evaluate(() => {
      window.fpsData = [];
      let lastTime = performance.now();
      let frameCount = 0;
      
      function measureFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          window.fpsData.push(frameCount);
          frameCount = 0;
          lastTime = currentTime;
        }
        
        if (window.fpsData.length < 5) {
          requestAnimationFrame(measureFPS);
        }
      }
      
      requestAnimationFrame(measureFPS);
    });
    
    // 5秒間のFPS計測
    await page.waitForTimeout(5500);
    
    const fpsData = await page.evaluate(() => window.fpsData);
    const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;
    
    // AI機能が有効でも60FPSの80%以上を維持
    expect(avgFPS).toBeGreaterThan(48);
    
    console.log(`📊 平均FPS: ${avgFPS.toFixed(2)}`);
    console.log('✅ パフォーマンステスト完了');
  });

  test('WebSocket経由のAI機能連携', async ({ page }) => {
    console.log('🌐 WebSocket AI連携テスト開始...');
    
    // WebSocket接続の確認
    const wsConnected = await page.evaluate(() => {
      return window.gameWebSocket && window.gameWebSocket.readyState === WebSocket.OPEN;
    });
    
    if (!wsConnected) {
      console.warn('⚠️ WebSocket未接続のためスキップ');
      test.skip();
      return;
    }
    
    // AI機能のWebSocket通信確認
    const messageReceived = page.waitForEvent('websocket', ws => 
      ws.url().includes('ws://') && ws.url().includes('ai')
    );
    
    // AIリクエストを送信
    await page.evaluate(() => {
      window.gameWebSocket.send(JSON.stringify({
        type: 'ai_request',
        data: { event: 'game_start' }
      }));
    });
    
    // レスポンスを待機
    await expect(messageReceived).resolves.toBeTruthy();
    
    console.log('✅ WebSocket AI連携確認完了');
  });

  test('日本語AIコメンタリーの表示', async ({ page }) => {
    console.log('🇯🇵 日本語コメンタリーテスト開始...');
    
    // ゲームイベントを発生させる
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('game:score', {
        detail: { score: 100 }
      }));
    });
    
    // 日本語コメンタリーが表示されることを確認
    const commentary = await page.locator('#ai-commentary').textContent();
    
    // 日本語文字が含まれているか確認
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(commentary);
    expect(hasJapanese).toBe(true);
    
    console.log(`💬 コメンタリー: ${commentary}`);
    console.log('✅ 日本語コメンタリー確認完了');
  });
});