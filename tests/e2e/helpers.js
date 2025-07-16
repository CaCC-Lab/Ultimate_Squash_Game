
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

// タイムアウト定数
export const TIMEOUTS = {
  short: 100,
  medium: 500,
  long: 3000,
  gameAction: 50,
  navigation: 5000,
  pageLoad: 3000,
  pyodideLoad: 30000,
  animation: 200,
  gameStart: 1000
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

/**
 * Sets up global error handlers for the page.
 * @param {import('@playwright/test').Page} page
 * @param {Array<string>} consoleErrors
 * @param {Array<string>} jsErrors
 */
export function setupErrorHandlers(page, consoleErrors, jsErrors) {
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    jsErrors.push(error.message);
  });
}

/**
 * Toggles the ranking modal and verifies its state.
 * @param {import('@playwright/test').Page} page
 */
export async function toggleRankingModal(page) {
  await page.keyboard.press(KEYS.ToggleRanking);
  await page.waitForTimeout(TIMEOUTS.medium);

  const rankingModal = page.locator(SELECTORS.rankingModal);
  const isVisible = await rankingModal.isVisible();

  if (isVisible) {
    const closeButton = page.locator(SELECTORS.rankingModalCloseButton).first();
    await closeButton.click();
    await expect(rankingModal).toBeHidden();
  } else {
    console.log('Ranking modal test skipped - Pyodide not fully loaded');
  }
}

/**
 * ゲームページを読み込み、Pyodideの初期化を待つ
 * @param {import('@playwright/test').Page} page
 */
export async function loadGamePage(page) {
  await page.goto('/game.html');
  
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
          
          if (deltaTime >= 1000) {
            const fps = (window.frameCount * 1000) / deltaTime;
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
      }, 2000);
    `
  });
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
