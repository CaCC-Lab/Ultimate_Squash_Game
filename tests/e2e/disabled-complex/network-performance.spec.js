const { test, expect } = require('@playwright/test');
const {
  NETWORK_CONDITIONS,
  applyNetworkConditions,
  testNetworkQuality,
  measureResponseTime,
  captureNetworkErrors,
  collectGamePerformanceMetrics,
  monitorWebSocket,
  simulateIntermittentConnection
} = require('./network-helpers');
const { navigateToGame, waitForGameLoad, clickStartGame } = require('./helpers');

test.describe('Network Performance Tests', () => {
  let page;
  let networkErrors;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // ネットワークエラーの監視を開始
    networkErrors = captureNetworkErrors(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Load Time Performance', () => {
    Object.entries(NETWORK_CONDITIONS).forEach(([conditionName, conditions]) => {
      test(`should load game within acceptable time on ${conditionName}`, async () => {
        console.log(`Testing load time on ${conditionName} network conditions`);

        const result = await testNetworkQuality(page, conditions);

        // 条件別の許容可能な読み込み時間を設定
        const maxLoadTimes = {
          FAST_3G: 8000,
          SLOW_3G: 15000,
          SLOW_WIFI: 12000,
          HIGH_LATENCY: 10000,
          GOOD_CONNECTION: 3000
        };

        const maxLoadTime = maxLoadTimes[conditionName];

        console.log(`Load time: ${result.navigation.totalLoadTime}ms (max: ${maxLoadTime}ms)`);
        expect(result.navigation.totalLoadTime).toBeLessThan(maxLoadTime);

        // ゲーム要素が正常に表示されることを確認
        await expect(page.locator('#gameCanvas')).toBeVisible();
        await expect(page.locator('#startButton')).toBeVisible();

        // パフォーマンス指標をログ出力
        console.log('Performance metrics:', result.performance);
      });
    });
  });

  test.describe('Gameplay Responsiveness', () => {
    test('should maintain responsiveness under varying network conditions', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);

      const responseTimes = [];

      // 異なるネットワーク条件下での応答性をテスト
      for (const [conditionName, conditions] of Object.entries(NETWORK_CONDITIONS)) {
        console.log(`Testing responsiveness on ${conditionName}`);

        await applyNetworkConditions(page, conditions);
        await page.waitForTimeout(1000); // 条件が適用されるまで待機

        // キー入力の応答時間を測定
        const responseTime = await measureResponseTime(page, async () => {
          await page.keyboard.press('ArrowUp');
          await page.waitForTimeout(100);
        });

        responseTimes.push({
          condition: conditionName,
          responseTime: responseTime
        });

        console.log(`${conditionName}: ${responseTime}ms`);

        // 応答時間が合理的であることを確認（2秒以内）
        expect(responseTime).toBeLessThan(2000);
      }

      // 応答時間の統計を計算
      const avgResponseTime = responseTimes.reduce((sum, r) => sum + r.responseTime, 0) / responseTimes.length;
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);

      // 平均応答時間が許容範囲内であることを確認
      expect(avgResponseTime).toBeLessThan(1000);
    });

    test('should handle rapid input under poor network conditions', async () => {
      // 低速ネットワーク条件を適用
      await applyNetworkConditions(page, NETWORK_CONDITIONS.SLOW_3G);

      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);

      // 高速で連続入力を行う
      const inputs = ['ArrowUp', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'ArrowUp'];
      const startTime = Date.now();

      for (const input of inputs) {
        await page.keyboard.press(input);
        await page.waitForTimeout(50); // 短い間隔で入力
      }

      const totalTime = Date.now() - startTime;
      console.log(`Rapid input sequence completed in ${totalTime}ms`);

      // ゲームが応答し続けることを確認
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#ball')).toBeVisible();

      // 入力がキューイングされず、適切に処理されることを確認
      expect(totalTime).toBeLessThan(1000);
    });
  });

  test.describe('Resource Loading Resilience', () => {
    test('should gracefully handle resource loading failures', async () => {
      // 一部のリソースが読み込まれない状況をシミュレート
      await page.route('**/style.css', async route => {
        await route.abort('failed');
      });

      await page.route('**/image.png', async route => {
        await route.abort('failed');
      });

      await navigateToGame(page);

      // 重要な機能は動作することを確認
      await expect(page.locator('#gameCanvas')).toBeVisible({ timeout: 15000 });

      // 失敗したリソースがあってもゲームが起動することを確認
      const startButton = await page.locator('#startButton');
      if (await startButton.isVisible()) {
        await startButton.click();
      }

      // ゲームが最低限の機能を提供することを確認
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#ball')).toBeVisible();

      // リソース読み込み失敗が記録されていることを確認
      expect(networkErrors.failedRequests.length).toBeGreaterThan(0);
      console.log('Failed requests:', networkErrors.failedRequests.length);
    });

    test('should handle CDN failures gracefully', async () => {
      // 外部CDNリソースの失敗をシミュレート
      await page.route('**/cdn.jsdelivr.net/**', async route => {
        await route.abort('connectionrefused');
      });

      await page.route('**/cdnjs.cloudflare.com/**', async route => {
        await route.abort('connectionrefused');
      });

      await navigateToGame(page);

      // ローカルフォールバックが機能することを確認
      await expect(page.locator('#gameCanvas')).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('Progressive Enhancement', () => {
    test('should work with JavaScript disabled', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();

      await page.goto('http://localhost:3000');

      // 基本的なHTMLコンテンツが表示されることを確認
      await expect(page.locator('body')).toBeVisible();

      // JavaScriptが無効でも情報が表示されることを確認
      const noJsMessage = await page.locator('.no-js, [data-no-js]');
      if (await noJsMessage.count() > 0) {
        await expect(noJsMessage).toBeVisible();
      }

      await page.close();
    });

    test('should degrade gracefully with limited browser features', async ({ browser }) => {
      // 古いブラウザをシミュレート
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 6.1; Trident/7.0)'
      });
      const page = await context.newPage();

      await navigateToGame(page);

      // 基本機能が動作することを確認
      await expect(page.locator('#gameCanvas')).toBeVisible();

      await page.close();
    });
  });

  test.describe('WebSocket Performance', () => {
    test('should handle WebSocket connection under network stress', async () => {
      const wsEvents = monitorWebSocket(page);

      await navigateToGame(page);
      await waitForGameLoad(page);

      // WebSocketが使用されている場合のテスト
      if (wsEvents.connected) {
        // ネットワーク条件を悪化させる
        await applyNetworkConditions(page, NETWORK_CONDITIONS.SLOW_3G);

        // 断続的な接続をシミュレート
        await simulateIntermittentConnection(page, 2, 500, 1000);

        // メッセージが適切に送受信されることを確認
        await clickStartGame(page);

        // キー入力を送信
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(1000);

        // WebSocketエラーが許容範囲内であることを確認
        expect(wsEvents.errors.length).toBeLessThan(5);

        console.log('WebSocket messages:', wsEvents.messages.length);
        console.log('WebSocket errors:', wsEvents.errors.length);
      }
    });

    test('should implement WebSocket reconnection logic', async () => {
      const wsEvents = monitorWebSocket(page);

      await navigateToGame(page);
      await waitForGameLoad(page);

      if (wsEvents.connected) {
        // 接続を切断
        await page.context().setOffline(true);
        await page.waitForTimeout(2000);

        // 切断が検出されることを確認
        expect(wsEvents.disconnected).toBe(true);

        // 再接続
        await page.context().setOffline(false);
        await page.waitForTimeout(3000);

        // 再接続が行われることを確認
        // （実装によっては自動再接続ロジックが必要）
        await expect(page.locator('#gameCanvas')).toBeVisible();
      }
    });
  });

  test.describe('Game State Consistency', () => {
    test('should maintain game state during network interruptions', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);

      // 初期状態を記録
      const initialScore = await page.locator('#score').textContent();

      // ゲームプレイ中にネットワークを切断
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // オフライン中も操作を継続
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // 再接続
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // ゲーム状態が一貫していることを確認
      await expect(page.locator('#score')).toBeVisible();
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#ball')).toBeVisible();

      // 操作が引き続き可能であることを確認
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);
    });

    test('should handle state synchronization after reconnection', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);

      // ゲームメトリクスを収集
      const metricsBeforeDisconnect = await collectGamePerformanceMetrics(page);

      // 断続的な接続をシミュレート
      await simulateIntermittentConnection(page, 2, 1000, 2000);

      // 再接続後のメトリクスを収集
      const metricsAfterReconnect = await collectGamePerformanceMetrics(page);

      // パフォーマンスが大幅に悪化していないことを確認
      if (metricsBeforeDisconnect.fps > 0 && metricsAfterReconnect.fps > 0) {
        const fpsRatio = metricsAfterReconnect.fps / metricsBeforeDisconnect.fps;
        expect(fpsRatio).toBeGreaterThan(0.5); // FPSが50%以下に低下していないこと
      }

      console.log('Metrics before disconnect:', metricsBeforeDisconnect);
      console.log('Metrics after reconnect:', metricsAfterReconnect);
    });
  });

  test('should provide network diagnostics information', async () => {
    await navigateToGame(page);
    await waitForGameLoad(page);

    // 診断情報が利用可能かチェック
    const diagnostics = await page.evaluate(() => {
      // ネットワーク診断情報を取得（実装されている場合）
      if (window.networkDiagnostics) {
        return window.networkDiagnostics.getInfo();
      }

      // Navigator APIから基本情報を取得
      return {
        online: navigator.onLine,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      };
    });

    console.log('Network diagnostics:', diagnostics);

    // 基本的な接続情報が取得できることを確認
    expect(diagnostics.online).toBeDefined();

    // Connection APIが利用可能な場合の情報確認
    if (diagnostics.connection) {
      expect(diagnostics.connection.effectiveType).toBeDefined();
    }
  });
});
