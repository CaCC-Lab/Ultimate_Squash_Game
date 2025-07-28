/**
 * AI機能統合テスト - デバッグ版
 */

import { test, expect } from '@playwright/test';

test.describe('AI機能デバッグ', () => {

  test('JavaScriptエラーとAI初期化の確認', async ({ page }) => {
    console.log('🔍 デバッグ開始...');

    // コンソールメッセージを収集
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // ページエラーを収集
    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.toString());
    });

    await page.goto('http://localhost:3000/docs/game.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // 十分な初期化時間

    // エラー出力
    if (pageErrors.length > 0) {
      console.log('❌ ページエラー:');
      pageErrors.forEach(err => console.log('  ', err));
    }

    // コンソールメッセージ出力
    console.log('📝 コンソールメッセージ:');
    consoleMessages.forEach(msg => {
      if (msg.type === 'error') {
        console.log('  ❌', msg.text);
      } else {
        console.log('  ✓', msg.text);
      }
    });

    // AI関連の要素を確認
    const aiElements = await page.evaluate(() => {
      return {
        gameAI: typeof window.gameAI !== 'undefined',
        aiManager: typeof window.aiManager !== 'undefined',
        aiCommentary: typeof window.aiCommentary !== 'undefined',
        gameADA: typeof window.gameADA !== 'undefined',
        commentaryElement: !!document.getElementById('ai-commentary'),
        toggleButton: !!document.getElementById('ai-toggle-button'),
        adaPanel: !!document.getElementById('ada-info-panel'),
        bodyChildren: document.body.children.length,
        documentReady: document.readyState
      };
    });

    console.log('🤖 AI要素の状態:', aiElements);

    // DOMの内容を確認
    const bodyHTML = await page.evaluate(() => {
      const aiRelated = Array.from(document.querySelectorAll('[id*="ai"], [class*="ai"], [id*="ada"]'));
      return aiRelated.map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        display: window.getComputedStyle(el).display
      }));
    });

    console.log('📄 AI関連DOM要素:', bodyHTML);

    // スクリプトの読み込み状況を確認
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src*="ai"]')).map(script => ({
        src: script.src,
        loaded: script.loaded !== false
      }));
    });

    console.log('📜 AIスクリプト:', scripts);

    // テストアサーション
    expect(aiElements.gameAI).toBe(true);
    expect(aiElements.commentaryElement).toBe(true);
    expect(aiElements.toggleButton).toBe(true);
    expect(aiElements.adaPanel).toBe(true);
  });
});
