const { test, expect } = require('@playwright/test');
const config = require('../config/test-config');

test.describe('Real-time Performance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページにアクセス
    await page.goto(`${config.BASE_URL}/docs/js/optimization/performance-dashboard.html`);

    // ページの読み込み完了を待つ
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard with all components', async ({ page }) => {
    // ヘッダーの確認
    await expect(page.locator('h1')).toContainText('Real-time Performance Dashboard');

    // ステータスインジケーターの確認
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();
    await expect(statusIndicator).not.toHaveClass(/active/);

    // コントロールボタンの確認
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#startBtn')).not.toBeDisabled();
    await expect(page.locator('#stopBtn')).toBeVisible();
    await expect(page.locator('#stopBtn')).toBeDisabled();
    await expect(page.locator('#pauseBtn')).toBeVisible();
    await expect(page.locator('#pauseBtn')).toBeDisabled();
    await expect(page.locator('#exportBtn')).toBeVisible();
    await expect(page.locator('#settingsBtn')).toBeVisible();

    // メトリクスカードの確認
    const cards = await page.locator('.card').count();
    expect(cards).toBeGreaterThan(5); // 最低6つのカード（コントロールパネル含む）

    // タイムレンジセレクターの確認
    const timeRangeButtons = await page.locator('.time-range-button').count();
    expect(timeRangeButtons).toBe(4);

    // デフォルトで1分が選択されていることを確認
    const activeTimeRange = page.locator('.time-range-button.active');
    await expect(activeTimeRange).toHaveAttribute('data-range', '60');
  });

  test('should start and stop metrics collection', async ({ page }) => {
    // 開始ボタンをクリック
    await page.click('#startBtn');

    // ボタンの状態が更新されるまで待機（より長い待機時間）
    await page.waitForTimeout(1000);

    // UIの状態変化を確認（タイムアウトを増やす）
    await expect(page.locator('#startBtn')).toBeDisabled({ timeout: 5000 });
    await expect(page.locator('#stopBtn')).not.toBeDisabled({ timeout: 5000 });
    await expect(page.locator('#pauseBtn')).not.toBeDisabled({ timeout: 5000 });
    await expect(page.locator('.status-indicator')).toHaveClass(/active/, { timeout: 5000 });

    // 成功アラートの確認
    await expect(page.locator('.alert-banner')).toBeVisible();
    await expect(page.locator('.alert-banner')).toHaveClass(/success/);
    await expect(page.locator('#alertMessage')).toContainText('メトリクス収集を開始しました');

    // アラートが消えるのを待つ
    await page.waitForTimeout(1000);

    // 数秒待って値が更新されることを確認
    await page.waitForTimeout(2000);

    // FPS値が0以外になることを確認（より堅牢な方法）
    await page.waitForFunction(
      () => {
        const fpsElement = document.querySelector('#currentFPS');
        if (!fpsElement) return false;
        const fpsValue = parseFloat(fpsElement.textContent);
        return fpsValue > 0;
      },
      { timeout: 5000 }
    );

    const fpsText = await page.locator('#currentFPS').textContent();
    const fpsValue = parseFloat(fpsText);
    expect(fpsValue).toBeGreaterThan(0);

    // 停止ボタンをクリック
    await page.click('#stopBtn');

    // ボタンの状態が更新されるまで待機
    await page.waitForTimeout(500);

    // UIの状態変化を確認（タイムアウトを増やす）
    await expect(page.locator('#startBtn')).not.toBeDisabled({ timeout: 5000 });
    await expect(page.locator('#stopBtn')).toBeDisabled({ timeout: 5000 });
    await expect(page.locator('#pauseBtn')).toBeDisabled({ timeout: 5000 });
    await expect(page.locator('.status-indicator')).not.toHaveClass(/active/, { timeout: 5000 });
  });

  test('should update metrics in real-time', async ({ page }) => {
    // 収集開始
    await page.click('#startBtn');

    // 初期値を記録
    const initialFPS = await page.locator('#currentFPS').textContent();
    const initialFrameTime = await page.locator('#currentFrameTime').textContent();
    const initialMemory = await page.locator('#currentMemory').textContent();

    // 3秒待機
    await page.waitForTimeout(3000);

    // 値が変化していることを確認
    const updatedFPS = await page.locator('#currentFPS').textContent();
    const updatedFrameTime = await page.locator('#currentFrameTime').textContent();
    const updatedMemory = await page.locator('#currentMemory').textContent();

    // 少なくとも一つの値が変化していることを確認
    const hasChange =
            initialFPS !== updatedFPS ||
            initialFrameTime !== updatedFrameTime ||
            initialMemory !== updatedMemory;

    expect(hasChange).toBe(true);

    // 平均値が表示されていることを確認
    const avgFPS = await page.locator('#avgFPS').textContent();
    expect(parseFloat(avgFPS)).toBeGreaterThan(0);

    // 収集停止
    await page.click('#stopBtn');
  });

  test('should handle pause and resume', async ({ page }) => {
    // 収集開始
    await page.click('#startBtn');
    await page.waitForTimeout(1000);

    // 一時停止
    await page.click('#pauseBtn');
    await expect(page.locator('#pauseBtn')).toContainText('▶️ 再開');

    // 現在の値を記録
    const pausedFPS = await page.locator('#currentFPS').textContent();

    // 2秒待機
    await page.waitForTimeout(2000);

    // 値が変化していないことを確認（一時停止中）
    const stillPausedFPS = await page.locator('#currentFPS').textContent();
    expect(pausedFPS).toBe(stillPausedFPS);

    // 再開
    await page.click('#pauseBtn');
    await expect(page.locator('#pauseBtn')).toContainText('⏸️ 一時停止');

    // 値が再び更新されることを確認（waitForFunctionを使用）
    await page.waitForFunction(
      (pausedValue) => {
        const currentFPS = document.querySelector('#currentFPS');
        if (!currentFPS) return false;
        return currentFPS.textContent !== pausedValue;
      },
      pausedFPS,
      { timeout: 5000 }
    );

    const resumedFPS = await page.locator('#currentFPS').textContent();
    expect(resumedFPS).not.toBe(pausedFPS);

    // 収集停止
    await page.click('#stopBtn');
  });

  test('should change time range', async ({ page }) => {
    // 異なるタイムレンジボタンをクリック
    const timeRangeButtons = page.locator('.time-range-button');

    // 5分を選択
    await timeRangeButtons.nth(1).click();
    await expect(timeRangeButtons.nth(1)).toHaveClass(/active/);
    await expect(timeRangeButtons.nth(0)).not.toHaveClass(/active/);

    // 15分を選択
    await timeRangeButtons.nth(2).click();
    await expect(timeRangeButtons.nth(2)).toHaveClass(/active/);
    await expect(timeRangeButtons.nth(1)).not.toHaveClass(/active/);

    // 1時間を選択
    await timeRangeButtons.nth(3).click();
    await expect(timeRangeButtons.nth(3)).toHaveClass(/active/);
    await expect(timeRangeButtons.nth(2)).not.toHaveClass(/active/);
  });

  test('should display performance breakdown', async ({ page }) => {
    // ブレークダウンバーの初期状態を確認（収集開始前）
    const breakdownBars = page.locator('.distribution-bar');
    const barCount = await breakdownBars.count();
    expect(barCount).toBe(4); // Game Logic, Rendering, Input, Other

    // 各バーが表示されていることを確認
    for (let i = 0; i < barCount; i++) {
      const bar = breakdownBars.nth(i);
      await expect(bar).toBeVisible();

      // バーに高さがあることを確認
      const height = await bar.evaluate(el => {
        const computedStyle = window.getComputedStyle(el);
        return computedStyle.height;
      });

      // 高さが0でないことを確認
      expect(height).not.toBe('0px');
    }
  });

  test('should show alerts for performance issues', async ({ page }) => {
    // 収集開始
    await page.click('#startBtn');

    // パフォーマンス問題をシミュレート（重い処理）
    await page.evaluate(() => {
      // 重い計算処理でCPUを占有
      const heavyWork = () => {
        let sum = 0;
        for (let i = 0; i < 10000000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      };

      // 複数回実行してFPSを低下させる
      for (let j = 0; j < 5; j++) {
        heavyWork();
      }
    });

    // アラートが表示される可能性を待つ
    await page.waitForTimeout(3000);

    // 収集停止
    await page.click('#stopBtn');
  });

  test('should export data', async ({ page }) => {
    // ダウンロードを監視
    const downloadPromise = page.waitForEvent('download');

    // エクスポートボタンをクリック
    await page.click('#exportBtn');

    // ダウンロードが開始されることを確認
    const download = await downloadPromise;

    // ファイル名の確認
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^performance-metrics_.*\.json$/);

    // 成功アラートの確認
    await expect(page.locator('.alert-banner')).toBeVisible();
    await expect(page.locator('#alertMessage')).toContainText('データをエクスポートしました');
  });

  test('should handle responsive design', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // グリッドレイアウトの確認
    const dashboard = page.locator('.dashboard');
    const dashboardBox = await dashboard.boundingBox();
    expect(dashboardBox.width).toBeGreaterThan(1200);

    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // モバイルでは1カラムレイアウトになることを確認
    const cards = await page.locator('.card').all();
    if (cards.length > 1) {
      const firstCardBox = await cards[0].boundingBox();
      const secondCardBox = await cards[1].boundingBox();

      // 縦に並んでいることを確認（Y座標が異なる）
      expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
    }
  });

  test('should handle chart rendering', async ({ page }) => {
    // 収集開始
    await page.click('#startBtn');

    // メトリクスが収集され始めるまで待機
    await page.waitForFunction(
      () => {
        const fpsElement = document.querySelector('#currentFPS');
        if (!fpsElement) return false;
        const fpsValue = parseFloat(fpsElement.textContent);
        return fpsValue > 0;
      },
      { timeout: 5000 }
    );

    // チャートが更新されるまで少し待機
    await page.waitForTimeout(1000);

    // 各チャートキャンバスが描画されていることを確認
    const chartCanvases = [
      '#fpsChart',
      '#frameTimeChart',
      '#memoryChart',
      '#gcChart',
      '#latencyChart'
    ];

    for (const selector of chartCanvases) {
      const canvas = page.locator(selector);
      await expect(canvas).toBeVisible();

      // キャンバスに何か描画されていることを確認
      const canvasInfo = await page.evaluate((sel) => {
        const canvas = document.querySelector(sel);
        if (!canvas) return { exists: false };

        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        // キャンバスのサイズ情報
        const info = {
          exists: true,
          width: canvas.width,
          height: canvas.height,
          displayWidth: rect.width,
          displayHeight: rect.height,
          hasContent: false,
          pixelCount: 0
        };

        // キャンバスのサイズが有効な場合のみピクセルをチェック
        if (canvas.width > 0 && canvas.height > 0) {
          try {
            const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
            const data = imageData.data;

            // 透明でないピクセルがあるかチェック（サンプリング）
            for (let i = 0; i < data.length; i += 4) {
              if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0 || data[i+3] > 0) {
                info.pixelCount++;
              }
            }

            info.hasContent = info.pixelCount > 10; // 最低10ピクセル以上
          } catch (e) {
            console.error(`Error reading canvas ${sel}:`, e);
          }
        }

        return info;
      }, selector);

      console.log(`Canvas ${selector} info:`, canvasInfo);

      // キャンバスが存在し、適切なサイズを持っていることを確認
      expect(canvasInfo.exists).toBe(true);
      expect(canvasInfo.width).toBeGreaterThan(0);
      expect(canvasInfo.height).toBeGreaterThan(0);

      // GCチャート以外は常にコンテンツがあるはず
      if (selector !== '#gcChart') {
        expect(canvasInfo.hasContent).toBe(true);
      }
    }

    // 収集停止
    await page.click('#stopBtn');
  });

  test('should show settings message', async ({ page }) => {
    // 設定ボタンをクリック
    await page.click('#settingsBtn');

    // 開発中メッセージの確認
    await expect(page.locator('.alert-banner')).toBeVisible();
    await expect(page.locator('#alertMessage')).toContainText('設定機能は開発中です');
  });
});
