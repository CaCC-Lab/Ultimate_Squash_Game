import { expect, test } from '@playwright/test';
import {
  expectNoErrors,
  loadGamePage,
  setupErrorHandlers
} from './helpers.js';

test.describe('PWA Features', () => {
  test.setTimeout(60000); // 60秒のタイムアウト
  let consoleErrors;
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    // エラー監視を設定
    consoleErrors = [];
    jsErrors = [];
    setupErrorHandlers(page, consoleErrors, jsErrors);

    // ゲームページを読み込み
    await loadGamePage(page);
  });

  test.afterEach(async () => {
    // 各テスト後にエラーチェック
    expectNoErrors(consoleErrors);
    expectNoErrors(jsErrors);
  });

  test.describe('Manifest', () => {
    test('should have valid manifest.json', async ({ page }) => {
      // manifest.jsonが存在することを確認
      const manifestResponse = await page.goto('./manifest.json');
      expect(manifestResponse.status()).toBe(200);

      // JSONとして解析可能か確認
      const manifest = await manifestResponse.json();

      // 必須フィールドの確認
      expect(manifest.name).toBe('Ultimate Squash Game');
      expect(manifest.short_name).toBe('UltimateSquash');
      expect(manifest.start_url).toBe('/docs/game.html');
      expect(manifest.display).toBe('fullscreen');
      expect(manifest.orientation).toBe('landscape');
      expect(manifest.theme_color).toBe('#004274');
      expect(manifest.background_color).toBe('#0c0c0c');

      // アイコンの確認
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);
      expect(manifest.icons[0].sizes).toBe('192x192');
      expect(manifest.icons[1].sizes).toBe('512x512');

      // ショートカットの確認
      expect(manifest.shortcuts).toBeDefined();
      expect(manifest.shortcuts.length).toBe(2);
      expect(manifest.shortcuts[0].name).toBe('新しいゲーム');
      expect(manifest.shortcuts[1].name).toBe('ランキング');
    });

    test('should have manifest link in HTML', async ({ page }) => {
      // HTMLにmanifestリンクが含まれているか確認
      const manifestLink = await page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveAttribute('href', 'manifest.json');
    });

    test('should have iOS meta tags', async ({ page }) => {
      // iOS用のメタタグを確認
      const iosCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
      await expect(iosCapable).toHaveAttribute('content', 'yes');

      const iosStatusBar = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
      await expect(iosStatusBar).toHaveAttribute('content', 'black-translucent');

      const iosTitle = await page.locator('meta[name="apple-mobile-web-app-title"]');
      await expect(iosTitle).toHaveAttribute('content', 'Ultimate Squash');

      const iosTouchIcon = await page.locator('link[rel="apple-touch-icon"]');
      await expect(iosTouchIcon).toHaveCount(1);
    });
  });

  test.describe('Service Worker', () => {
    test('should register service worker', async ({ page }) => {
      // Service Workerが登録されることを確認
      await page.waitForTimeout(1000); // 初期化を待つ

      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          return registrations.length > 0;
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });

    test('should have service worker file accessible', async ({ page }) => {
      // sw.jsファイルが存在することを確認
      const swResponse = await page.goto('./sw.js');
      expect(swResponse.status()).toBe(200);

      // JavaScriptファイルとして有効か確認（Content-Typeチェックはスキップ）
      const swContent = await swResponse.text();
      expect(swContent).toContain('Service Worker');
    });

    test('should cache static assets', async ({ page }) => {
      // Service Workerがアクティブになるまで待つ
      await page.waitForTimeout(1000);

      // キャッシュが作成されていることを確認
      const cacheNames = await page.evaluate(async () => {
        if ('caches' in window) {
          return await caches.keys();
        }
        return [];
      });

      expect(cacheNames.length).toBeGreaterThan(0);
      expect(cacheNames.some(name => name.includes('ultimate-squash'))).toBe(true);
    });
  });

  test.describe('Install Button', () => {
    test('should have install button in DOM', async ({ page }) => {
      // インストールボタンが存在することを確認
      const installButton = page.locator('#installButton');
      await expect(installButton).toBeAttached();

      // 初期状態では非表示
      await expect(installButton).toBeHidden();

      // 正しいテキストとクラスを持っているか
      await expect(installButton).toHaveText('📥 インストール');
      await expect(installButton).toHaveClass('install-button');
    });

    test('should have installPWA function', async ({ page }) => {
      // installPWA関数が定義されていることを確認
      const hasInstallFunction = await page.evaluate(() => {
        return typeof window.installPWA === 'function';
      });

      expect(hasInstallFunction).toBe(true);
    });

    test('should handle install button click', async ({ page }) => {
      // インストールボタンのクリックハンドラーが設定されていることを確認
      const installButton = page.locator('#installButton');
      const hasOnclick = await installButton.getAttribute('onclick');
      expect(hasOnclick).toBe('installPWA()');
    });
  });

  test.describe('Offline Support', () => {
    test('should work offline after caching', async ({ page, context }) => {
      // ページを一度読み込んでキャッシュさせる
      await page.waitForTimeout(3000); // Service Workerの初期化を待つ

      // オフラインモードに切り替え
      await context.setOffline(true);

      // ページをリロード
      await page.reload();

      // オフラインでもページが表示されることを確認
      const canvas = page.locator('#gameCanvas');
      await expect(canvas).toBeVisible();

      // ゲームタイトルが表示されることを確認
      await expect(page.locator('h1')).toHaveText('Ultimate Squash Game');

      // オンラインに戻す
      await context.setOffline(false);
    });
  });

  test.describe('Update Mechanism', () => {
    test('should have update detection logic', async ({ page }) => {
      // Service Workerの更新検知ロジックが存在することを確認
      const hasUpdateLogic = await page.evaluate(() => {
        // Service Worker登録コードに updatefound リスナーが含まれているか確認
        const scriptContent = Array.from(document.scripts)
          .map(script => script.textContent)
          .join(' ');
        return scriptContent.includes('updatefound');
      });

      expect(hasUpdateLogic).toBe(true);
    });

    test('should handle SKIP_WAITING message', async ({ page }) => {
      // Service WorkerがSKIP_WAITINGメッセージを処理できることを確認
      const swContent = await page.goto('./sw.js').then(r => r.text());
      expect(swContent).toContain('SKIP_WAITING');
      expect(swContent).toContain('skipWaiting');
    });
  });

  test.describe('Cache Management', () => {
    test('should handle CLEAR_CACHE message', async ({ page }) => {
      // Service WorkerがCLEAR_CACHEメッセージを処理できることを確認
      const swContent = await page.goto('./sw.js').then(r => r.text());
      expect(swContent).toContain('CLEAR_CACHE');
      expect(swContent).toContain('caches.delete');
    });

    test('should implement cache strategies', async ({ page }) => {
      // Service Workerがキャッシュ戦略を実装していることを確認
      const swContent = await page.goto('./sw.js').then(r => r.text());

      // ネットワークファースト戦略
      expect(swContent).toContain('networkFirstStrategy');

      // キャッシュファースト戦略
      expect(swContent).toContain('cacheFirstStrategy');

      // フェッチイベントハンドラー
      expect(swContent).toContain("addEventListener('fetch'");
    });
  });

  test.describe('PWA Metadata', () => {
    test('should have correct theme color', async ({ page }) => {
      // テーマカラーが設定されていることを確認
      const themeColor = await page.locator('meta[name="theme-color"]');
      await expect(themeColor).toHaveAttribute('content', '#004274');
    });

    test('should have viewport meta tag', async ({ page }) => {
      // ビューポートメタタグが設定されていることを確認
      const viewport = await page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0');
    });

    test('should have description meta tag', async ({ page }) => {
      // 説明メタタグが設定されていることを確認
      const description = await page.locator('meta[name="description"]');
      const content = await description.getAttribute('content');
      expect(content).toContain('Ultimate Squash Game');
    });
  });
});
