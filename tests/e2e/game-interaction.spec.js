import { test, expect } from '@playwright/test';
import { 
  SELECTORS, 
  KEYS, 
  TIMEOUTS, 
  TEST_DATA,
  CONSTANTS,
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
    });
  });

  test.describe('Sound Controls', () => {
    test('should handle sound-related operations', async ({ page }) => {
      // ローディングが完了するまで待機
      await page.waitForTimeout(TIMEOUTS.long);
      
      // タッチコントロールエリアにサウンドボタンがあるか確認
      const touchControls = page.locator('.touch-controls');
      const hasTouchControls = await touchControls.count() > 0;
      
      if (hasTouchControls) {
        // サウンドボタンを探す
        const soundButton = page.locator('.touch-controls button').filter({ hasText: /🔊|🔇/ });
        const buttonCount = await soundButton.count();
        
        if (buttonCount > 0) {
          await soundButton.first().click();
          await page.waitForTimeout(TIMEOUTS.short);
        }
      }
      
      // エラーチェックはafterEachフックで実行される
    });
  });

  test.describe('Game Canvas Interaction', () => {
    test('should handle mouse movement on canvas', async ({ page }) => {
      const canvas = page.locator(SELECTORS.canvas);
      const box = await canvas.boundingBox();
      
      // キャンバス上でマウスを移動
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(TIMEOUTS.short);
      
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.waitForTimeout(TIMEOUTS.short);
      
      // エラーチェックはafterEachフックで実行される
    });

    test('should maintain aspect ratio on resize', async ({ page }) => {
      // 初期のキャンバスサイズを取得
      const canvas = page.locator(SELECTORS.canvas);
      const initialBox = await canvas.boundingBox();
      const initialAspectRatio = initialBox.width / initialBox.height;
      
      // ウィンドウサイズを変更
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      // 新しいキャンバスサイズを取得
      const newBox = await canvas.boundingBox();
      const newAspectRatio = newBox.width / newBox.height;
      
      // アスペクト比が維持されていることを確認
      expect(Math.abs(initialAspectRatio - newAspectRatio)).toBeLessThan(CONSTANTS.ASPECT_RATIO_TOLERANCE);
    });
  });

  test.describe('Performance', () => {
    test('should render smoothly without errors', async ({ page }) => {
      // 一定時間ゲームを実行
      await page.waitForTimeout(CONSTANTS.PERFORMANCE_TEST_DURATION);
      
      // ページがクラッシュしていないことを確認
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();
      
      // エラーチェックはafterEachフックで実行される
    });

    test('should handle rapid key presses', async ({ page }) => {
      // 高速でキーを連打
      const { RAPID_KEY_PRESS_COUNT, RAPID_KEY_PRESS_DELAY } = CONSTANTS;
      for (let i = 0; i < RAPID_KEY_PRESS_COUNT; i++) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(RAPID_KEY_PRESS_DELAY);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(RAPID_KEY_PRESS_DELAY);
      }
      
      // エラーチェックはafterEachフックで実行される
    });
  });
});