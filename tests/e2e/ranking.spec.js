import { expect, test } from '@playwright/test';
import {
  expectNoErrors,
  loadGamePage,
  setupErrorHandlers,
} from './helpers.js';

// Mock API responses
const mockRankingData = (period, gameMode) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify([
    { rank: 1, name: `Player1-${period}-${gameMode}`, score: 1000 },
    { rank: 2, name: `Player2-${period}-${gameMode}`, score: 900 },
  ]),
});

const mockErrorResponse = {
  status: 500,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'Internal Server Error' }),
};

const mockSubmitSuccess = {
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'Score submitted successfully' }),
};

const mockSubmitError = {
  status: 500,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'Submission failed' }),
};

test.describe('Online Ranking System Characterization', () => {
  test.setTimeout(60000);
  let consoleErrors;
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    jsErrors = [];
    setupErrorHandlers(page, consoleErrors, jsErrors);
    await loadGamePage(page);
    // Open the ranking modal for most tests
    await page.click('button:has-text("🌐 オンラインランキング")');
  });

  test.afterEach(() => {
    expectNoErrors(consoleErrors);
    expectNoErrors(jsErrors);
  });

  test.describe('Initial State', () => {
    test('should display initial ranking view correctly', async ({ page }) => {
      const rankingContainer = page.locator('#rankingContainer');
      await expect(rankingContainer).toBeVisible();
      
      // 1. Verify default period is "Daily"
      const dailyButton = page.locator('.period-btn:has-text("日間")');
      await expect(dailyButton).toHaveClass(/active/);

      // 2. Verify default game mode is "All"
      const gameModeSelect = page.locator('#gameModeSelect');
      await expect(gameModeSelect).toHaveValue('all');

      // 3. Verify ranking list shows loading then content
      await expect(page.locator('#rankingList .loading')).toBeVisible();
      await expect(page.locator('.ranking-item').first()).toBeVisible({ timeout: 10000 });
      const rankingItems = await page.locator('.ranking-item').count();
      expect(rankingItems).toBeGreaterThan(0);
    });
  });

  test.describe('Controls and Interactions', () => {
    test('should fetch new data when switching periods', async ({ page }) => {
      const periods = ['週間', '月間', '全期間', '日間'];
      let requestCount = 0;
      
      await page.route('**/api/scores/get**', (route, request) => {
        requestCount++;
        const url = new URL(request.url());
        const period = url.searchParams.get('period');
        const gameMode = url.searchParams.get('gameMode');
        route.fulfill(mockRankingData(period, gameMode));
      });

      for (const period of periods) {
        await test.step(`Switching to ${period}`, async () => {
          await page.click(`.period-btn:has-text("${period}")`);
          await expect(page.locator(`.period-btn:has-text("${period}")`)).toHaveClass(/active/);
          
          // Wait for the new data to be rendered
          await expect(page.locator(`text=Player1-${period.toLowerCase()}-all`).first()).toBeVisible();
        });
      }
      // Initial load + 4 switches
      expect(requestCount).toBeGreaterThanOrEqual(periods.length);
    });

    test('should fetch new data when switching game modes', async ({ page }) => {
      const gameModes = [
        { value: 'normal', label: 'ノーマル' },
        { value: 'hard', label: 'ハード' },
        { value: 'expert', label: 'エキスパート' },
        { value: 'all', label: 'すべて' },
      ];
      let requestCount = 0;

      await page.route('**/api/scores/get**', (route, request) => {
        requestCount++;
        const url = new URL(request.url());
        const period = url.searchParams.get('period');
        const gameMode = url.searchParams.get('gameMode');
        route.fulfill(mockRankingData(period, gameMode));
      });

      for (const mode of gameModes) {
        await test.step(`Switching to ${mode.label}`, async () => {
          await page.selectOption('#gameModeSelect', { label: mode.label });
          await expect(page.locator('#gameModeSelect')).toHaveValue(mode.value);
          
          // Wait for the new data to be rendered
          await expect(page.locator(`text=Player1-daily-${mode.value}`).first()).toBeVisible();
        });
      }
      expect(requestCount).toBeGreaterThanOrEqual(gameModes.length);
    });

    test('should fetch new data when refresh button is clicked', async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/scores/get**', (route) => {
        requestCount++;
        route.fulfill(mockRankingData('daily', 'all'));
      });

      // Wait for initial load
      await expect(page.locator('.ranking-item').first()).toBeVisible();
      const initialRequestCount = requestCount;

      // Click refresh button
      await page.click('.refresh-button');
      await expect(page.locator('#rankingList .loading')).toBeVisible();
      
      // Wait for the list to reload
      await expect(page.locator('.ranking-item').first()).toBeVisible();
      expect(requestCount).toBe(initialRequestCount + 1);
    });
  });

  test.describe('Error Handling', () => {
    test('should show fallback message on API error', async ({ page }) => {
      // Mock a failed API request
      await page.route('**/api/scores/get**', route => {
        route.fulfill(mockErrorResponse);
      });

      // Refresh to trigger the error
      await page.click('.refresh-button');
      
      const rankingList = page.locator('#rankingList');
      await expect(rankingList.locator('.error-message')).toBeVisible();
      await expect(rankingList).toContainText('ランキングの読み込みに失敗しました');
    });
  });

  test.describe('Score Submission', () => {
    test('should show success message on successful submission', async ({ page }) => {
      await page.route('**/api/scores/submit', route => {
        route.fulfill(mockSubmitSuccess);
      });

      // Simulate submitting a score
      const result = await page.evaluate(() => {
        return window.rankingController.submitScore(
          'Test',
          1500,
          'normal',
          180
        );
      });

      // Check for success UI feedback (e.g., a toast message)
      // This depends on the actual implementation of the success notification
      // For this example, we'll assume a toast appears.
      const successToast = page.locator('.toast.success');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('スコアが正常に送信されました');
      expect(result.success).toBe(true);
    });

    test('should show error message on failed submission', async ({ page }) => {
      await page.route('**/api/scores/submit', route => {
        route.fulfill(mockSubmitError);
      });

      // Simulate a failed score submission
      const result = await page.evaluate(() => {
        return window.rankingController.submitScore(
          'TestFail',
          500,
          'hard',
          60
        );
      });

      // Check for error UI feedback
      const errorToast = page.locator('.toast.error');
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText('スコア送信に失敗しました');
      expect(result.success).toBe(false);
    });
  });
});
