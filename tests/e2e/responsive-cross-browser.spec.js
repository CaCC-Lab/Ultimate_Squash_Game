import { test, expect } from '@playwright/test';

test.describe('Responsive and Cross-Browser Tests', () => {
  test.describe('Screen Size Variations', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Ultra-wide', width: 2560, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        // ビューポートを設定
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // ゲームページに移動
        await page.goto('/docs/game.html');
        await page.waitForTimeout(3000);

        // キャンバスが表示されることを確認
        const canvas = page.locator('canvas#gameCanvas');
        await expect(canvas).toBeVisible();

        // キャンバスのサイズを取得
        const canvasSize = await canvas.boundingBox();

        // キャンバスがビューポート内に収まっていることを確認
        expect(canvasSize.width).toBeLessThanOrEqual(viewport.width);
        expect(canvasSize.height).toBeLessThanOrEqual(viewport.height);

        // アスペクト比が維持されていることを確認（4:3）
        const aspectRatio = canvasSize.width / canvasSize.height;
        expect(aspectRatio).toBeCloseTo(4 / 3, 1);

        // コントロール情報が表示されることを確認
        const controls = page.locator('.controls');
        await expect(controls).toBeVisible();

        // スクリーンショットを撮影（視覚的確認用）
        await page.screenshot({
          path: `test-results/responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`,
          fullPage: true,
        });
      });
    }
  });

  test.describe('Touch Device Interaction', () => {
    test('should respond to touch events on mobile', async ({ browser }) => {
      // モバイルデバイスのコンテキストを作成
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      });

      const page = await context.newPage();
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // タッチイベントをシミュレート
      const canvas = page.locator('canvas#gameCanvas');
      const canvasBox = await canvas.boundingBox();

      // キャンバスの中央をタップ（ゲーム開始）
      await page.tap('#gameCanvas', {
        position: {
          x: canvasBox.width / 2,
          y: canvasBox.height / 2,
        },
      });
      await page.waitForTimeout(1000);

      // 左側をタップ（左移動をシミュレート）
      await page.tap('#gameCanvas', {
        position: {
          x: canvasBox.width * 0.25,
          y: canvasBox.height / 2,
        },
      });
      await page.waitForTimeout(500);

      // 右側をタップ（右移動をシミュレート）
      await page.tap('#gameCanvas', {
        position: {
          x: canvasBox.width * 0.75,
          y: canvasBox.height / 2,
        },
      });
      await page.waitForTimeout(500);

      // スワイプジェスチャーをシミュレート
      await page.mouse.move(canvasBox.width * 0.2, canvasBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(canvasBox.width * 0.8, canvasBox.height / 2, { steps: 10 });
      await page.mouse.up();

      // エラーが発生していないことを確認
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);
      expect(consoleErrors.length).toBe(0);

      await context.close();
    });

    test('should have touch-friendly UI elements', async ({ browser }) => {
      // タブレットデバイスのコンテキストを作成
      const context = await browser.newContext({
        ...devices['iPad Pro'],
        hasTouch: true,
      });

      const page = await context.newPage();
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // タッチターゲットのサイズを確認
      // コントロール要素が存在することを確認
      const controls = page.locator('.controls');
      await expect(controls).toBeVisible();

      // ゲームキャンバスがタッチ可能なサイズであることを確認
      const canvas = page.locator('canvas#gameCanvas');
      const canvasBox = await canvas.boundingBox();

      // キャンバスが十分なサイズであることを確認
      expect(canvasBox.width).toBeGreaterThanOrEqual(300);
      expect(canvasBox.height).toBeGreaterThanOrEqual(200);

      await context.close();
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('should handle browser-specific differences gracefully', async ({ page, browserName }) => {
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // ブラウザごとの特有の機能をテスト
      console.log(`Testing on ${browserName}`);

      // AudioContext の初期化
      await page.click('canvas#gameCanvas');
      await page.waitForTimeout(500);

      // ゲームを開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(2000);

      // ブラウザ固有のエラーがないことを確認
      const browserSpecificErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // ブラウザ固有のエラーパターンをチェック
          if (browserName === 'firefox' && text.includes('NS_ERROR')) {
            browserSpecificErrors.push(text);
          } else if (browserName === 'webkit' && text.includes('WebKit')) {
            browserSpecificErrors.push(text);
          } else if (browserName === 'chromium' && text.includes('Chrome')) {
            browserSpecificErrors.push(text);
          }
        }
      });

      await page.waitForTimeout(2000);

      // AudioContext関連のエラーは除外
      const criticalErrors = browserSpecificErrors.filter(
        error => !error.includes('AudioContext') && !error.includes('The AudioContext was not allowed to start')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Orientation Changes', () => {
    test('should adapt to portrait orientation', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 667, height: 375 }, // 横向き
        isMobile: true,
      });

      const page = await context.newPage();
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // 初期状態を確認
      const canvas = page.locator('canvas#gameCanvas');
      const landscapeBox = await canvas.boundingBox();

      // 縦向きに変更
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // 縦向きでの表示を確認
      const portraitBox = await canvas.boundingBox();

      // キャンバスがビューポートに収まっていることを確認
      expect(portraitBox.width).toBeLessThanOrEqual(375);
      expect(portraitBox.height).toBeLessThanOrEqual(667);

      // アスペクト比が維持されていることを確認
      const aspectRatio = portraitBox.width / portraitBox.height;
      expect(aspectRatio).toBeCloseTo(4 / 3, 1);

      await context.close();
    });
  });

  test.describe('Performance on Different Devices', () => {
    test('should maintain playable performance on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        // CPU throttling をシミュレート
        cpuThrottlingRate: 4,
      });

      const page = await context.newPage();
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // パフォーマンスメトリクスを収集
      const startTime = Date.now();

      // ゲームを開始
      await page.tap('#gameCanvas');
      await page.waitForTimeout(100);
      await page.keyboard.press('Space');

      // 5秒間プレイ
      const moveActions = ['ArrowLeft', 'ArrowRight'];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press(moveActions[i % 2]);
        await page.waitForTimeout(500);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 大きな遅延がないことを確認（許容範囲: 予定時間の2倍以内）
      expect(duration).toBeLessThan(12000); // 5秒 + アクションの時間の約2倍

      await context.close();
    });
  });
});

// Playwrightのdevicesをインポート
import { devices } from '@playwright/test';
