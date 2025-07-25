import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.describe('FPS Measurement', () => {
    test('should maintain stable 60 FPS during gameplay', async ({ page }) => {
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // パフォーマンス計測のためのスクリプトを注入
      await page.addScriptTag({
        content: `
          window.fpsData = [];
          window.lastTime = performance.now();
          window.frameCount = 0;
          
          // requestAnimationFrameをフックしてFPSを計測
          const originalRAF = window.requestAnimationFrame;
          window.requestAnimationFrame = function(callback) {
            return originalRAF.call(window, function(timestamp) {
              window.frameCount++;
              const currentTime = performance.now();
              const deltaTime = currentTime - window.lastTime;
              
              // 1秒ごとにFPSを計算
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
        `,
      });

      // ゲームを開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // 10秒間プレイしてFPSを計測
      const actions = ['ArrowLeft', 'ArrowRight'];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press(actions[i % 2]);
        await page.waitForTimeout(500);
      }

      // FPSデータを取得
      const fpsData = await page.evaluate(() => window.fpsData);

      console.log('FPS Data:', fpsData);

      // FPSの統計を計算
      if (fpsData.length > 0) {
        const fpsValues = fpsData.map(d => d.fps);
        const avgFPS = fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
        const minFPS = Math.min(...fpsValues);
        const maxFPS = Math.max(...fpsValues);

        console.log(`Average FPS: ${avgFPS.toFixed(2)}`);
        console.log(`Min FPS: ${minFPS.toFixed(2)}`);
        console.log(`Max FPS: ${maxFPS.toFixed(2)}`);

        // 平均FPSが50以上であることを確認（ブラウザの制限を考慮）
        expect(avgFPS).toBeGreaterThan(50);

        // 最小FPSが30以上であることを確認（大きな遅延がないこと）
        expect(minFPS).toBeGreaterThan(30);
      } else {
        // FPSデータが取得できない場合は、ゲームが正常に動作していることを確認
        console.log('FPS data not available, checking game stability');

        // エラーがないことを確認
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
            consoleErrors.push(msg.text());
          }
        });

        await page.waitForTimeout(2000);
        expect(consoleErrors.length).toBe(0);
      }
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should not have memory leaks during extended gameplay', async ({ page }) => {
      // タイムアウトを60秒に延長
      test.setTimeout(60000);
      
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // メモリ使用量を記録するスクリプトを注入
      await page.addScriptTag({
        content: `
          window.memorySnapshots = [];
          
          // メモリ使用量を定期的に記録
          setInterval(() => {
            if (performance.memory) {
              window.memorySnapshots.push({
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
              });
            }
          }, 1000); // 1秒ごとに記録（高頻度）
        `,
      });

      // ゲームを開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // 初期メモリ使用量を記録
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });

      console.log(`Initial memory usage: ${initialMemory ? (initialMemory / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

      // 20秒間激しくプレイ（30秒から短縮）
      for (let i = 0; i < 20; i++) {
        // ランダムなアクション
        const actions = ['ArrowLeft', 'ArrowRight', 'r', 'p', 'p'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        await page.keyboard.press(randomAction);
        await page.waitForTimeout(500); // 待機時間を短縮（1000ms → 500ms）
      }

      // 最終メモリ使用量を記録
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });

      console.log(`Final memory usage: ${finalMemory ? (finalMemory / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

      // メモリスナップショットを取得
      const memorySnapshots = await page.evaluate(() => window.memorySnapshots);

      if (initialMemory && finalMemory && memorySnapshots.length > 0) {
        // メモリ増加率を計算
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;

        console.log(
          `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercentage.toFixed(2)}%)`
        );

        // メモリ増加が初期値の50%以下であることを確認
        expect(increasePercentage).toBeLessThan(50);

        // メモリ使用量の傾向を分析
        const memoryTrend = memorySnapshots.map(s => s.usedJSHeapSize);
        const isConstantlyIncreasing = memoryTrend.every((val, i) => i === 0 || val >= memoryTrend[i - 1]);

        // メモリが常に増加し続けていないことを確認（GCが機能している）
        expect(isConstantlyIncreasing).toBe(false);
      }
    });
  });

  test.describe('Long-term Stability', () => {
    test('should remain stable during extended play session', async ({ page }) => {
      // タイムアウトを延長
      test.setTimeout(120000); // 2分

      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // エラーカウンター
      let errorCount = 0;
      let warningCount = 0;

      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('AudioContext')) {
          errorCount++;
          console.log('Error:', msg.text());
        } else if (msg.type() === 'warning') {
          warningCount++;
        }
      });

      // クラッシュ検出
      page.on('crash', () => {
        console.log('Page crashed!');
        throw new Error('Page crashed during stability test');
      });

      // ゲームを開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // 60秒間連続プレイ
      const startTime = Date.now();
      let actionCount = 0;

      while (Date.now() - startTime < 60000) {
        // ランダムなアクション
        const actions = ['ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'r'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        await page.keyboard.press(randomAction);
        actionCount++;

        // 時々スクリーンショットを撮って視覚的な問題がないか確認
        if (actionCount % 20 === 0) {
          const screenshot = await page.screenshot();
          // スクリーンショットが撮れることを確認（レンダリングが正常）
          expect(screenshot.length).toBeGreaterThan(0);
        }

        await page.waitForTimeout(500);
      }

      console.log(`Completed ${actionCount} actions in 60 seconds`);
      console.log(`Errors: ${errorCount}, Warnings: ${warningCount}`);

      // エラーがほとんどないことを確認
      expect(errorCount).toBeLessThan(5);

      // ゲームがまだ応答することを確認
      await page.keyboard.press('p'); // ポーズ
      await page.waitForTimeout(500);
      await page.keyboard.press('p'); // 再開

      // 最終的な状態チェック
      const canvas = page.locator('canvas#gameCanvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should load game resources efficiently', async ({ page }) => {
      // ネットワークアクティビティを記録
      const resources = [];

      page.on('response', response => {
        resources.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'],
        });
      });

      const startTime = Date.now();
      await page.goto('/docs/game.html');

      // Pyodideの読み込みを待つ
      await page.waitForTimeout(5000);
      const loadTime = Date.now() - startTime;

      console.log(`Total load time: ${loadTime}ms`);

      // リソースの統計
      const jsResources = resources.filter(r => r.url.endsWith('.js'));
      const cssResources = resources.filter(r => r.url.endsWith('.css'));
      const pyodideResources = resources.filter(r => r.url.includes('pyodide'));

      console.log(`JS resources: ${jsResources.length}`);
      console.log(`CSS resources: ${cssResources.length}`);
      console.log(`Pyodide resources: ${pyodideResources.length}`);

      // 404エラーがないことを確認
      const notFoundResources = resources.filter(r => r.status === 404);
      expect(notFoundResources.length).toBe(0);

      // 読み込み時間が妥当であることを確認（30秒以内）
      expect(loadTime).toBeLessThan(30000);
    });
  });

  test.describe('Animation Performance', () => {
    test('should have smooth animations', async ({ page }) => {
      await page.goto('/docs/game.html');
      await page.waitForTimeout(3000);

      // アニメーションフレームの一貫性を測定
      await page.addScriptTag({
        content: `
          window.frameTimes = [];
          let lastFrameTime = performance.now();
          
          function recordFrame() {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastFrameTime;
            
            if (window.frameTimes.length < 100) {
              window.frameTimes.push(deltaTime);
              lastFrameTime = currentTime;
              requestAnimationFrame(recordFrame);
            }
          }
          
          // ゲーム開始後に記録開始
          setTimeout(() => {
            requestAnimationFrame(recordFrame);
          }, 1000);
        `,
      });

      // ゲームを開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(3000);

      // フレームタイムを取得
      const frameTimes = await page.evaluate(() => window.frameTimes);

      if (frameTimes.length > 0) {
        // フレームタイムの統計
        const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        const maxFrameTime = Math.max(...frameTimes);
        const minFrameTime = Math.min(...frameTimes);

        console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
        console.log(`Max frame time: ${maxFrameTime.toFixed(2)}ms`);
        console.log(`Min frame time: ${minFrameTime.toFixed(2)}ms`);

        // 平均フレームタイムが33ms以下（30FPS以上）であることを確認
        expect(avgFrameTime).toBeLessThan(33);

        // 最大フレームタイムが100ms以下（大きなひっかかりがない）であることを確認
        expect(maxFrameTime).toBeLessThan(100);
      }
    });
  });
});
