/**
 * CSP（Content Security Policy）のテスト
 * Report-Onlyモードで違反を検出し、本番適用前に問題を特定
 */

import { test, expect } from '@playwright/test';

test.describe('CSPセキュリティテスト', () => {
  let cspViolations = [];

  test.beforeEach(async ({ page }) => {
    // CSP違反をキャプチャ
    cspViolations = [];

    page.on('console', msg => {
      if (msg.text().includes('CSP Violation')) {
        cspViolations.push(msg.text());
      }
    });

    // セキュリティポリシー違反イベントを監視
    await page.addInitScript(() => {
      window.cspViolationsDetected = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.cspViolationsDetected.push({
          violatedDirective: e.violatedDirective,
          blockedURI: e.blockedURI,
          sourceFile: e.sourceFile,
          lineNumber: e.lineNumber
        });
      });
    });
  });

  test('ゲームページのCSP違反チェック', async ({ page }) => {
    console.log('🛡️ CSPテスト開始...');

    await page.goto('http://localhost:3000/docs/game.html');
    await page.waitForLoadState('networkidle');

    // ゲームが完全に初期化されるまで待機
    await page.waitForTimeout(5000);

    // ページ内のCSP違反を取得
    const violations = await page.evaluate(() => window.cspViolationsDetected || []);

    console.log(`📊 検出されたCSP違反: ${violations.length}件`);

    if (violations.length > 0) {
      console.log('⚠️ CSP違反の詳細:');
      violations.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.violatedDirective}: ${v.blockedURI}`);
        if (v.sourceFile) {
          console.log(`     Source: ${v.sourceFile}:${v.lineNumber}`);
        }
      });
    }

    // 重要な違反がないことを確認
    const criticalViolations = violations.filter(v =>
      !v.blockedURI.includes('unsafe-inline') &&
            !v.blockedURI.includes('unsafe-eval')
    );

    expect(criticalViolations.length).toBe(0);

    // CSPヘッダーが正しく設定されているか確認
    const cspMeta = await page.locator('meta[http-equiv="Content-Security-Policy-Report-Only"]');
    await expect(cspMeta).toBeAttached();

    const cspContent = await cspMeta.getAttribute('content');
    expect(cspContent).toContain('default-src');
    expect(cspContent).toContain('script-src');
    expect(cspContent).toContain('style-src');

    console.log('✅ CSP設定が正しく適用されています');
  });

  test('AI機能のCSP互換性チェック', async ({ page }) => {
    console.log('🤖 AI機能のCSP互換性テスト開始...');

    await page.goto('http://localhost:3000/docs/game.html');
    await page.waitForLoadState('networkidle');

    // AI機能の初期化を待つ
    await page.waitForFunction(() => window.gameAI !== undefined, { timeout: 10000 });

    // AIトグルボタンをクリック
    const aiToggle = page.locator('#ai-toggle-button');
    await aiToggle.click();
    await page.waitForTimeout(1000);

    // CSP違反を確認
    const violations = await page.evaluate(() => window.cspViolationsDetected || []);
    const aiRelatedViolations = violations.filter(v =>
      v.sourceFile && v.sourceFile.includes('/ai/')
    );

    console.log(`📊 AI関連のCSP違反: ${aiRelatedViolations.length}件`);

    expect(aiRelatedViolations.length).toBe(0);
    console.log('✅ AI機能はCSPと互換性があります');
  });

  test('外部リソースのCSP検証', async ({ page }) => {
    console.log('🌐 外部リソースのCSP検証開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // ネットワークリクエストを監視
    const blockedRequests = [];
    page.on('requestfailed', request => {
      if (request.failure()?.errorText.includes('csp')) {
        blockedRequests.push({
          url: request.url(),
          resourceType: request.resourceType()
        });
      }
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log(`📊 CSPによりブロックされたリクエスト: ${blockedRequests.length}件`);

    if (blockedRequests.length > 0) {
      console.log('🚫 ブロックされたリソース:');
      blockedRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.resourceType}: ${req.url}`);
      });
    }

    // 必要なリソースがブロックされていないことを確認
    const criticalBlocked = blockedRequests.filter(req =>
      req.url.includes('pyodide') ||
            req.url.includes('pygame')
    );

    expect(criticalBlocked.length).toBe(0);
    console.log('✅ 重要なリソースは正しく読み込まれています');
  });

  test('CSPレポーターの動作確認', async ({ page }) => {
    console.log('📝 CSPレポーターの動作確認...');

    await page.goto('http://localhost:3000/docs/game.html');
    await page.waitForLoadState('networkidle');

    // レポーター関数が存在することを確認
    const hasReporter = await page.evaluate(() =>
      typeof window.getCSPViolationSummary === 'function'
    );

    expect(hasReporter).toBe(true);

    // サマリーを取得
    const summary = await page.evaluate(() => {
      window.getCSPViolationSummary();
      return window.cspViolations || {};
    });

    console.log('📊 CSP違反サマリー:');
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}回`);
    });

    console.log('✅ CSPレポーターが正常に動作しています');
  });
});
