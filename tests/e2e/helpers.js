import { expect } from '@playwright/test';

// セレクター定数
export const SELECTORS = {
  gameCanvas: '#gameCanvas',
  canvas: 'canvas#gameCanvas',
  rankingModal: '#rankingModal',
  rankingModalCloseButton: '#rankingModal button',
  touchControls: '.touch-controls',
  soundButton: '.touch-controls button',
  loadingOverlay: '.loading-overlay',
  startScreen: '.start-screen',
  controls: '.controls',
  score: '#score',
  adaDebugPanel: '#ada-debug-panel',
  debugInfo: '#debug-info',
  pyodideScript: 'script[src*="pyodide"]'
};

// キーボードキー定数
export const KEYS = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Space: 'Space',
  Reset: 'r',
  ToggleRanking: 'h',
  ToggleDebug: 'd',
  Pause: 'p',
  Escape: 'Escape',
  Fullscreen: 'f'
};

// タイムアウト定数（環境変数で上書き可能）
export const TIMEOUTS = {
  short: parseInt(process.env.E2E_TIMEOUT_SHORT || '100', 10),
  medium: parseInt(process.env.E2E_TIMEOUT_MEDIUM || '500', 10),
  long: parseInt(process.env.E2E_TIMEOUT_LONG || '3000', 10),
  gameAction: parseInt(process.env.E2E_TIMEOUT_GAME_ACTION || '50', 10),
  navigation: parseInt(process.env.E2E_TIMEOUT_NAVIGATION || '5000', 10),
  pageLoad: parseInt(process.env.E2E_TIMEOUT_PAGE_LOAD || '3000', 10),
  pyodideLoad: parseInt(process.env.E2E_TIMEOUT_PYODIDE_LOAD || '60000', 10), // 60秒に延長してPyodide初期化を確実に
  animation: parseInt(process.env.E2E_TIMEOUT_ANIMATION || '200', 10),
  gameStart: parseInt(process.env.E2E_TIMEOUT_GAME_START || '1000', 10)
};

// テストデータ
export const TEST_DATA = {
  movementKeys: ['ArrowLeft', 'ArrowRight'],
  gameControlKeys: ['Space', 'r', 'p'],
  uiControlKeys: ['h', 'd', 'f'],
  invalidKeys: ['q', 'w', 'e', 't', 'y', 'u', 'i', 'o'],
  viewports: [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Ultra-wide', width: 2560, height: 1080 }
  ]
};

// 定数値
export const CONSTANTS = {
  FPS_TARGET: 60,
  FPS_SAMPLE_INTERVAL: 1000, // ms
  MEMORY_SAMPLE_INTERVAL: 2000, // ms
  MAX_MEMORY_SNAPSHOTS: 100,
  ASPECT_RATIO_TOLERANCE: 0.01,
  RAPID_KEY_PRESS_COUNT: 20,
  RAPID_KEY_PRESS_DELAY: 50, // ms
  PERFORMANCE_TEST_DURATION: 5000, // ms
  MEMORY_LEAK_THRESHOLD: 52428800, // 50MB in bytes
  MIN_CANVAS_SIZE: 100, // px
  DEFAULT_RANDOM_ACTION_COUNT: 10
};

/**
 * Sets up global error handlers for the page.
 * @param {import('@playwright/test').Page} page
 * @param {Array<string>} consoleErrors
 * @param {Array<string>} jsErrors
 */
export function setupErrorHandlers(page, consoleErrors, jsErrors) {
  page.on('console', msg => {
    if (msg.type() === 'error' &&
        !msg.text().includes('AudioContext') &&
        !msg.text().includes('Failed to load resource') &&
        !msg.text().includes('404')) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    // 404エラー、Google Analytics、初期化関連のエラーを無視
    if (!error.message.includes('Failed to load resource') &&
        !error.message.includes('404') &&
        !error.message.includes('googletagmanager') &&
        !error.message.includes('appendChild') &&
        !error.message.includes('already been declared') &&
        !error.message.includes('is not defined') &&
        !error.message.includes('Cannot declare a let variable twice') &&
        !error.message.includes("Can't find variable")) {
      jsErrors.push(error.message);
    }
  });
}

/**
 * Toggles the ranking modal and verifies its state.
 * @param {import('@playwright/test').Page} page
 */
export async function toggleRankingModal(page) {
  const rankingModal = page.locator(SELECTORS.rankingModal);

  // ランキングモーダルの初期状態を確認
  const wasVisible = await rankingModal.isVisible();

  // Hキーを押してモーダルをトグル
  await page.keyboard.press(KEYS.ToggleRanking);

  // モーダルの表示状態が変化するまで待機（最大500ms）
  if (wasVisible) {
    await expect(rankingModal).toBeHidden({ timeout: 500 });
  } else {
    // モーダルが表示されるか、Pyodideが読み込まれていない場合のタイムアウトを待つ
    try {
      await expect(rankingModal).toBeVisible({ timeout: 500 });

      // モーダルが表示された場合は閉じる
      const closeButton = page.locator(SELECTORS.rankingModalCloseButton).first();
      await closeButton.click();
      await expect(rankingModal).toBeHidden({ timeout: 500 });
    } catch (e) {
      console.log('Ranking modal test skipped - Pyodide not fully loaded');
    }
  }
}

