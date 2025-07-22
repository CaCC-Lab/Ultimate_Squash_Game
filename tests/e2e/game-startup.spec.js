import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS, setupErrorHandlers, expectNoErrors } from './helpers.js';

test.describe('Game Startup Tests', () => {
  let consoleErrors;
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    // エラー監視を設定
    consoleErrors = [];
    jsErrors = [];
    setupErrorHandlers(page, consoleErrors, jsErrors);
  });

  test.afterEach(async () => {
    // 各テスト後にエラーチェック
    expectNoErrors(consoleErrors);
    expectNoErrors(jsErrors);
  });
  test('should load the game page successfully', async ({ page }) => {
    // ゲームページに移動
    await page.goto('/docs/game.html');

    // ページタイトルの確認
    await expect(page).toHaveTitle('Ultimate Squash Game - WebAssembly版');
  });

  test('should have canvas element', async ({ page }) => {
    await page.goto('/docs/game.html');

    // キャンバス要素の存在確認
    const canvas = page.locator(SELECTORS.canvas);
    await expect(canvas).toBeVisible();

    // キャンバスのサイズ確認（レスポンシブなので存在確認のみ）
    const canvasSize = await canvas.boundingBox();
    expect(canvasSize).toBeTruthy();
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
  });

  test('should show loading screen on initial load', async ({ page }) => {
    await page.goto('/docs/game.html');

    // ローディング画面が表示されることを確認
    const loadingOverlay = page.locator(SELECTORS.loadingOverlay);
    await expect(loadingOverlay).toBeVisible();

    // ローディングテキストの確認（日本語）
    await expect(loadingOverlay).toContainText('ゲーム読み込み中');
  });

  test('should display game controls', async ({ page }) => {
    await page.goto('/docs/game.html');

    // コントロール表示の確認 - div.controls内のテキスト
    const controls = page.locator(SELECTORS.controls);
    await expect(controls).toBeVisible();

    // 日本語のコントロール説明があることを確認
    await expect(controls).toContainText('ラケット移動');
    await expect(controls).toContainText('ポーズ/再開');
  });

  test('should have Pyodide script tag', async ({ page }) => {
    await page.goto('/docs/game.html');

    // Pyodideのスクリプトタグが存在することを確認（1つ以上あればOK）
    const pyodideScript = page.locator(SELECTORS.pyodideScript);
    const count = await pyodideScript.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
