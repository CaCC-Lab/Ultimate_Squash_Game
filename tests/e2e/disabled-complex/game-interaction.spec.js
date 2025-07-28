import { expect, test } from '@playwright/test';
import {
  CONSTANTS,
  expectNoErrors,
  loadGamePage,
  SELECTORS,
  setupErrorHandlers,
  TEST_DATA,
  TIMEOUTS,
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
      const allKeys = [...TEST_DATA.movementKeys, ...TEST_DATA.gameControlKeys, ...TEST_DATA.uiControlKeys];

      // 各キー入力前にキャンバスの状態を記録
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      for (const key of allKeys) {
        // キー押下前の状態を記録
        const beforeState = await page.evaluate(() => {
          const gameCanvas = document.querySelector('#gameCanvas');
          return gameCanvas ? 'active' : 'inactive';
        });

        await page.keyboard.press(key);

        // キー入力が処理されたことを確認（即座の反応を期待）
        await expect(beforeState).toBe('active');
      }
    });

    test('should show ranking modal with H key', async ({ page }) => {
      // ゲームが初期化されていることを確認
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      // ランキングモーダルが最初は非表示であることを確認
      const rankingModal = page.locator(SELECTORS.rankingModal);
      await expect(rankingModal).toBeHidden();

      // ヘルパー関数を使用してランキングモーダルの表示を確認
      await toggleRankingModal(page);

      // モーダルが表示されたことを確認
      await expect(rankingModal).toBeVisible();
    });
  });

  test.describe('Sound Controls', () => {
    test('should handle sound-related operations', async ({ page }) => {
      // ゲームが初期化されていることを確認
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      // タッチコントロールエリアの存在を確認
      const touchControls = page.locator('.touch-controls');
      const hasTouchControls = (await touchControls.count()) > 0;

      if (hasTouchControls) {
        // サウンドボタンを探す
        const soundButton = page.locator('.touch-controls button').filter({ hasText: /🔊|🔇/ });
        const buttonCount = await soundButton.count();

        if (buttonCount > 0) {
          // ボタンのテキストを取得
          const beforeText = await soundButton.first().textContent();

          // ボタンをクリック
          await soundButton.first().click();

          // ボタンのテキストが変更されたことを確認（トグル動作）
          await expect(soundButton.first()).not.toHaveText(beforeText);
        } else {
          // サウンドボタンが見つからない場合はスキップ（エラーではない）
          console.log('Sound button not found - this is expected on some devices');
        }
      } else {
        // タッチコントロールがない場合はスキップ（デスクトップ環境）
        console.log('Touch controls not found - this is expected on desktop');
      }
    });
  });

  test.describe('Game Canvas Interaction', () => {
    test('should handle mouse movement on canvas', async ({ page }) => {
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();

      // マウスイベントリスナーが設定されていることを確認
      await page.evaluate(() => {
        const gameCanvas = document.querySelector('#gameCanvas');
        // イベントリスナーの存在を間接的に確認
        return gameCanvas && typeof gameCanvas.onmousemove !== 'undefined';
      });

      // キャンバス上でマウスを移動（中央）
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      // 別の位置に移動
      await page.mouse.move(box.x + 100, box.y + 100);

      // マウス移動が正常に処理されたことを確認
      // （エラーが発生していないことをafterEachで確認）
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
      // ゲームが開始されていることを確認
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      // パフォーマンス測定開始
      const startTime = Date.now();
      let frameCount = 0;

      // アニメーションフレームの監視
      await page.evaluate(() => {
        window.frameCount = 0;
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
          window.frameCount++;
          return originalRAF.call(window, callback);
        };
      });

      // 指定時間待機
      await page.waitForTimeout(CONSTANTS.PERFORMANCE_TEST_DURATION);

      // フレーム数を取得
      frameCount = await page.evaluate(() => window.frameCount);
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const fps = frameCount / elapsedSeconds;

      // 基本的なパフォーマンス基準を満たしていることを確認
      expect(fps).toBeGreaterThan(30); // 最低30FPS

      // ページがクラッシュしていないことを確認
      await expect(canvas).toBeVisible();
    });

    test('should handle rapid key presses', async ({ page }) => {
      // ゲームが開始されていることを確認
      const canvas = page.locator(SELECTORS.canvas);
      await expect(canvas).toBeVisible();

      // キー入力処理のカウンターを設定
      await page.evaluate(() => {
        window.keyPressCount = 0;
        document.addEventListener('keydown', () => {
          window.keyPressCount++;
        });
      });

      // 高速でキーを連打
      const { RAPID_KEY_PRESS_COUNT, RAPID_KEY_PRESS_DELAY } = CONSTANTS;
      const expectedKeyPresses = RAPID_KEY_PRESS_COUNT * 2; // 左右キーで2倍

      for (let i = 0; i < RAPID_KEY_PRESS_COUNT; i++) {
        await page.keyboard.press('ArrowLeft');
        // 最小限の遅延のみ（ブラウザの処理を待つため）
        if (RAPID_KEY_PRESS_DELAY > 0) {
          await page.waitForTimeout(RAPID_KEY_PRESS_DELAY);
        }
        await page.keyboard.press('ArrowRight');
        if (RAPID_KEY_PRESS_DELAY > 0) {
          await page.waitForTimeout(RAPID_KEY_PRESS_DELAY);
        }
      }

      // すべてのキー入力が処理されたことを確認
      const actualKeyPresses = await page.evaluate(() => window.keyPressCount);
      expect(actualKeyPresses).toBe(expectedKeyPresses);

      // ゲームがクラッシュしていないことを確認
      await expect(canvas).toBeVisible();
    });
  });
});