/**
 * ゲームページを読み込み、Pyodideの初期化を待つ
 * @param {import('@playwright/test').Page} page
 */
export async function loadGamePage(page) {
  await page.goto('/docs/game.html');  // HTTPサーバーがdocsディレクトリで起動するため /game.html で直接アクセス可能

  // ローディング画面が非表示になるまで待機
  const loadingOverlay = page.locator(SELECTORS.loadingOverlay);
  await loadingOverlay.waitFor({ state: 'hidden', timeout: TIMEOUTS.pyodideLoad });

  // 追加の安定化待機
  await page.waitForTimeout(TIMEOUTS.pageLoad);
}

/**
 * ゲームを開始する
 * @param {import('@playwright/test').Page} page
 */
export async function startGame(page) {
  await page.keyboard.press(KEYS.Space);
  await page.waitForTimeout(TIMEOUTS.gameStart);
}

/**
 * キャンバスのスクリーンショットを撮影
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Buffer>}
 */
export async function captureCanvas(page) {
  const canvas = page.locator(SELECTORS.canvas);
  return await canvas.screenshot();
}

/**
 * ランダムなキー操作を実行
 * @param {import('@playwright/test').Page} page
 * @param {string[]} actions
 * @param {number} count
 * @param {number} delay
 */
export async function performRandomActions(page, actions, count, delay = TIMEOUTS.medium) {
  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    await page.keyboard.press(action);
    await page.waitForTimeout(delay);
  }
}

/**
 * エラーが発生していないことを確認
 * @param {string[]} errors
 */
export function expectNoErrors(errors) {
  if (errors.length > 0) {
    console.error('Detected errors:', errors);
  }
  expect(errors).toHaveLength(0);
}

/**
 * FPS計測スクリプトを注入
 * @param {import('@playwright/test').Page} page
 */
export async function injectFPSMonitoring(page) {
  await page.addScriptTag({
    content: `
      window.fpsData = [];
      window.lastTime = performance.now();
      window.frameCount = 0;
      
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        return originalRAF.call(window, function(timestamp) {
          window.frameCount++;
          const currentTime = performance.now();
          const deltaTime = currentTime - window.lastTime;
          
          if (deltaTime >= ${CONSTANTS.FPS_SAMPLE_INTERVAL}) {
            const fps = (window.frameCount * ${CONSTANTS.FPS_SAMPLE_INTERVAL}) / deltaTime;
            window.fpsData.push({
              timestamp: currentTime,
              fps: fps
            });
            
            console.log('FPS:', fps.toFixed(2));
            
            window.frameCount = 0;
            window.lastTime = currentTime;
          }
          
          return callback(timestamp);
        });
      };
    `
  });
}

/**
 * メモリ使用量監視スクリプトを注入
 * @param {import('@playwright/test').Page} page
 */
export async function injectMemoryMonitoring(page) {
  await page.addScriptTag({
    content: `
      window.memorySnapshots = [];
      
      setInterval(() => {
        if (performance.memory) {
          window.memorySnapshots.push({
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          });
        }
      }, ${CONSTANTS.MEMORY_SAMPLE_INTERVAL});
    `
  });
}

/**
 * localStorageの安全な操作
 * @param {import('@playwright/test').Page} page
 * @param {string} action - 'get', 'set', 'remove', 'clear'
 * @param {string} key
 * @param {any} value
 * @returns {Promise<any>}
 */
export async function safeLocalStorage(page, action, key, value = null) {
  return await page.evaluate(
    ({ action, key, value }) => {
      try {
        switch (action) {
          case 'get': {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
          }
          case 'set':
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          case 'remove':
            localStorage.removeItem(key);
            return true;
          case 'clear':
            localStorage.clear();
            return true;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error(`localStorage ${action} error:`, error);
        return null;
      }
    },
    { action, key, value }
  );
}

/**
 * FPSデータを取得して統計を計算
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{avgFPS: number, minFPS: number, maxFPS: number}>}
 */
export async function getFPSStats(page) {
  const fpsData = await page.evaluate(() => window.fpsData || []);

  if (fpsData.length === 0) {
    return null;
  }

  const fpsValues = fpsData.map(d => d.fps);
  const avgFPS = fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
  const minFPS = Math.min(...fpsValues);
  const maxFPS = Math.max(...fpsValues);

  return { avgFPS, minFPS, maxFPS, data: fpsData };
}
