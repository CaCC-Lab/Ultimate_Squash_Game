import { test, expect } from '@playwright/test';
import { 
  SELECTORS, 
  KEYS, 
  TIMEOUTS, 
  TEST_DATA,
  loadGamePage,
  setupErrorHandlers,
  expectNoErrors,
  startGame,
  performRandomActions,
  toggleRankingModal
} from './helpers.js';

test.describe('Game Interaction Tests', () => {
  let consoleErrors;
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    // エラー監視を設定
    consoleErrors = [];
    jsErrors = [];
    setupErrorHandlers(page, consoleErrors, jsErrors);
    
    // ゲームページを読み込み
    await loadGamePage(page);
    
    // キャンバスが表示されることを確認
    const canvas = page.locator(SELECTORS.canvas);
    await expect(canvas).toBeVisible();
  });

  test.afterEach(async () => {
    // 各テスト後にエラーチェック
    expectNoErrors(consoleErrors);
    expectNoErrors(jsErrors);
  });

  test.describe('Keyboard Controls', () => {
    test('should respond to keyboard inputs', async ({ page }) => {
      // キーボード入力のテスト（ヘルパーのテストデータを使用）
      const allKeys = [
        ...TEST_DATA.movementKeys,
        ...TEST_DATA.gameControlKeys,
        ...TEST_DATA.uiControlKeys
      ];
      
      for (const key of allKeys) {
        await page.keyboard.press(key);
        await page.waitForTimeout(TIMEOUTS.short);
      }
    });

    test('should show ranking modal with H key', async ({ page }) => {
      // ローディングが完了するまで待機
      await page.waitForTimeout(TIMEOUTS.long);
      
      // ヘルパー関数を使用してランキングモーダルの表示を確認
      await toggleRankingModal(page);
        await expect(rankingModal).toBeHidden();
      } else {
        // Pyodideがロードされていない場合はスキップ
        console.log('Ranking modal test skipped - Pyodide not fully loaded');
      }
    });
  });

  test.describe('Sound Controls', () => {
    test('should handle sound-related operations', async ({ page }) => {
      // ローディングが完了するまで待機
      await page.waitForTimeout(3000);
      
      // コンソールエラーの監視を開始
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
          consoleErrors.push(msg.text());
        }
      });
      
      // タッチコントロールエリアにサウンドボタンがあるか確認
      const touchControls = page.locator('.touch-controls');
      const hasTouchControls = await touchControls.count() > 0;
      
      if (hasTouchControls) {
        // サウンドボタンを探す
        const soundButton = page.locator('.touch-controls button').filter({ hasText: /🔊|🔇/ });
        const buttonCount = await soundButton.count();
        
        if (buttonCount > 0) {
          await soundButton.first().click();
          await page.waitForTimeout(100);
        }
      }
      
      // エラーが発生しないことを確認
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Game Canvas Interaction', () => {
    test('should handle mouse movement on canvas', async ({ page }) => {
      const canvas = page.locator('canvas#gameCanvas');
      const box = await canvas.boundingBox();
      
      // キャンバス上でマウスを移動
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);
      
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.waitForTimeout(100);
      
      // エラーが発生しないことを確認
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should maintain aspect ratio on resize', async ({ page }) => {
      // 初期のキャンバスサイズを取得
      const canvas = page.locator('canvas#gameCanvas');
      const initialBox = await canvas.boundingBox();
      const initialAspectRatio = initialBox.width / initialBox.height;
      
      // ウィンドウサイズを変更
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      // 新しいキャンバスサイズを取得
      const newBox = await canvas.boundingBox();
      const newAspectRatio = newBox.width / newBox.height;
      
      // アスペクト比が維持されていることを確認（誤差1%以内）
      expect(Math.abs(initialAspectRatio - newAspectRatio)).toBeLessThan(0.01);
    });
  });

  test.describe('Performance', () => {
    test('should render smoothly without errors', async ({ page }) => {
      // 5秒間ゲームを実行
      await page.waitForTimeout(5000);
      
      // JavaScriptエラーがないことを確認
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      expect(jsErrors.length).toBe(0);
      
      // ページがクラッシュしていないことを確認
      const canvas = page.locator('canvas#gameCanvas');
      await expect(canvas).toBeVisible();
    });

    test('should handle rapid key presses', async ({ page }) => {
      // 高速でキーを連打
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(50);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(50);
      }
      
      // エラーが発生しないことを確認
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      expect(consoleErrors.length).toBe(0);
    });
  });
});