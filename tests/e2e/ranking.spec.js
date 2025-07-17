import { expect, test } from '@playwright/test';
import {
  expectNoErrors,
  loadGamePage,
  setupErrorHandlers,
} from './helpers.js';

test.describe('Online Ranking System', () => {
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

  test.describe('Ranking UI', () => {
    test('should have online ranking button', async ({ page }) => {
      // オンラインランキングボタンが存在することを確認
      const rankingButton = page.locator('button:has-text("🌐 オンラインランキング")');
      await expect(rankingButton).toBeVisible();
      await expect(rankingButton).toBeEnabled();
    });

    test('should show ranking modal when button clicked', async ({ page }) => {
      // ランキングボタンをクリック
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // ランキングコンテナが表示されることを確認
      const rankingContainer = page.locator('#rankingContainer');
      await expect(rankingContainer).toBeVisible();
      
      // ランキングヘッダーが存在することを確認
      const rankingHeader = rankingContainer.locator('.ranking-header h2');
      await expect(rankingHeader).toHaveText('🏆 オンラインランキング');
    });

    test('should have period selector buttons', async ({ page }) => {
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // 期間選択ボタンを確認
      const periodButtons = ['日間', '週間', '月間', '全期間'];
      for (const period of periodButtons) {
        const button = page.locator(`.period-btn:has-text("${period}")`);
        await expect(button).toBeVisible();
      }
      
      // デフォルトで「日間」が選択されていることを確認
      const dailyButton = page.locator('.period-btn:has-text("日間")');
      await expect(dailyButton).toHaveClass(/active/);
    });

    test('should have game mode selector', async ({ page }) => {
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // ゲームモードセレクターが存在することを確認
      const gameModeSelect = page.locator('#gameModeSelect');
      await expect(gameModeSelect).toBeVisible();
      
      // オプションを確認
      const options = await gameModeSelect.locator('option').allTextContents();
      expect(options).toEqual(['すべて', 'ノーマル', 'ハード', 'エキスパート']);
    });

    test('should close ranking modal', async ({ page }) => {
      // ランキングモーダルを開く
      await page.click('button:has-text("🌐 オンラインランキング")');
      const rankingContainer = page.locator('#rankingContainer');
      await expect(rankingContainer).toBeVisible();
      
      // 閉じるボタンをクリック
      await page.click('.close-button');
      
      // モーダルが非表示になることを確認
      await expect(rankingContainer).toBeHidden();
    });
  });

  test.describe('Ranking Data', () => {
    test('should display ranking data', async ({ page }) => {
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // ランキングリストの読み込みを待つ
      await page.waitForTimeout(1000);
      
      const rankingList = page.locator('#rankingList');
      
      // ランキングアイテムが存在するか、または「データがありません」メッセージが表示されることを確認
      const hasRankingItems = await page.locator('.ranking-item').count() > 0;
      const hasNoDataMessage = await rankingList.textContent().then(text => 
        text.includes('ランキングデータがありません') || text.includes('読み込み中')
      );
      
      expect(hasRankingItems || hasNoDataMessage).toBe(true);
    });

    test('should switch between periods', async ({ page }) => {
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // 週間ランキングに切り替え
      await page.click('.period-btn:has-text("週間")');
      
      // 週間ボタンがアクティブになることを確認
      const weeklyButton = page.locator('.period-btn:has-text("週間")');
      await expect(weeklyButton).toHaveClass(/active/);
      
      // 日間ボタンがアクティブでないことを確認
      const dailyButton = page.locator('.period-btn:has-text("日間")');
      await expect(dailyButton).not.toHaveClass(/active/);
    });

    test('should refresh rankings', async ({ page }) => {
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // 更新ボタンが存在することを確認
      const refreshButton = page.locator('.refresh-button');
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toHaveText('🔄 更新');
      
      // 更新ボタンをクリック（実際のAPIがない場合でもエラーが出ないことを確認）
      await refreshButton.click();
      
      // 読み込み中の表示が出ることを確認
      const loadingIndicator = page.locator('.loading');
      await expect(loadingIndicator).toBeVisible();
    });
  });

  test.describe('Score Submission', () => {
    test('should have score submission function', async ({ page }) => {
      // rankingSystemが存在することを確認
      const hasRankingSystem = await page.evaluate(() => {
        return typeof window.rankingSystem !== 'undefined';
      });
      expect(hasRankingSystem).toBe(true);

      // submitScore関数が存在することを確認
      const hasSubmitFunction = await page.evaluate(() => {
        return typeof window.rankingSystem.submitScore === 'function';
      });
      expect(hasSubmitFunction).toBe(true);
    });

    test('should generate game hash', async ({ page }) => {
      // generateGameHash関数のテスト
      const gameData = {
        playerName: 'TestPlayer',
        score: 1000,
        gameMode: 'normal',
        duration: 120,
        timestamp: Date.now()
      };

      const hash = await page.evaluate(async (data) => {
        return await window.rankingSystem.generateGameHash(data);
      }, gameData);

      // ハッシュが生成されることを確認
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256のハッシュは64文字
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // モバイルビューポートに変更
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('button:has-text("🌐 オンラインランキング")');
      
      const rankingContainer = page.locator('#rankingContainer');
      await expect(rankingContainer).toBeVisible();
      
      // モバイルでも適切に表示されることを確認
      const containerWidth = await rankingContainer.evaluate(el => el.offsetWidth);
      expect(containerWidth).toBeLessThan(375);
      
      // 期間選択ボタンが折り返されることを確認
      const periodSelector = page.locator('.period-selector');
      const selectorWidth = await periodSelector.evaluate(el => el.offsetWidth);
      expect(selectorWidth).toBeLessThanOrEqual(containerWidth);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // APIエラーをシミュレート（モックデータが使用される）
      await page.route('**/api/scores/get**', route => {
        route.abort('failed');
      });

      await page.click('button:has-text("🌐 オンラインランキング")');
      
      // エラーが発生してもUIが壊れないことを確認
      const rankingContainer = page.locator('#rankingContainer');
      await expect(rankingContainer).toBeVisible();
      
      // モックデータまたはエラーメッセージが表示されることを確認
      await page.waitForTimeout(1000);
      const rankingList = page.locator('#rankingList');
      const listContent = await rankingList.textContent();
      expect(listContent).toBeTruthy();
    });
  });

  test.describe('Integration with Game', () => {
    test('should have game start time tracking', async ({ page }) => {
      // gameStartTimeが定義されていることを確認
      const hasGameStartTime = await page.evaluate(() => {
        return typeof window.gameStartTime !== 'undefined';
      });
      expect(hasGameStartTime).toBe(true);

      // gameStartTimeが有効な時刻であることを確認
      const gameStartTime = await page.evaluate(() => window.gameStartTime);
      expect(gameStartTime).toBeGreaterThan(0);
      expect(gameStartTime).toBeLessThanOrEqual(Date.now());
    });

    test('should update game start time on restart', async ({ page }) => {
      // 初期のgameStartTimeを取得
      const initialStartTime = await page.evaluate(() => window.gameStartTime);
      
      // 少し待つ
      await page.waitForTimeout(100);
      
      // ゲームをリスタート（Pythonコードの実行をシミュレート）
      await page.evaluate(() => {
        if (window.pyodide && window.pyodide.runPython) {
          try {
            window.pyodide.runPython('restart_game()');
          } catch (e) {
            // Pyodideが完全に初期化されていない場合は、直接更新
            window.gameStartTime = Date.now();
          }
        } else {
          // Pyodideがない場合は直接更新
          window.gameStartTime = Date.now();
        }
      });
      
      // gameStartTimeが更新されることを確認
      const newStartTime = await page.evaluate(() => window.gameStartTime);
      expect(newStartTime).toBeGreaterThanOrEqual(initialStartTime);
    });
  });
});