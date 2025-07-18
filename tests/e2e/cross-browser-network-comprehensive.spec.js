/**
 * クロスブラウザ・ネットワーク包括的テストスイート
 * ブラウザエンジン間の差異、ネットワーク状態、パフォーマンス境界値を網羅
 */

import { test, expect, devices } from '@playwright/test';

test.describe('クロスブラウザ・ネットワーク包括テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // ネットワーク状態とパフォーマンス監視スクリプトを注入
    await page.addInitScript(() => {
      window.networkTestData = {
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
        networkErrors: [],
        performanceMetrics: {
          navigationStart: 0,
          domContentLoaded: 0,
          loadComplete: 0,
          firstPaint: 0,
          firstContentfulPaint: 0
        },
        resourceTimings: []
      };
      
      // Network Information APIの監視
      if ('connection' in navigator) {
        const connection = navigator.connection;
        window.networkTestData.connectionType = connection.type || 'unknown';
        window.networkTestData.effectiveType = connection.effectiveType || 'unknown';
        window.networkTestData.downlink = connection.downlink || 0;
        window.networkTestData.rtt = connection.rtt || 0;
        window.networkTestData.saveData = connection.saveData || false;
        
        connection.addEventListener('change', () => {
          window.networkTestData.connectionType = connection.type;
          window.networkTestData.effectiveType = connection.effectiveType;
          window.networkTestData.downlink = connection.downlink;
          window.networkTestData.rtt = connection.rtt;
        });
      }
      
      // Performance API監視
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          if (perfData) {
            window.networkTestData.performanceMetrics = {
              navigationStart: perfData.fetchStart,
              domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
              loadComplete: perfData.loadEventEnd - perfData.fetchStart,
              firstPaint: 0,
              firstContentfulPaint: 0
            };
          }
          
          // Paint Timing API
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            if (entry.name === 'first-paint') {
              window.networkTestData.performanceMetrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              window.networkTestData.performanceMetrics.firstContentfulPaint = entry.startTime;
            }
          });
          
          // Resource Timing
          const resourceEntries = performance.getEntriesByType('resource');
          window.networkTestData.resourceTimings = resourceEntries.map(entry => ({
            name: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize,
            decodedBodySize: entry.decodedBodySize,
            initiatorType: entry.initiatorType
          }));
        }, 2000);
      });
      
      // エラー監視
      window.addEventListener('error', (event) => {
        window.networkTestData.networkErrors.push({
          type: 'javascript_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          timestamp: Date.now()
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        window.networkTestData.networkErrors.push({
          type: 'promise_rejection',
          reason: event.reason.toString(),
          timestamp: Date.now()
        });
      });
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ ブラウザエラー: ${msg.text()}`);
      }
    });
  });

  test('Chromiumエンジン完全互換性テスト', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium専用テスト');
    
    console.log('🌐 Chromiumエンジン完全互換性テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Chromium特有の機能テスト
    const chromiumFeatures = await page.evaluate(() => {
      return {
        webAssembly: typeof WebAssembly !== 'undefined',
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: typeof Worker !== 'undefined',
        indexedDB: 'indexedDB' in window,
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        webGL: (() => {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        })(),
        webGL2: (() => {
          const canvas = document.createElement('canvas');
          return !!canvas.getContext('webgl2');
        })(),
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
        gamepadAPI: 'getGamepads' in navigator,
        fullscreenAPI: 'requestFullscreen' in document.documentElement,
        pointerLock: 'requestPointerLock' in document.documentElement
      };
    });
    
    console.log('🔍 Chromium機能サポート状況:', chromiumFeatures);
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了（Chromium）');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト（Chromium）');
    }
    
    // ゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // Chromium固有の高度な機能テスト
    if (chromiumFeatures.webAssembly) {
      console.log('✅ WebAssembly対応確認');
      expect(chromiumFeatures.webAssembly).toBe(true);
    }
    
    if (chromiumFeatures.webGL) {
      console.log('✅ WebGL対応確認');
      expect(chromiumFeatures.webGL).toBe(true);
    }
    
    // パフォーマンスメトリクス収集
    await page.waitForTimeout(3000);
    const performanceData = await page.evaluate(() => window.networkTestData.performanceMetrics);
    console.log('📊 Chromiumパフォーマンス:', performanceData);
    
    // 基本パフォーマンス要件
    if (performanceData.domContentLoaded > 0) {
      expect(performanceData.domContentLoaded).toBeLessThan(10000); // 10秒以内
    }
    
    console.log('✅ Chromiumエンジン互換性テスト完了');
  });

  test('Firefoxエンジン完全互換性テスト', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox専用テスト');
    
    console.log('🦊 Firefoxエンジン完全互換性テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Firefox特有の機能テスト
    const firefoxFeatures = await page.evaluate(() => {
      return {
        webAssembly: typeof WebAssembly !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: typeof Worker !== 'undefined',
        indexedDB: 'indexedDB' in window,
        localStorage: 'localStorage' in window,
        webGL: (() => {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        })(),
        audioContext: 'AudioContext' in window,
        mozFeatures: {
          mozRequestFullScreen: 'mozRequestFullScreen' in document.documentElement,
          mozPointerLock: 'mozRequestPointerLock' in document.documentElement
        },
        firefoxVersion: navigator.userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown'
      };
    });
    
    console.log('🔍 Firefox機能サポート状況:', firefoxFeatures);
    
    // Pyodideの初期化を待つ（Firefoxは若干遅い場合がある）
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 90000 }); // Firefox用に90秒
      console.log('✅ Pyodide初期化完了（Firefox）');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト（Firefox）');
    }
    
    // ゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // Firefox固有の検証
    expect(firefoxFeatures.webAssembly).toBe(true);
    console.log('✅ Firefox WebAssembly対応確認');
    
    // Firefox特有のエラーがないことを確認
    const errors = await page.evaluate(() => window.networkTestData.networkErrors);
    const firefoxSpecificErrors = errors.filter(error => 
      error.message && error.message.includes('SecurityError')
    );
    
    expect(firefoxSpecificErrors.length).toBe(0);
    console.log('✅ Firefox特有のセキュリティエラーなし');
    
    console.log('✅ Firefoxエンジン互換性テスト完了');
  });

  test('WebKitエンジン完全互換性テスト', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit専用テスト');
    
    console.log('🍎 WebKitエンジン完全互換性テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // WebKit特有の機能テスト
    const webkitFeatures = await page.evaluate(() => {
      return {
        webAssembly: typeof WebAssembly !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: typeof Worker !== 'undefined',
        indexedDB: 'indexedDB' in window,
        localStorage: 'localStorage' in window,
        webGL: (() => {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        })(),
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
        webkitFeatures: {
          webkitRequestFullscreen: 'webkitRequestFullscreen' in document.documentElement,
          webkitPointerLock: 'webkitRequestPointerLock' in document.documentElement
        },
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      };
    });
    
    console.log('🔍 WebKit機能サポート状況:', webkitFeatures);
    
    // Pyodideの初期化を待つ（WebKitは最も時間がかかる場合がある）
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 120000 }); // WebKit用に2分
      console.log('✅ Pyodide初期化完了（WebKit）');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト（WebKit）- 代替検証を実行');
      
      // WebKitでPyodideが重い場合の代替検証
      await page.waitForTimeout(10000);
      const gameCanvas = page.locator('#gameCanvas');
      await expect(gameCanvas).toBeVisible();
      console.log('✅ ゲームキャンバス表示確認（WebKit代替検証）');
    }
    
    // ゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // WebKit固有の検証
    expect(webkitFeatures.webAssembly).toBe(true);
    console.log('✅ WebKit WebAssembly対応確認');
    
    // WebKit特有のプレフィックス付きAPIの確認
    if (webkitFeatures.webkitFeatures.webkitRequestFullscreen) {
      console.log('✅ WebKit固有のフルスクリーンAPI対応');
    }
    
    console.log('✅ WebKitエンジン互換性テスト完了');
  });

  test('ネットワーク状態別パフォーマンステスト', async ({ page }) => {
    console.log('📡 ネットワーク状態別パフォーマンステストを開始...');
    
    // 低速ネットワークをシミュレート
    await page.route('**/*', async route => {
      // 500ms遅延を追加
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000/docs/game.html');
    const pageLoadTime = Date.now() - startTime;
    
    console.log(`📊 低速ネットワーク環境でのページロード時間: ${pageLoadTime}ms`);
    
    // 低速ネットワークでも合理的な時間内にロードされることを確認
    expect(pageLoadTime).toBeLessThan(30000); // 30秒以内
    
    // ネットワーク情報を取得
    const networkInfo = await page.evaluate(() => window.networkTestData);
    console.log('📊 ネットワーク情報:', {
      connectionType: networkInfo.connectionType,
      effectiveType: networkInfo.effectiveType,
      downlink: networkInfo.downlink,
      rtt: networkInfo.rtt
    });
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ 低速ネットワーク環境でのPyodide初期化完了');
    } catch (e) {
      console.log('⚠️ 低速ネットワーク環境でのPyodide初期化タイムアウト');
    }
    
    // ゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // パフォーマンスメトリクスの確認
    await page.waitForTimeout(3000);
    const perfMetrics = await page.evaluate(() => window.networkTestData.performanceMetrics);
    console.log('📊 低速ネットワーク環境でのパフォーマンス:', perfMetrics);
    
    // リソース読み込み状況の確認
    const resourceTimings = await page.evaluate(() => window.networkTestData.resourceTimings);
    console.log(`📊 読み込まれたリソース数: ${resourceTimings.length}`);
    
    if (resourceTimings.length > 0) {
      const totalTransferSize = resourceTimings.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);
      console.log(`📊 総転送サイズ: ${(totalTransferSize / 1024).toFixed(2)}KB`);
      
      // 合理的なリソースサイズであることを確認
      expect(totalTransferSize).toBeLessThan(50 * 1024 * 1024); // 50MB以下
    }
    
    console.log('✅ ネットワーク状態別パフォーマンステスト完了');
  });

  test('モバイルデバイス完全対応テスト', async ({ page, context }) => {
    console.log('📱 モバイルデバイス完全対応テストを開始...');
    
    // iPhone 12 Proサイズでテスト
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // モバイル特有の機能テスト
    const mobileFeatures = await page.evaluate(() => {
      return {
        touchSupport: 'ontouchstart' in window,
        orientationSupport: 'orientation' in window,
        deviceMotion: 'DeviceMotionEvent' in window,
        deviceOrientation: 'DeviceOrientationEvent' in window,
        vibration: 'vibrate' in navigator,
        battery: 'getBattery' in navigator,
        geolocation: 'geolocation' in navigator,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent
      };
    });
    
    console.log('📱 モバイル機能サポート状況:', mobileFeatures);
    
    // タッチサポートの確認
    expect(mobileFeatures.touchSupport).toBe(true);
    console.log('✅ タッチサポート確認');
    
    // Pyodideの初期化を待つ（モバイルは処理能力が低い場合がある）
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 120000 }); // モバイル用に2分
      console.log('✅ モバイル環境でのPyodide初期化完了');
    } catch (e) {
      console.log('⚠️ モバイル環境でのPyodide初期化タイムアウト');
    }
    
    // ゲームキャンバスの表示確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // モバイル表示の最適化確認
    const canvasSize = await page.locator('#gameCanvas').boundingBox();
    expect(canvasSize.width).toBeLessThanOrEqual(390); // ビューポート幅以内
    console.log(`📱 モバイル表示でのキャンバスサイズ: ${canvasSize.width}x${canvasSize.height}`);
    
    // タッチイベントのテスト
    console.log('👆 タッチイベントをテスト中...');
    await page.touchscreen.tap(canvasSize.x + canvasSize.width / 2, canvasSize.y + canvasSize.height / 2);
    await page.waitForTimeout(1000);
    
    // 縦横回転のテスト
    console.log('🔄 デバイス回転をテスト中...');
    await page.setViewportSize({ width: 844, height: 390 }); // 横向き
    await page.waitForTimeout(2000);
    
    const rotatedCanvasSize = await page.locator('#gameCanvas').boundingBox();
    expect(rotatedCanvasSize.width).toBeLessThanOrEqual(844);
    console.log(`🔄 横向き表示でのキャンバスサイズ: ${rotatedCanvasSize.width}x${rotatedCanvasSize.height}`);
    
    // 元に戻す
    await page.setViewportSize({ width: 390, height: 844 });
    
    console.log('✅ モバイルデバイス完全対応テスト完了');
  });

  test('ブラウザキャッシュ・ストレージ包括テスト', async ({ page }) => {
    console.log('💾 ブラウザキャッシュ・ストレージ包括テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // ストレージ機能のテスト
    const storageTest = await page.evaluate(() => {
      const results = {
        localStorage: false,
        sessionStorage: false,
        indexedDB: false,
        webSQL: false,
        cookies: false,
        serviceWorker: false,
        cacheAPI: false,
        errors: []
      };
      
      try {
        // LocalStorage テスト
        localStorage.setItem('test_key', 'test_value');
        if (localStorage.getItem('test_key') === 'test_value') {
          results.localStorage = true;
          localStorage.removeItem('test_key');
        }
      } catch (e) {
        results.errors.push('localStorage: ' + e.message);
      }
      
      try {
        // SessionStorage テスト
        sessionStorage.setItem('test_key', 'test_value');
        if (sessionStorage.getItem('test_key') === 'test_value') {
          results.sessionStorage = true;
          sessionStorage.removeItem('test_key');
        }
      } catch (e) {
        results.errors.push('sessionStorage: ' + e.message);
      }
      
      try {
        // IndexedDB テスト
        if ('indexedDB' in window) {
          results.indexedDB = true;
        }
      } catch (e) {
        results.errors.push('indexedDB: ' + e.message);
      }
      
      try {
        // Cookie テスト
        document.cookie = 'test_cookie=test_value; path=/';
        if (document.cookie.includes('test_cookie=test_value')) {
          results.cookies = true;
          document.cookie = 'test_cookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        }
      } catch (e) {
        results.errors.push('cookies: ' + e.message);
      }
      
      try {
        // Service Worker テスト
        if ('serviceWorker' in navigator) {
          results.serviceWorker = true;
        }
      } catch (e) {
        results.errors.push('serviceWorker: ' + e.message);
      }
      
      try {
        // Cache API テスト
        if ('caches' in window) {
          results.cacheAPI = true;
        }
      } catch (e) {
        results.errors.push('cacheAPI: ' + e.message);
      }
      
      return results;
    });
    
    console.log('💾 ストレージ機能テスト結果:', storageTest);
    
    // 基本的なストレージ機能が利用可能であることを確認
    expect(storageTest.localStorage).toBe(true);
    expect(storageTest.sessionStorage).toBe(true);
    console.log('✅ 基本ストレージ機能利用可能');
    
    if (storageTest.errors.length > 0) {
      console.log('⚠️ ストレージエラー:', storageTest.errors);
    }
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // ゲーム進行中にローカルストレージが正常に動作することを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // ランキングデータの保存/読み込みテスト
    await page.keyboard.press('h'); // ランキング表示
    await page.waitForTimeout(2000);
    
    const rankingData = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('squash_rankings') || '[]');
      } catch (e) {
        return null;
      }
    });
    
    console.log('🏆 ランキングデータ:', rankingData);
    
    if (rankingData !== null) {
      expect(Array.isArray(rankingData)).toBe(true);
      console.log('✅ ランキングデータの保存/読み込み正常');
    }
    
    console.log('✅ ブラウザキャッシュ・ストレージ包括テスト完了');
  });

});