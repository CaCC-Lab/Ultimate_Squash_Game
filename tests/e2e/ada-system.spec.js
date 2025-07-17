import { test, expect } from '@playwright/test';

test.describe('ADA (AI Dynamic Adjustment) System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前にゲームページに移動
    await page.goto('/game.html');

    // ゲームの読み込みを待機
    await page.waitForTimeout(3000);

    // ゲームを開始
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
  });

  test.describe('Debug Mode Display', () => {
    test.skip('should toggle debug mode with D key', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // Dキーを押してデバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      // デバッグパネルが表示されることを確認
      const debugPanel = page.locator('#ada-debug-panel');
      await expect(debugPanel).toBeVisible();

      // デバッグパネルにADA情報が含まれることを確認
      await expect(debugPanel).toContainText('ADA Debug Info');
      await expect(debugPanel).toContainText('Miss Ratio');
      await expect(debugPanel).toContainText('Speed Multiplier');

      // もう一度Dキーを押してデバッグモードを無効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      // デバッグパネルが非表示になることを確認
      await expect(debugPanel).toBeHidden();
    });

    test.skip('should display ADA metrics in debug mode', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      const debugPanel = page.locator('#ada-debug-panel');

      // ADAメトリクスの要素を確認
      await expect(debugPanel.locator('text=Miss Ratio:')).toBeVisible();
      await expect(debugPanel.locator('text=Speed Multiplier:')).toBeVisible();
      await expect(debugPanel.locator('text=Angle Randomness:')).toBeVisible();
      await expect(debugPanel.locator('text=Total Attempts:')).toBeVisible();

      // 値が表示されていることを確認（数値フォーマット）
      const missRatioText = await debugPanel.locator('p:has-text("Miss Ratio")').textContent();
      expect(missRatioText).toMatch(/Miss Ratio: \d+\.\d%/);

      const speedText = await debugPanel.locator('p:has-text("Speed Multiplier")').textContent();
      expect(speedText).toMatch(/Speed Multiplier: \d+\.\d{2}/);
    });
  });

  test.describe('ADA Calculation', () => {
    test.skip('should track miss ratio', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      // 初期のミス率を取得
      const debugPanel = page.locator('#ada-debug-panel');
      const initialMissRatioText = await debugPanel.locator('p:has-text("Miss Ratio")').textContent();
      const initialMissRatio = parseFloat(initialMissRatioText.match(/(\d+\.\d)%/)[1]);

      // しばらくプレイ（パドルを動かさずにミスを誘発）
      await page.waitForTimeout(5000);

      // 更新されたミス率を取得
      const updatedMissRatioText = await debugPanel.locator('p:has-text("Miss Ratio")').textContent();
      const updatedMissRatio = parseFloat(updatedMissRatioText.match(/(\d+\.\d)%/)[1]);

      // ミス率が変化していることを確認（初期値からの変化）
      expect(updatedMissRatio).not.toBe(initialMissRatio);
    });

    test.skip('should show recent adjustments', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      const debugPanel = page.locator('#ada-debug-panel');

      // Recent Adjustmentsセクションが存在することを確認
      await expect(debugPanel.locator('h5:has-text("Recent Adjustments")')).toBeVisible();

      // 10秒間プレイして調整が発生するのを待つ
      await page.waitForTimeout(10000);

      // 調整履歴が表示されているか確認
      const adjustmentsList = debugPanel.locator('ul');
      const adjustmentItems = await adjustmentsList.locator('li').count();

      // 少なくとも1つの調整履歴があることを期待
      // （実際に調整が発生するかはゲームプレイに依存）
      console.log(`Found ${adjustmentItems} adjustment items`);
    });
  });

  test.describe('Speed Adjustment', () => {
    test.skip('should apply speed multiplier based on miss ratio', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      const debugPanel = page.locator('#ada-debug-panel');

      // 初期のSpeed Multiplierを取得
      const initialSpeedText = await debugPanel.locator('p:has-text("Speed Multiplier")').textContent();
      const initialSpeed = parseFloat(initialSpeedText.match(/Speed Multiplier: (\d+\.\d{2})/)[1]);

      // 初期値は1.00であることを確認
      expect(initialSpeed).toBe(1.0);

      // 15秒間プレイして速度調整を観察
      await page.waitForTimeout(15000);

      // 更新されたSpeed Multiplierを取得
      const updatedSpeedText = await debugPanel.locator('p:has-text("Speed Multiplier")').textContent();
      const updatedSpeed = parseFloat(updatedSpeedText.match(/Speed Multiplier: (\d+\.\d{2})/)[1]);

      // 速度が調整されていることを確認（範囲: 0.5 - 2.0）
      expect(updatedSpeed).toBeGreaterThanOrEqual(0.5);
      expect(updatedSpeed).toBeLessThanOrEqual(2.0);

      console.log(`Speed multiplier changed from ${initialSpeed} to ${updatedSpeed}`);
    });

    test.skip('should show angle randomness adjustment', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      const debugPanel = page.locator('#ada-debug-panel');

      // Angle Randomnessが表示されることを確認
      const angleText = await debugPanel.locator('p:has-text("Angle Randomness")').textContent();
      expect(angleText).toMatch(/Angle Randomness: \d+\.\d{2}/);

      const angleValue = parseFloat(angleText.match(/Angle Randomness: (\d+\.\d{2})/)[1]);

      // Angle Randomnessの範囲を確認（0.0 - 1.0）
      expect(angleValue).toBeGreaterThanOrEqual(0.0);
      expect(angleValue).toBeLessThanOrEqual(1.0);
    });
  });

  test.describe('Evaluation Window', () => {
    test.skip('should track total attempts', async ({ page }) => {
      // Note: ADAデバッグモードは現在実装されていないため、スキップ
      // デバッグモードを有効化
      await page.keyboard.press('d');
      await page.waitForTimeout(500);

      const debugPanel = page.locator('#ada-debug-panel');

      // Total Attemptsの初期値を取得
      const initialAttemptsText = await debugPanel.locator('p:has-text("Total Attempts")').textContent();
      const initialAttempts = parseInt(initialAttemptsText.match(/Total Attempts: (\d+)/)[1]);

      // パドルを動かしてボールを打ち返す
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
      }

      // 5秒後にTotal Attemptsが増加していることを確認
      await page.waitForTimeout(5000);

      const updatedAttemptsText = await debugPanel.locator('p:has-text("Total Attempts")').textContent();
      const updatedAttempts = parseInt(updatedAttemptsText.match(/Total Attempts: (\d+)/)[1]);

      // Total Attemptsが増加していることを確認
      expect(updatedAttempts).toBeGreaterThan(initialAttempts);

      console.log(`Total attempts increased from ${initialAttempts} to ${updatedAttempts}`);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle ADA errors gracefully', async ({ page }) => {
      // コンソールエラーを監視
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
          consoleErrors.push(msg.text());
        }
      });

      // デバッグモードのトグルを複数回実行
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('d');
        await page.waitForTimeout(100);
      }

      // 高速でゲームをリスタート
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('r');
        await page.waitForTimeout(500);
      }

      // ADA関連のエラーがないことを確認
      const adaErrors = consoleErrors.filter(
        error => error.includes('ada') || error.includes('ADA') || error.includes('adjustment')
      );

      expect(adaErrors.length).toBe(0);
    });
  });
});
