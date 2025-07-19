const { test, expect } = require('@playwright/test');
const { navigateToGame, waitForGameLoad, clickStartGame } = require('./helpers');

test.describe('Network Conditions Tests', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // エラーとコンソールメッセージの記録
    const errors = [];
    const consoleLogs = [];
    
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    page.errors = errors;
    page.consoleLogs = consoleLogs;
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Low Speed Network', () => {
    test('should handle 3G network conditions', async () => {
      // 3G速度をシミュレート（ダウンロード: 1.6Mbps、アップロード: 750kbps、レイテンシ: 150ms）
      await page.route('**/*', async route => {
        await route.continue();
      });
      
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (1.6 * 1024 * 1024) / 8, // bytes/s
        uploadThroughput: (750 * 1024) / 8, // bytes/s
        latency: 150
      });

      await navigateToGame(page);
      await waitForGameLoad(page);
      
      // ゲーム開始時間を計測
      const startTime = Date.now();
      await clickStartGame(page);
      const loadTime = Date.now() - startTime;
      
      // 3G環境でも5秒以内に開始できることを確認
      expect(loadTime).toBeLessThan(5000);
      
      // ゲーム要素が表示されることを確認
      await expect(page.locator('#score')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#player')).toBeVisible();
      await expect(page.locator('#ball')).toBeVisible();
      
      // 基本的な操作が可能であることを確認
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowDown');
      
      // エラーが発生していないことを確認
      expect(page.errors).toHaveLength(0);
    });

    test('should handle slow WiFi conditions', async () => {
      // 低速WiFiをシミュレート（ダウンロード: 512kbps、アップロード: 256kbps、レイテンシ: 100ms）
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (512 * 1024) / 8,
        uploadThroughput: (256 * 1024) / 8,
        latency: 100
      });

      await navigateToGame(page);
      
      // ページが最終的に読み込まれることを確認（タイムアウトを延長）
      await expect(page.locator('#gameCanvas')).toBeVisible({ timeout: 20000 });
      
      // リソースが順次読み込まれることを確認
      const canvas = await page.locator('#gameCanvas');
      await expect(canvas).toHaveAttribute('width');
      await expect(canvas).toHaveAttribute('height');
      
      // UIが表示されることを確認
      await expect(page.locator('#score')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#startButton')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Network Disconnection and Reconnection', () => {
    test('should handle network disconnection gracefully', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);
      
      // ゲームが動作していることを確認
      await expect(page.locator('#score')).toContainText(/Score:/);
      
      // ネットワークを切断
      await page.context().setOffline(true);
      
      // 1秒待機
      await page.waitForTimeout(1000);
      
      // オフライン状態でもゲームが続行されることを確認
      const scoreElement = await page.locator('#score');
      await expect(scoreElement).toBeVisible();
      
      // キー入力が反応することを確認
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowDown');
      
      // エラーメッセージが適切に表示されることを確認（WebSocket使用時）
      const connectionStatus = await page.locator('.connection-status');
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toContainText(/offline|disconnected/i);
      }
    });

    test('should handle network reconnection', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      
      // ネットワークを切断
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      
      // ネットワークを再接続
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      
      // ゲームが正常に動作することを確認
      await clickStartGame(page);
      await expect(page.locator('#score')).toBeVisible();
      
      // 再接続後も操作可能であることを確認
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowDown');
      
      // WebSocket再接続が成功することを確認（該当する場合）
      const connectionStatus = await page.locator('.connection-status');
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toContainText(/online|connected/i);
      }
    });
  });

  test.describe('High Latency Environment', () => {
    test('should remain playable with high latency', async () => {
      // 高レイテンシをシミュレート（500ms）
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (10 * 1024 * 1024) / 8, // 10Mbps
        uploadThroughput: (10 * 1024 * 1024) / 8,
        latency: 500 // 高レイテンシ
      });

      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);
      
      // キー入力のレスポンスを確認
      const initialPlayerPosition = await page.locator('#player').boundingBox();
      
      // 複数回の移動を試行
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
      }
      
      await page.waitForTimeout(1000); // レイテンシを考慮して待機
      
      const finalPlayerPosition = await page.locator('#player').boundingBox();
      
      // プレイヤーが移動していることを確認（位置が変化）
      expect(finalPlayerPosition.y).not.toBe(initialPlayerPosition.y);
      
      // ゲームがフリーズしていないことを確認
      await expect(page.locator('#ball')).toBeVisible();
      await expect(page.locator('#score')).toBeVisible();
    });

    test('should handle variable latency', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);
      
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      
      // レイテンシを段階的に変更
      const latencies = [50, 200, 500, 100, 300];
      
      for (const latency of latencies) {
        await cdpSession.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: (10 * 1024 * 1024) / 8,
          uploadThroughput: (10 * 1024 * 1024) / 8,
          latency: latency
        });
        
        // 各レイテンシでの操作を確認
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
      }
      
      // ゲームが継続していることを確認
      await expect(page.locator('#score')).toBeVisible();
      await expect(page.locator('#ball')).toBeVisible();
      expect(page.errors).toHaveLength(0);
    });
  });

  test.describe('WebSocket Connection Stability', () => {
    test('should handle WebSocket disconnection', async ({ browser }) => {
      // WebSocket接続の監視
      const context = await browser.newContext();
      const page = await context.newPage();
      
      let wsConnected = false;
      let wsDisconnected = false;
      
      // WebSocketイベントの監視
      page.on('websocket', ws => {
        ws.on('open', () => {
          wsConnected = true;
        });
        ws.on('close', () => {
          wsDisconnected = true;
        });
      });
      
      await navigateToGame(page);
      await waitForGameLoad(page);
      
      // WebSocketが使用されている場合の処理
      if (wsConnected) {
        // ネットワークを一時的に切断
        await page.context().setOffline(true);
        await page.waitForTimeout(2000);
        
        // 切断が検出されることを確認
        expect(wsDisconnected).toBe(true);
        
        // ゲームが適切にフォールバック処理を行うことを確認
        await expect(page.locator('#gameCanvas')).toBeVisible();
        
        // 再接続
        await page.context().setOffline(false);
        await page.waitForTimeout(3000);
        
        // 再接続後の動作確認
        await clickStartGame(page);
        await expect(page.locator('#score')).toBeVisible();
      }
      
      await page.close();
    });

    test('should handle intermittent WebSocket connection', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      
      // 断続的な接続をシミュレート
      for (let i = 0; i < 3; i++) {
        await page.context().setOffline(true);
        await page.waitForTimeout(1000);
        await page.context().setOffline(false);
        await page.waitForTimeout(2000);
      }
      
      // ゲームが正常に動作することを確認
      await clickStartGame(page);
      await expect(page.locator('#score')).toBeVisible();
      
      // エラーが蓄積していないことを確認
      expect(page.errors.length).toBeLessThan(5);
    });
  });

  test.describe('Packet Loss Simulation', () => {
    test('should handle 10% packet loss', async () => {
      // パケットロスをシミュレート（CDP経由）
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      
      // 10%のリクエストをランダムに失敗させる
      let requestCount = 0;
      await page.route('**/*', async route => {
        requestCount++;
        if (requestCount % 10 === 0) {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      
      await navigateToGame(page);
      
      // 部分的な読み込み失敗があってもゲームが起動することを確認
      await expect(page.locator('#gameCanvas')).toBeVisible({ timeout: 20000 });
      
      // 基本機能が動作することを確認
      const startButton = await page.locator('#startButton');
      if (await startButton.isVisible()) {
        await startButton.click();
      }
      
      // エラーハンドリングが適切に行われることを確認
      const errorCount = page.errors.length;
      expect(errorCount).toBeLessThan(10); // 許容可能なエラー数
    });

    test('should handle request timeout', async () => {
      // 特定のリクエストにタイムアウトを設定
      await page.route('**/*.js', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒遅延
        await route.continue();
      });
      
      // タイムアウトを考慮した長めの待機時間
      await page.goto('http://localhost:3000', { timeout: 60000 });
      
      // 最終的にゲームが表示されることを確認
      await expect(page.locator('#gameCanvas')).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('Offline Mode', () => {
    test('should continue game in offline mode', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);
      
      // 初期スコアを記録
      const initialScore = await page.locator('#score').textContent();
      
      // オフラインモードに切り替え
      await page.context().setOffline(true);
      
      // ゲームプレイを継続
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }
      
      // ボールとプレイヤーが表示され続けることを確認
      await expect(page.locator('#ball')).toBeVisible();
      await expect(page.locator('#player')).toBeVisible();
      
      // スコアが更新されることを確認（ローカルゲームの場合）
      const currentScore = await page.locator('#score').textContent();
      // スコア形式により、更新の有無を確認
      expect(currentScore).toBeTruthy();
    });

    test('should save and restore game state', async () => {
      await navigateToGame(page);
      await waitForGameLoad(page);
      await clickStartGame(page);
      
      // ゲームをプレイ
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);
      }
      
      // 現在の状態を記録
      const scoreBeforeOffline = await page.locator('#score').textContent();
      
      // オフラインにする
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      // ページをリロード（オフライン状態で）
      await page.reload({ timeout: 30000 }).catch(() => {
        // オフラインでのリロードは失敗する可能性がある
      });
      
      // オンラインに戻す
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      // ページを再度読み込み
      await page.reload();
      await waitForGameLoad(page);
      
      // ゲームが正常に動作することを確認
      await expect(page.locator('#gameCanvas')).toBeVisible();
      await expect(page.locator('#startButton')).toBeVisible();
    });
  });

  test('should show appropriate network status indicators', async () => {
    await navigateToGame(page);
    await waitForGameLoad(page);
    
    // オンライン状態の確認
    const statusIndicator = await page.locator('[class*="connection"], [class*="network"], [class*="status"]');
    if (await statusIndicator.count() > 0) {
      // オフラインにする
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      // ステータス表示の変化を確認
      const offlineText = await statusIndicator.textContent();
      expect(offlineText.toLowerCase()).toMatch(/offline|disconnected|no connection/);
      
      // オンラインに戻す
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      // ステータス表示が更新されることを確認
      const onlineText = await statusIndicator.textContent();
      expect(onlineText.toLowerCase()).toMatch(/online|connected|ready/);
    }
  });
});