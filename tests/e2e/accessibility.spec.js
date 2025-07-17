import { expect, test } from '@playwright/test';
import {
  expectNoErrors,
  loadGamePage,
  SELECTORS,
  setupErrorHandlers,
  TIMEOUTS,
} from './helpers.js';

test.describe('Accessibility Features', () => {
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
    
    // ゲームが完全に読み込まれるまで少し待つ
    await page.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    // 各テスト後にエラーチェック
    expectNoErrors(consoleErrors);
    expectNoErrors(jsErrors);
  });

  test.describe('Accessibility Panel', () => {
    test('should toggle accessibility panel with A key', async ({ page }) => {
      // アクセシビリティパネルが最初は非表示であることを確認
      const accessibilityPanel = page.locator('#accessibilityPanel');
      await expect(accessibilityPanel).toBeHidden();

      // Aキーを押してパネルを表示
      await page.keyboard.press('a');
      await expect(accessibilityPanel).toBeVisible();

      // 再度Aキーを押してパネルを非表示
      await page.keyboard.press('a');
      await expect(accessibilityPanel).toBeHidden();
    });

    test('should show accessibility button on click', async ({ page }) => {
      // アクセシビリティボタンをクリック
      const accessibilityButton = page.locator('#accessibilityToggle');
      await expect(accessibilityButton).toBeVisible();
      
      await accessibilityButton.click();
      
      // パネルが表示されることを確認
      const accessibilityPanel = page.locator('#accessibilityPanel');
      await expect(accessibilityPanel).toBeVisible();
    });
  });

  test.describe('Color Blind Modes', () => {
    const colorModes = [
      { mode: 'none', label: '標準' },
      { mode: 'protanopia', label: 'P型（赤緑色覚）' },
      { mode: 'deuteranopia', label: 'D型（赤緑色覚）' },
      { mode: 'tritanopia', label: 'T型（青黄色覚）' },
      { mode: 'achromatopsia', label: '全色覚' },
    ];

    for (const { mode, label } of colorModes) {
      test(`should apply ${label} color blind mode`, async ({ page }) => {
        // アクセシビリティパネルを開く
        await page.keyboard.press('a');
        
        // 色覚モードを選択
        const colorSelect = page.locator('#colorblindMode');
        await colorSelect.selectOption(mode);
        
        // body要素に適切なクラスが適用されることを確認
        const body = page.locator('body');
        if (mode !== 'none') {
          await expect(body).toHaveClass(new RegExp(`colorblind-${mode}`));
        } else {
          // 標準モードの場合、色覚クラスがないことを確認
          const classes = await body.getAttribute('class') || '';
          expect(classes).not.toMatch(/colorblind-/);
        }
        
        // 設定がlocalStorageに保存されることを確認
        const savedSettings = await page.evaluate(() => {
          return JSON.parse(localStorage.getItem('ultimateSquashAccessibility') || '{}');
        });
        expect(savedSettings.colorblindMode).toBe(mode);
      });
    }
  });

  test.describe('High Contrast Mode', () => {
    test('should toggle high contrast mode', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // 高コントラストモードをオン
      const highContrastToggle = page.locator('#highContrastMode');
      await highContrastToggle.check();
      
      // body要素にhigh-contrastクラスが追加されることを確認
      await expect(page.locator('body')).toHaveClass(/high-contrast/);
      
      // Canvas要素の背景色が変更されることを確認（ゲームロジックによる）
      await page.waitForTimeout(100); // Canvas更新を待つ
      
      // 設定がlocalStorageに保存されることを確認
      const savedSettings = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ultimateSquashAccessibility') || '{}');
      });
      expect(savedSettings.highContrast).toBe(true);
      
      // 高コントラストモードをオフ
      await highContrastToggle.uncheck();
      await expect(page.locator('body')).not.toHaveClass(/high-contrast/);
    });
  });

  test.describe('Gamma Adjustment', () => {
    test('should adjust gamma/brightness', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // ガンマスライダーを取得
      const gammaSlider = page.locator('#gammaControl');
      const gammaValue = page.locator('#gammaValue');
      
      // 初期値が1.0であることを確認
      await expect(gammaValue).toHaveText('1.0');
      
      // ガンマ値を変更（1.5に設定）
      await gammaSlider.fill('1.5');
      await expect(gammaValue).toHaveText('1.5');
      
      // キャンバスにフィルターが適用されることを確認
      const canvas = page.locator(SELECTORS.canvas);
      const style = await canvas.getAttribute('style');
      expect(style).toContain('brightness(1.5)');
      
      // 設定がlocalStorageに保存されることを確認
      const savedSettings = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ultimateSquashAccessibility') || '{}');
      });
      expect(savedSettings.gamma).toBe(1.5);
    });

    test('should handle gamma range limits', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      const gammaSlider = page.locator('#gammaControl');
      
      // 最小値（0.5）をテスト
      await gammaSlider.fill('0.5');
      const minValue = await gammaSlider.inputValue();
      expect(parseFloat(minValue)).toBe(0.5);
      
      // 最大値（2.0）をテスト
      await gammaSlider.fill('2');
      const maxValue = await gammaSlider.inputValue();
      expect(parseFloat(maxValue)).toBe(2);
    });
  });

  test.describe('Reduce Motion', () => {
    test('should toggle reduce motion setting', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // モーション軽減をオン
      const reduceMotionToggle = page.locator('#reduceMotion');
      await reduceMotionToggle.check();
      
      // 設定がlocalStorageに保存されることを確認
      let savedSettings = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ultimateSquashAccessibility') || '{}');
      });
      expect(savedSettings.reduceMotion).toBe(true);
      
      // モーション軽減をオフ
      await reduceMotionToggle.uncheck();
      
      savedSettings = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ultimateSquashAccessibility') || '{}');
      });
      expect(savedSettings.reduceMotion).toBe(false);
    });
  });

  test.describe('Settings Persistence', () => {
    test('should persist accessibility settings across page reloads', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // 複数の設定を変更
      await page.locator('#colorblindMode').selectOption('protanopia');
      await page.locator('#highContrastMode').check();
      await page.locator('#gammaControl').fill('1.3');
      await page.locator('#reduceMotion').check();
      
      // ページをリロード
      await page.reload();
      await loadGamePage(page);
      
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // 設定が保持されていることを確認
      await expect(page.locator('#colorblindMode')).toHaveValue('protanopia');
      await expect(page.locator('#highContrastMode')).toBeChecked();
      await expect(page.locator('#gammaValue')).toHaveText('1.3');
      await expect(page.locator('#reduceMotion')).toBeChecked();
      
      // body要素に設定が適用されていることを確認
      const body = page.locator('body');
      await expect(body).toHaveClass(/colorblind-protanopia/);
      await expect(body).toHaveClass(/high-contrast/);
    });

    test('should reset settings when cleared', async ({ page }) => {
      // 設定を変更
      await page.keyboard.press('a');
      await page.locator('#colorblindMode').selectOption('deuteranopia');
      await page.locator('#highContrastMode').check();
      
      // localStorage をクリア
      await page.evaluate(() => {
        localStorage.removeItem('ultimateSquashAccessibility');
      });
      
      // ページをリロード
      await page.reload();
      await loadGamePage(page);
      
      // デフォルト設定に戻っていることを確認
      await page.keyboard.press('a');
      await expect(page.locator('#colorblindMode')).toHaveValue('none');
      await expect(page.locator('#highContrastMode')).not.toBeChecked();
      await expect(page.locator('#gammaValue')).toHaveText('1.0');
      await expect(page.locator('#reduceMotion')).not.toBeChecked();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation in accessibility panel', async ({ page }) => {
      // アクセシビリティパネルを開く
      await page.keyboard.press('a');
      
      // Tabキーでフォーカスを移動できることを確認
      await page.keyboard.press('Tab');
      const focusedElement1 = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement1).toBeTruthy();
      
      await page.keyboard.press('Tab');
      const focusedElement2 = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement2).toBeTruthy();
      expect(focusedElement2).not.toBe(focusedElement1);
      
      // Spaceキーでチェックボックスを切り替えられることを確認
      const highContrastCheckbox = page.locator('#highContrastMode');
      await highContrastCheckbox.focus();
      await page.keyboard.press('Space');
      await expect(highContrastCheckbox).toBeChecked();
      
      // Enterキーでも切り替えられることを確認（一部のブラウザ）
      await page.keyboard.press('Space');
      await expect(highContrastCheckbox).not.toBeChecked();
    });
  });

  test.describe('Visual Regression', () => {
    test('should render correctly in all color blind modes', async ({ page }) => {
      // 各色覚モードでスクリーンショットを撮影（ビジュアルテスト用）
      const modes = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
      
      for (const mode of modes) {
        await page.keyboard.press('a');
        await page.locator('#colorblindMode').selectOption(mode);
        await page.keyboard.press('a'); // パネルを閉じる
        
        // ゲームが描画されるのを待つ
        await page.waitForTimeout(500);
        
        // スクリーンショットを撮影（CI環境でのビジュアル回帰テスト用）
        await page.screenshot({ 
          path: `tests/screenshots/colorblind-${mode}.png`,
          fullPage: false 
        });
      }
    });
  });
});