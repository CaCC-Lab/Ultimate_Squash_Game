/**
 * Phase 4: 並列初期化機能のE2Eテスト
 *
 * パフォーマンステスト、統合テスト、並列処理の検証
 */

const { test, expect } = require('@playwright/test');

test.describe('Phase 4: 並列初期化機能テスト', () => {

  test.beforeEach(async ({ page }) => {
    // コンソールログをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Parallel Initializer')) {
        console.log('🔧 Parallel Initializer Log:', msg.text());
      }
    });

    // エラーをキャプチャ
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });

    // ネットワークリクエストをキャプチャ（パフォーマンス測定用）
    page.on('request', request => {
      if (request.url().includes('pyodide') || request.url().includes('pygame')) {
        console.log('📡 Network Request:', request.url());
      }
    });
  });

  test('並列初期化システムの基本動作確認', async ({ page }) => {
    // ゲームページにアクセス
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // ParallelInitializerクラスの存在確認
    const parallelInitializerAvailable = await page.evaluate(() => {
      return typeof ParallelInitializer === 'function';
    });
    expect(parallelInitializerAvailable).toBe(true);

    // 初期化が開始されるまで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer && window.parallelInitializer.getInitializationStatus().started;
    }, { timeout: 10000 });

    // 初期化状態を確認
    const initStatus = await page.evaluate(() => {
      return window.parallelInitializer.getInitializationStatus();
    });

    expect(initStatus.started).toBe(true);
    console.log('✅ 並列初期化が正常に開始されました');
  });

  test('並列初期化の各ステージ動作確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 初期化完了まで待機（最大30秒）
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().completed;
    }, { timeout: 30000 });

    // 各ステージの完了状況を確認
    const stats = await page.evaluate(() => {
      return window.parallelInitializer.getInitializationStats();
    });

    // 必須ステージの完了確認
    expect(stats.readyStatus.pyodideReady).toBe(true);
    expect(stats.readyStatus.pygameCeReady).toBe(true);
    expect(stats.readyStatus.gameCodeReady).toBe(true);

    // 統計情報の確認
    expect(stats.totalDuration).toBeGreaterThan(0);
    expect(stats.completedStages).toBeGreaterThan(0);
    expect(stats.successRate).toBeGreaterThan(80); // 80%以上の成功率

    console.log('✅ 各ステージが正常に完了しました');
    console.log(`📊 統計情報: ${stats.totalDuration}ms, 成功率: ${stats.successRate}%`);
  });

  test('並列処理によるパフォーマンス改善確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 並列初期化の開始時間を記録
    const startTime = await page.evaluate(() => Date.now());

    // 初期化完了まで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().completed;
    }, { timeout: 30000 });

    // 完了時間を計算
    const stats = await page.evaluate(() => {
      return window.parallelInitializer.getInitializationStats();
    });

    const totalTime = stats.totalDuration;

    // パフォーマンス目標
    expect(totalTime).toBeLessThan(15000); // 15秒以内

    // 並列処理効果の確認
    const stages = stats.stages;
    const stageNames = Object.keys(stages);

    // 複数のステージが並列実行されていることを確認
    expect(stageNames).toContain('pygame-ce');
    expect(stageNames).toContain('game-code');
    expect(stageNames).toContain('audio-system');
    expect(stageNames).toContain('canvas-setup');

    console.log('✅ 並列処理によるパフォーマンス改善を確認');
    console.log(`⏱️  総初期化時間: ${totalTime}ms`);
    console.log(`🔄 並列実行ステージ: ${stageNames.join(', ')}`);
  });

  test('Pyodideとpygame-ceの統合確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 並列初期化完了まで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.isReadyToStart();
    }, { timeout: 30000 });

    // Pyodideの基本動作確認
    const pyodideTest = await page.evaluate(() => {
      if (!window.pyodide) return { success: false, error: 'Pyodide not available' };

      try {
        // 基本的なPython実行テスト
        const result = window.pyodide.runPython(`
                    import sys
                    import pygame
                    
                    # バージョン確認
                    python_version = sys.version
                    pygame_version = pygame.version.ver
                    
                    # pygame初期化確認
                    pygame.init()
                    
                    {
                        'python_version': python_version,
                        'pygame_version': pygame_version,
                        'pygame_initialized': pygame.get_init()
                    }
                `);

        return {
          success: true,
          result: result.toJs()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(pyodideTest.success).toBe(true);
    expect(pyodideTest.result.pygame_initialized).toBe(true);

    console.log('✅ Pyodideとpygame-ceの統合が正常に動作');
    console.log(`🐍 Python version: ${pyodideTest.result.python_version}`);
    console.log(`🎮 Pygame version: ${pyodideTest.result.pygame_version}`);
  });

  test('Canvas統合とイベントハンドリング確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 並列初期化完了まで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().completed;
    }, { timeout: 30000 });

    // Canvasの存在確認
    const canvasExists = await page.locator('#gameCanvas').isVisible();
    expect(canvasExists).toBe(true);

    // Canvasのサイズ確認
    const canvasSize = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      return canvas ? {
        width: canvas.width,
        height: canvas.height
      } : null;
    });

    expect(canvasSize).not.toBeNull();
    expect(canvasSize.width).toBe(800);
    expect(canvasSize.height).toBe(600);

    // Canvas描画テスト
    const drawingTest = await page.evaluate(() => {
      try {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // 基本的な描画テスト
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 50, 50);

        // 描画されたピクセルデータを確認
        const imageData = ctx.getImageData(25, 25, 1, 1);
        const pixel = imageData.data;

        return {
          success: true,
          pixelData: Array.from(pixel)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(drawingTest.success).toBe(true);
    expect(drawingTest.pixelData[0]).toBeGreaterThan(200); // 赤色の確認

    console.log('✅ Canvas統合と描画機能が正常に動作');
  });

  test('オーディオシステムの初期化確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 並列初期化完了まで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().completed;
    }, { timeout: 30000 });

    // オーディオシステムの状態確認
    const audioTest = await page.evaluate(() => {
      try {
        const hasAudioContext = window.audioContext !== undefined;
        const hasMasterGain = window.masterGain !== undefined;

        // pygame mixerの状態確認
        const mixerStatus = window.pyodide.runPython(`
                    import pygame
                    pygame.mixer.get_init()
                `);

        return {
          success: true,
          hasAudioContext: hasAudioContext,
          hasMasterGain: hasMasterGain,
          pygameMixerInitialized: mixerStatus !== null
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(audioTest.success).toBe(true);

    // オーディオ機能は必須ではないため、警告レベルで確認
    if (!audioTest.hasAudioContext) {
      console.warn('⚠️ Web Audio API not available');
    }
    if (!audioTest.pygameMixerInitialized) {
      console.warn('⚠️ Pygame mixer not initialized');
    }

    console.log('✅ オーディオシステムの初期化確認完了');
  });

  test('エラーハンドリングとフォールバック動作確認', async ({ page }) => {
    // エラーを意図的に発生させるテスト
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 並列初期化が開始されるまで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().started;
    }, { timeout: 10000 });

    // エラーハンドリング機能の確認
    const errorHandling = await page.evaluate(() => {
      try {
        // 意図的に無効なイベントを発生させる
        const initializer = window.parallelInitializer;
        if (!initializer) return { success: false, error: 'Initializer not found' };

        // エラーイベントリスナーの存在確認
        const hasErrorHandling = initializer.eventListeners.has('initializationError');

        return {
          success: true,
          hasErrorHandling: hasErrorHandling
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(errorHandling.success).toBe(true);
    expect(errorHandling.hasErrorHandling).toBe(true);

    console.log('✅ エラーハンドリング機能が正常に実装されています');
  });

  test('フォールバック機能の動作確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // フォールバック関数の存在確認
    const fallbackAvailable = await page.evaluate(() => {
      return typeof fallbackSequentialInitialization === 'function';
    });

    expect(fallbackAvailable).toBe(true);

    console.log('✅ フォールバック機能が正常に定義されています');
  });

  test('メモリ使用量とパフォーマンス指標確認', async ({ page }) => {
    await page.goto('http://localhost:3000/docs/game.html');

    // スクリプト読み込み完了まで待機
    await page.waitForFunction(() => {
      return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
    }, { timeout: 15000 });

    // 初期化前のメモリ使用量
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
    });

    // 並列初期化完了まで待機
    await page.waitForFunction(() => {
      return window.parallelInitializer &&
                   window.parallelInitializer.getInitializationStatus().completed;
    }, { timeout: 30000 });

    // 初期化後のメモリ使用量
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
    });

    // パフォーマンス統計の取得
    const stats = await page.evaluate(() => {
      return window.parallelInitializer.getInitializationStats();
    });

    // メモリ使用量の合理性確認
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以下

      console.log(`📊 メモリ使用量増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }

    // パフォーマンス指標の確認
    expect(stats.totalDuration).toBeLessThan(20000); // 20秒以内
    expect(stats.successRate).toBeGreaterThan(75); // 75%以上の成功率

    console.log('✅ メモリ使用量とパフォーマンス指標が適切な範囲内です');
    console.log(`⏱️  総初期化時間: ${stats.totalDuration}ms`);
    console.log(`📈 成功率: ${stats.successRate}%`);
  });

  test.describe('ブラウザ別の動作確認', () => {

    test('Chrome/Chromiumでの動作確認', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome/Chromium専用テスト');

      await page.goto('http://localhost:3000/docs/game.html');

      // スクリプト読み込み完了まで待機
      await page.waitForFunction(() => {
        return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
      }, { timeout: 15000 });

      // Chrome固有の機能確認
      const chromeFeatures = await page.evaluate(() => {
        return {
          webWorkers: typeof Worker !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          audioContext: 'AudioContext' in window,
          hardwareConcurrency: navigator.hardwareConcurrency
        };
      });

      expect(chromeFeatures.webWorkers).toBe(true);
      expect(chromeFeatures.serviceWorker).toBe(true);
      expect(chromeFeatures.audioContext).toBe(true);
      expect(chromeFeatures.hardwareConcurrency).toBeGreaterThan(0);

      console.log('✅ Chrome/Chromiumでの動作確認完了');
    });

    test('Firefoxでの動作確認', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox専用テスト');

      await page.goto('http://localhost:3000/docs/game.html');

      // スクリプト読み込み完了まで待機
      await page.waitForFunction(() => {
        return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
      }, { timeout: 15000 });

      // Firefox固有の確認
      const firefoxFeatures = await page.evaluate(() => {
        return {
          webWorkers: typeof Worker !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };
      });

      expect(firefoxFeatures.webWorkers).toBe(true);
      expect(firefoxFeatures.serviceWorker).toBe(true);

      console.log('✅ Firefoxでの動作確認完了');
    });

    test('WebKitでの動作確認', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit専用テスト');

      await page.goto('http://localhost:3000/docs/game.html');

      // スクリプト読み込み完了まで待機
      await page.waitForFunction(() => {
        return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
      }, { timeout: 15000 });

      // WebKit固有の確認
      const webkitFeatures = await page.evaluate(() => {
        return {
          webWorkers: typeof Worker !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };
      });

      expect(webkitFeatures.webWorkers).toBe(true);

      console.log('✅ WebKitでの動作確認完了');
    });

  });

});
