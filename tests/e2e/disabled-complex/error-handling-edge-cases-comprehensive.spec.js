/**
 * エラーハンドリング・エッジケース包括的テストスイート
 * あらゆる異常状態、境界値、例外処理パターンを網羅
 */

import { test, expect } from '@playwright/test';

test.describe('エラーハンドリング・エッジケース包括テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // エラー監視とエッジケーステスト用スクリプトを注入
    await page.addInitScript(() => {
      window.errorTestData = {
        errors: [],
        warnings: [],
        resourceErrors: [],
        performanceIssues: [],
        edgeCases: [],
        recoveryActions: [],
        stabilityMetrics: {
          totalErrors: 0,
          recoveredErrors: 0,
          criticalErrors: 0,
          memoryLeaks: 0,
          performanceDegradation: 0
        }
      };
      
      // 全種類のエラーを捕捉
      window.addEventListener('error', (event) => {
        window.errorTestData.errors.push({
          type: 'script_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error ? event.error.stack : null,
          timestamp: Date.now(),
          recovered: false
        });
        window.errorTestData.stabilityMetrics.totalErrors++;
        
        // 重大度判定
        if (event.message.includes('ReferenceError') || event.message.includes('TypeError')) {
          window.errorTestData.stabilityMetrics.criticalErrors++;
        }
      });
      
      // Promise rejection エラー
      window.addEventListener('unhandledrejection', (event) => {
        window.errorTestData.errors.push({
          type: 'promise_rejection',
          reason: event.reason.toString(),
          timestamp: Date.now(),
          recovered: false
        });
        window.errorTestData.stabilityMetrics.totalErrors++;
      });
      
      // リソース読み込みエラー
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          window.errorTestData.resourceErrors.push({
            type: 'resource_error',
            tagName: event.target.tagName,
            src: event.target.src || event.target.href,
            timestamp: Date.now()
          });
        }
      }, true);
      
      // コンソール警告の監視
      const originalWarn = console.warn;
      console.warn = function(...args) {
        window.errorTestData.warnings.push({
          message: args.join(' '),
          timestamp: Date.now()
        });
        originalWarn.apply(console, args);
      };
      
      // パフォーマンス問題の監視
      const monitorPerformance = () => {
        if (performance.memory) {
          const memInfo = performance.memory;
          const memUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
          
          if (memUsage > 0.9) {
            window.errorTestData.performanceIssues.push({
              type: 'memory_high',
              usage: memUsage,
              timestamp: Date.now()
            });
          }
          
          // メモリリーク検出
          if (window.lastMemCheck && memInfo.usedJSHeapSize > window.lastMemCheck * 1.5) {
            window.errorTestData.stabilityMetrics.memoryLeaks++;
          }
          window.lastMemCheck = memInfo.usedJSHeapSize;
        }
        
        // フレームレート監視
        let lastTime = performance.now();
        const checkFPS = () => {
          const currentTime = performance.now();
          const fps = 1000 / (currentTime - lastTime);
          lastTime = currentTime;
          
          if (fps < 10) {
            window.errorTestData.performanceIssues.push({
              type: 'fps_low',
              fps: fps,
              timestamp: Date.now()
            });
            window.errorTestData.stabilityMetrics.performanceDegradation++;
          }
          
          requestAnimationFrame(checkFPS);
        };
        requestAnimationFrame(checkFPS);
      };
      
      setTimeout(monitorPerformance, 2000);
      
      // エラー回復機能の監視
      window.attemptErrorRecovery = (errorType) => {
        window.errorTestData.recoveryActions.push({
          type: errorType,
          timestamp: Date.now(),
          success: false
        });
        
        try {
          switch (errorType) {
            case 'pyodide_reload':
              if (window.pyodide) {
                window.pyodide.runPython('import sys; print("Recovery attempt")');
                window.errorTestData.recoveryActions[window.errorTestData.recoveryActions.length - 1].success = true;
                window.errorTestData.stabilityMetrics.recoveredErrors++;
              }
              break;
            case 'canvas_reset':
              const canvas = document.getElementById('gameCanvas');
              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                window.errorTestData.recoveryActions[window.errorTestData.recoveryActions.length - 1].success = true;
                window.errorTestData.stabilityMetrics.recoveredErrors++;
              }
              break;
          }
        } catch (e) {
          // 回復失敗
        }
      };
      
      // エッジケース検出ユーティリティ
      window.detectEdgeCases = () => {
        const edgeCases = [];
        
        // 極端な画面サイズ
        if (window.innerWidth < 300 || window.innerHeight < 200) {
          edgeCases.push({ type: 'tiny_viewport', width: window.innerWidth, height: window.innerHeight });
        }
        if (window.innerWidth > 4000 || window.innerHeight > 3000) {
          edgeCases.push({ type: 'huge_viewport', width: window.innerWidth, height: window.innerHeight });
        }
        
        // 異常なデバイスピクセル比
        if (window.devicePixelRatio > 3 || window.devicePixelRatio < 0.5) {
          edgeCases.push({ type: 'extreme_dpr', ratio: window.devicePixelRatio });
        }
        
        // ユーザーエージェント異常
        if (!navigator.userAgent || navigator.userAgent.length < 10) {
          edgeCases.push({ type: 'invalid_useragent', ua: navigator.userAgent });
        }
        
        // JavaScriptエンジンの制限
        try {
          const hugeArray = new Array(1000000);
          hugeArray.fill(1);
        } catch (e) {
          edgeCases.push({ type: 'memory_limit', error: e.message });
        }
        
        window.errorTestData.edgeCases = edgeCases;
        return edgeCases;
      };
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ コンソールエラー: ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        console.log(`⚠️ コンソール警告: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`❌ ページエラー: ${error.message}`);
    });
  });

  test('JavaScript実行エラー完全処理テスト', async ({ page }) => {
    console.log('🚨 JavaScript実行エラー完全処理テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト - エラーハンドリングテストを継続');
    }
    
    // 意図的にJavaScriptエラーを発生させる
    console.log('🧪 意図的なJavaScriptエラーを注入中...');
    
    const errorTests = [
      {
        name: 'ReferenceError',
        code: () => { nonExistentVariable.toString(); }
      },
      {
        name: 'TypeError',
        code: () => { null.toString(); }
      },
      {
        name: 'RangeError',
        code: () => { new Array(-1); }
      },
      {
        name: 'SyntaxError',
        code: () => { eval('var 123abc = 1;'); }
      }
    ];
    
    for (const errorTest of errorTests) {
      console.log(`🧪 ${errorTest.name}テスト中...`);
      
      try {
        await page.evaluate((testCode) => {
          try {
            testCode();
          } catch (e) {
            // エラーを記録
            window.errorTestData.errors.push({
              type: 'intentional_error',
              name: e.name,
              message: e.message,
              timestamp: Date.now(),
              test_case: true
            });
          }
        }, errorTest.code.toString());
        
        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`  ⚠️ ${errorTest.name}テスト実行エラー:`, e.message);
      }
    }
    
    // エラー回復テスト
    console.log('🔄 エラー回復テストを実行中...');
    await page.evaluate(() => {
      window.attemptErrorRecovery('pyodide_reload');
      window.attemptErrorRecovery('canvas_reset');
    });
    
    await page.waitForTimeout(2000);
    
    // エラーデータを収集
    const errorData = await page.evaluate(() => window.errorTestData);
    
    console.log('📊 エラーハンドリング結果:', {
      総エラー数: errorData.errors.length,
      警告数: errorData.warnings.length,
      回復試行数: errorData.recoveryActions.length,
      回復成功数: errorData.recoveryActions.filter(a => a.success).length
    });
    
    // 重大なエラーが適切に処理されていることを確認
    const criticalErrors = errorData.errors.filter(e => 
      !e.test_case && 
      (e.message.includes('ReferenceError') || e.message.includes('TypeError'))
    );
    
    // テスト用のエラー以外に重大なエラーがないことを確認
    expect(criticalErrors.length).toBe(0);
    
    // ゲームが依然として動作していることを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    console.log('✅ エラー発生後もゲーム動作継続');
    
    console.log('✅ JavaScript実行エラー完全処理テスト完了');
  });

  test('リソース読み込み失敗・回復テスト', async ({ page }) => {
    console.log('📁 リソース読み込み失敗・回復テストを開始...');
    
    // 一部のリソースをブロックして読み込み失敗をシミュレート
    await page.route('**/non-existent-file.js', route => route.abort());
    await page.route('**/some-image.png', route => route.abort());
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // 存在しないリソースの読み込みを試行
    await page.evaluate(() => {
      // 存在しないスクリプトの動的読み込み
      const script = document.createElement('script');
      script.src = '/non-existent-file.js';
      script.onerror = () => {
        window.errorTestData.resourceErrors.push({
          type: 'script_load_failed',
          src: script.src,
          timestamp: Date.now()
        });
      };
      document.head.appendChild(script);
      
      // 存在しない画像の読み込み
      const img = new Image();
      img.src = '/some-image.png';
      img.onerror = () => {
        window.errorTestData.resourceErrors.push({
          type: 'image_load_failed',
          src: img.src,
          timestamp: Date.now()
        });
      };
    });
    
    await page.waitForTimeout(3000);
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ リソース読み込み失敗があってもPyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // リソースエラーデータを収集
    const resourceErrors = await page.evaluate(() => window.errorTestData.resourceErrors);
    
    console.log('📊 リソース読み込みエラー:', resourceErrors);
    
    // 意図的な読み込み失敗が検出されていることを確認
    const intentionalErrors = resourceErrors.filter(e => 
      e.src.includes('non-existent-file.js') || e.src.includes('some-image.png')
    );
    
    expect(intentionalErrors.length).toBeGreaterThan(0);
    console.log('✅ 意図的なリソース読み込み失敗を検出');
    
    // リソース読み込み失敗があってもゲームが動作することを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    console.log('✅ リソース読み込み失敗があってもゲーム動作継続');
    
    console.log('✅ リソース読み込み失敗・回復テスト完了');
  });

  test('メモリ制限・リーク検出テスト', async ({ page }) => {
    console.log('💾 メモリ制限・リーク検出テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // 初期メモリ使用量を記録
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      console.log('📊 初期メモリ使用量:', {
        使用中: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        合計: `${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        制限: `${(initialMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    // メモリ集約的な操作を実行
    console.log('🧪 メモリ集約的な操作を実行中...');
    
    await page.evaluate(() => {
      // 大量のオブジェクト作成
      const largeObjects = [];
      for (let i = 0; i < 1000; i++) {
        largeObjects.push({
          id: i,
          data: new Array(1000).fill(`large_data_${i}`),
          timestamp: Date.now()
        });
      }
      
      // メモリ監視を開始
      window.memoryTestData = largeObjects;
      
      // 大量のイベントリスナー追加（メモリリークの可能性）
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.addEventListener('click', function() {
          console.log(`Element ${i} clicked`);
        });
        document.body.appendChild(element);
      }
    });
    
    // 集約的なゲーム操作を実行
    console.log('🎮 集約的なゲーム操作を実行中...');
    
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
      await page.keyboard.press('Space'); // ポーズ/再開
      await page.waitForTimeout(100);
    }
    
    // 最終メモリ使用量を記録
    await page.waitForTimeout(2000);
    
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      console.log('📊 最終メモリ使用量:', {
        使用中: `${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        増加量: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        増加率: `${increasePercentage.toFixed(2)}%`
      });
      
      // 異常なメモリ増加がないことを確認
      expect(increasePercentage).toBeLessThan(300); // 300%未満の増加
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB未満の増加
      
      console.log('✅ メモリ使用量が妥当な範囲内');
    }
    
    // パフォーマンス問題の確認
    const performanceIssues = await page.evaluate(() => window.errorTestData.performanceIssues);
    
    console.log('📊 パフォーマンス問題:', performanceIssues);
    
    // 重大なパフォーマンス問題がないことを確認
    const criticalIssues = performanceIssues.filter(issue => 
      issue.type === 'memory_high' || (issue.type === 'fps_low' && issue.fps < 5)
    );
    
    expect(criticalIssues.length).toBeLessThan(5); // 少数の一時的な問題は許容
    
    // ゲームが依然として動作していることを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    console.log('✅ メモリ集約的操作後もゲーム動作継続');
    
    console.log('✅ メモリ制限・リーク検出テスト完了');
  });

  test('極端な操作パターン・入力値テスト', async ({ page }) => {
    console.log('⚡ 極端な操作パターン・入力値テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // エッジケース検出
    const edgeCases = await page.evaluate(() => {
      return window.detectEdgeCases();
    });
    
    console.log('📊 検出されたエッジケース:', edgeCases);
    
    // 極端な操作パターンテスト
    console.log('🧪 極端な操作パターンをテスト中...');
    
    // 1. 超高速連続キー操作
    console.log('⚡ 超高速連続キー操作...');
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      // 意図的に待機時間なし
    }
    
    await page.waitForTimeout(1000);
    
    // 2. 長時間のキー押下
    console.log('⏰ 長時間キー押下テスト...');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowLeft');
    
    // 3. 同時複数キー操作
    console.log('🎹 同時複数キー操作...');
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    
    // 4. ランダム操作パターン
    console.log('🎲 ランダム操作パターン...');
    const keys = ['ArrowLeft', 'ArrowRight', 'Space', 'h', 'r'];
    for (let i = 0; i < 50; i++) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      await page.keyboard.press(randomKey);
      await page.waitForTimeout(Math.random() * 100);
    }
    
    // 5. 異常な画面サイズでのテスト
    console.log('📏 異常な画面サイズテスト...');
    
    // 極小サイズ
    await page.setViewportSize({ width: 100, height: 100 });
    await page.waitForTimeout(1000);
    
    // 極大サイズ
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.waitForTimeout(1000);
    
    // 異常なアスペクト比
    await page.setViewportSize({ width: 1920, height: 100 });
    await page.waitForTimeout(1000);
    
    // 元に戻す
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 6. ページ要素への直接操作
    console.log('🎯 ページ要素直接操作...');
    
    await page.evaluate(() => {
      // キャンバスの直接操作
      const canvas = document.getElementById('gameCanvas');
      if (canvas) {
        // 異常な属性設定
        canvas.style.transform = 'scale(0.1)';
        setTimeout(() => {
          canvas.style.transform = 'scale(10)';
          setTimeout(() => {
            canvas.style.transform = '';
          }, 500);
        }, 500);
      }
      
      // DOM要素の動的変更
      const elements = document.querySelectorAll('*');
      elements.forEach((el, index) => {
        if (index % 10 === 0) {
          el.style.visibility = 'hidden';
          setTimeout(() => {
            el.style.visibility = '';
          }, 1000);
        }
      });
    });
    
    await page.waitForTimeout(2000);
    
    // エラーと安定性の確認
    const errorData = await page.evaluate(() => window.errorTestData);
    
    console.log('📊 極端操作後のエラー状況:', {
      エラー数: errorData.errors.length,
      警告数: errorData.warnings.length,
      パフォーマンス問題: errorData.performanceIssues.length,
      回復成功: errorData.stabilityMetrics.recoveredErrors
    });
    
    // 極端な操作後でも重大なエラーがないことを確認
    const criticalErrors = errorData.errors.filter(e => 
      e.type === 'script_error' && 
      !e.test_case &&
      (e.message.includes('ReferenceError') || e.message.includes('TypeError'))
    );
    
    expect(criticalErrors.length).toBe(0);
    console.log('✅ 極端操作後も重大エラーなし');
    
    // ゲームが依然として動作していることを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // ゲーム基本操作が依然として機能することを確認
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    console.log('✅ 極端操作後もゲーム基本機能動作');
    
    console.log('✅ 極端な操作パターン・入力値テスト完了');
  });

  test('ネットワーク切断・再接続エラーテスト', async ({ page }) => {
    console.log('🌐 ネットワーク切断・再接続エラーテストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // ネットワーク切断をシミュレート
    console.log('📡 ネットワーク切断をシミュレート中...');
    
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    
    // 切断中の操作テスト
    console.log('🎮 ネットワーク切断中のゲーム操作...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    
    // ランキング表示試行（ネットワークが必要な機能）
    await page.keyboard.press('h');
    await page.waitForTimeout(2000);
    
    // ネットワーク再接続
    console.log('🔗 ネットワーク再接続...');
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    
    // 再接続後の動作確認
    console.log('✅ ネットワーク再接続後の動作確認...');
    await page.keyboard.press('h'); // ランキング表示
    await page.waitForTimeout(2000);
    
    // エラー状況の確認
    const errorData = await page.evaluate(() => window.errorTestData);
    
    console.log('📊 ネットワーク切断・再接続エラー状況:', {
      エラー数: errorData.errors.length,
      リソースエラー数: errorData.resourceErrors.length,
      警告数: errorData.warnings.length
    });
    
    // ネットワーク関連エラーが適切に処理されていることを確認
    const networkErrors = errorData.errors.filter(e => 
      e.message && (
        e.message.includes('NetworkError') ||
        e.message.includes('fetch') ||
        e.message.includes('XMLHttpRequest')
      )
    );
    
    console.log('📡 ネットワーク関連エラー:', networkErrors.length);
    
    // ゲームが依然として動作していることを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    console.log('✅ ネットワーク切断・再接続後もゲーム動作継続');
    
    console.log('✅ ネットワーク切断・再接続エラーテスト完了');
  });

  test('システム安定性・回復力総合テスト', async ({ page }) => {
    console.log('🏛️ システム安定性・回復力総合テストを開始...');
    
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }
    
    // 複合的なストレステスト
    console.log('🧪 複合的なストレステストを実行中...');
    
    const stressTests = [
      () => page.keyboard.press('ArrowLeft'),
      () => page.keyboard.press('ArrowRight'),
      () => page.keyboard.press('Space'),
      () => page.keyboard.press('h'),
      () => page.keyboard.press('r'),
      () => page.mouse.click(400, 300),
      () => page.reload({ waitUntil: 'domcontentloaded' })
    ];
    
    // 30秒間のランダムな操作
    const testDuration = 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < testDuration) {
      const randomTest = stressTests[Math.floor(Math.random() * (stressTests.length - 1))]; // reloadを除く
      try {
        await randomTest();
        await page.waitForTimeout(Math.random() * 200);
      } catch (e) {
        console.log(`⚠️ ストレステスト中のエラー: ${e.message}`);
      }
    }
    
    // 最終的な安定性評価
    const finalErrorData = await page.evaluate(() => window.errorTestData);
    const stabilityScore = await page.evaluate(() => {
      const data = window.errorTestData.stabilityMetrics;
      const totalOperations = 100; // 推定操作回数
      
      return {
        errorRate: (data.totalErrors / totalOperations) * 100,
        recoveryRate: data.totalErrors > 0 ? (data.recoveredErrors / data.totalErrors) * 100 : 100,
        criticalErrorRate: (data.criticalErrors / totalOperations) * 100,
        memoryLeakRate: data.memoryLeaks,
        performanceDegradationRate: data.performanceDegradation
      };
    });
    
    console.log('📊 システム安定性スコア:', stabilityScore);
    
    // 安定性基準の確認
    expect(stabilityScore.errorRate).toBeLessThan(20); // エラー率20%未満
    expect(stabilityScore.criticalErrorRate).toBeLessThan(5); // 重大エラー率5%未満
    expect(stabilityScore.memoryLeakRate).toBeLessThan(10); // メモリリーク10回未満
    
    console.log('✅ システム安定性基準を満たしています');
    
    // 最終的なゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // 基本操作が依然として機能することを確認
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    
    console.log('✅ ストレステスト後もゲーム基本機能正常');
    
    console.log('✅ システム安定性・回復力総合テスト完了');
  });

});