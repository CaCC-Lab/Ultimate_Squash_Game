/**
 * 統合テスト - WebSocket + ゲーム + チャレンジシステム
 *
 * 個人開発規約遵守:
 * - TDD必須: システム全体の統合動作確認
 * - モック禁止: 実際の環境での完全なワークフロー
 * - エラー3要素: 統合テスト失敗時の詳細メッセージ
 */

import { test, expect } from '@playwright/test';

test.describe('統合テスト', () => {

  test.beforeEach(async ({ page }) => {
    // ブラウザコンソールエラーの監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ ブラウザコンソールエラー: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`❌ ページエラー: ${error.message}`);
    });

    // ゲームページを開く
    await page.goto('/docs/game.html');
  });

  test('完全なゲームプレイワークフロー', async ({ page }) => {
    console.log('🎮 完全なゲームプレイワークフローテストを開始...');

    // 1. WebSocket接続の確立
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 15000 });
    console.log('✅ Step 1: WebSocket接続確立');

    // 2. ゲーム開始
    await page.click('#startButton');
    await expect(page.locator('#gameMenu')).toBeHidden({ timeout: 5000 });
    console.log('✅ Step 2: ゲーム開始');

    // 3. ゲーム状態の確認
    const gameActive = await page.evaluate(() => {
      return window.gameState && window.gameState.isPlaying;
    });
    expect(gameActive).toBe(true);
    console.log('✅ Step 3: ゲーム状態確認');

    // 4. パドル操作
    const canvas = page.locator('#gameCanvas');
    await canvas.hover();
    await page.mouse.move(400, 350);
    await page.waitForTimeout(500);
    console.log('✅ Step 4: パドル操作');

    // 5. WebSocket経由でゲーム状態を取得
    const gameStateReceived = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return false;
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 3000);

        function messageHandler(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'game:state' || data.type === 'game:update') {
              clearTimeout(timeout);
              window.websocketClient.ws.removeEventListener('message', messageHandler);
              resolve(true);
            }
          } catch (error) {
            // JSON解析エラーは無視
          }
        }

        window.websocketClient.ws.addEventListener('message', messageHandler);

        // ゲーム状態リクエスト
        const message = {
          type: 'game:request_state',
          payload: {},
          timestamp: new Date().toISOString()
        };

        window.websocketClient.ws.send(JSON.stringify(message));
      });
    });

    expect(gameStateReceived).toBe(true);
    console.log('✅ Step 5: WebSocket経由ゲーム状態取得');

    // 6. 統合テスト完了
    console.log('🎯 完全なゲームプレイワークフローテストが成功しました');
  });

  test('チャレンジシステム統合ワークフロー', async ({ page }) => {
    console.log('🎯 チャレンジシステム統合ワークフローテストを開始...');

    // 1. WebSocket接続の確立
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 15000 });
    console.log('✅ Step 1: WebSocket接続確立');

    // 2. チャレンジロード＋レスポンス確認
    const challengeWorkflow = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, step: 'connection' };
      }

      return new Promise((resolve) => {
        let step = 1;
        const timeout = setTimeout(() => {
          resolve({ success: false, step: `timeout_at_step_${step}` });
        }, 10000);

        function messageHandler(event) {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'challenge:loaded' && step === 1) {
              step = 2;

              // Step 2: 難易度更新
              const difficultyMessage = {
                type: 'difficulty:update',
                payload: { level: 3, description: '統合テスト' },
                timestamp: new Date().toISOString()
              };
              window.websocketClient.ws.send(JSON.stringify(difficultyMessage));

            } else if (data.type === 'difficulty:updated' && step === 2) {
              step = 3;

              // Step 3: ゲーム修飾子適用
              const modifierMessage = {
                type: 'modifier:apply',
                payload: { type: 'integration_test', value: 1.0, duration: 5 },
                timestamp: new Date().toISOString()
              };
              window.websocketClient.ws.send(JSON.stringify(modifierMessage));

            } else if (data.type === 'modifier:applied' && step === 3) {
              // 統合テスト完了
              clearTimeout(timeout);
              window.websocketClient.ws.removeEventListener('message', messageHandler);
              resolve({ success: true, step: 'completed', finalData: data });
            }
          } catch (error) {
            // JSON解析エラーは無視
          }
        }

        window.websocketClient.ws.addEventListener('message', messageHandler);

        // Step 1: チャレンジロード
        const challengeMessage = {
          type: 'challenge:load',
          payload: {
            id: 'integration-test-challenge',
            name: '統合テストチャレンジ',
            objectives: ['統合テスト目標1', '統合テスト目標2'],
            gameModifiers: {
              ballSpeed: 1.1,
              paddleSize: 1.0,
              scoreMultiplier: 1.2
            },
            difficulty: 2,
            timeLimit: 60
          },
          timestamp: new Date().toISOString()
        };

        window.websocketClient.ws.send(JSON.stringify(challengeMessage));
      });
    });

    expect(challengeWorkflow.success).toBe(true);
    console.log(`✅ チャレンジシステム統合ワークフロー完了: ${challengeWorkflow.step}`);
  });

  test('エラー状況での復旧テスト', async ({ page }) => {
    console.log('🔧 エラー状況での復旧テストを開始...');

    // 1. 正常な接続確立
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 15000 });
    console.log('✅ Step 1: 正常接続確立');

    // 2. 無効なメッセージ送信（エラー誘発）
    const errorRecoveryResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'No connection' };
      }

      try {
        // 無効なメッセージを複数送信
        const invalidMessages = [
          'invalid json',
          '{"invalid": json}',
          null,
          undefined,
          ''
        ];

        for (const invalidMsg of invalidMessages) {
          try {
            if (invalidMsg !== null && invalidMsg !== undefined) {
              window.websocketClient.ws.send(invalidMsg);
            }
          } catch (e) {
            // 送信エラーは想定内
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // 正常なメッセージで復旧確認
        const validMessage = {
          type: 'game:request_state',
          payload: {},
          timestamp: new Date().toISOString()
        };

        window.websocketClient.ws.send(JSON.stringify(validMessage));

        return { success: true, note: 'Error recovery test completed' };

      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(errorRecoveryResult.success).toBe(true);
    console.log('✅ Step 2: エラー復旧テスト完了');

    // 3. 接続状態が維持されていることを確認
    await page.waitForTimeout(1000);
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中');
    console.log('✅ Step 3: 接続状態維持確認');

    console.log('🔧 エラー状況での復旧テストが成功しました');
  });

  test('パフォーマンス統合テスト', async ({ page }) => {
    console.log('⚡ パフォーマンス統合テストを開始...');

    // 1. WebSocket接続確立
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 15000 });

    // 2. ゲーム開始
    await page.click('#startButton');
    await expect(page.locator('#gameMenu')).toBeHidden({ timeout: 5000 });

    // 3. パフォーマンス測定
    const performanceMetrics = await page.evaluate(async () => {
      const startTime = performance.now();
      let messageCount = 0;
      let totalLatency = 0;

      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'No connection' };
      }

      return new Promise((resolve) => {
        const testDuration = 3000; // 3秒間のテスト
        const endTime = Date.now() + testDuration;

        function messageHandler(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.timestamp) {
              const latency = Date.now() - new Date(data.timestamp).getTime();
              totalLatency += latency;
              messageCount++;
            }
          } catch (error) {
            // JSON解析エラーは無視
          }
        }

        window.websocketClient.ws.addEventListener('message', messageHandler);

        // 定期的にメッセージを送信
        const sendInterval = setInterval(() => {
          if (Date.now() >= endTime) {
            clearInterval(sendInterval);
            window.websocketClient.ws.removeEventListener('message', messageHandler);

            const totalTime = performance.now() - startTime;
            const averageLatency = messageCount > 0 ? totalLatency / messageCount : 0;

            resolve({
              success: true,
              metrics: {
                totalTime: totalTime,
                messageCount: messageCount,
                averageLatency: averageLatency,
                messagesPerSecond: messageCount / (totalTime / 1000)
              }
            });
            return;
          }

          const message = {
            type: 'game:request_state',
            payload: {},
            timestamp: new Date().toISOString()
          };

          try {
            window.websocketClient.ws.send(JSON.stringify(message));
          } catch (error) {
            // 送信エラーは無視
          }
        }, 100); // 100msごとに送信
      });
    });

    expect(performanceMetrics.success).toBe(true);

    const metrics = performanceMetrics.metrics;
    console.log('✅ パフォーマンスメトリクス:');
    console.log(`  - メッセージ数: ${metrics.messageCount}`);
    console.log(`  - 平均レイテンシ: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`  - メッセージ/秒: ${metrics.messagesPerSecond.toFixed(2)}`);

    // パフォーマンス基準の確認
    expect(metrics.averageLatency).toBeLessThan(100);  // 100ms以下
    expect(metrics.messagesPerSecond).toBeGreaterThan(5);  // 5メッセージ/秒以上

    console.log('⚡ パフォーマンス統合テストが成功しました');
  });

  test('長時間動作安定性テスト', async ({ page }) => {
    console.log('⏱️ 長時間動作安定性テストを開始...');

    // 1. WebSocket接続確立
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 15000 });

    // 2. ゲーム開始
    await page.click('#startButton');
    await expect(page.locator('#gameMenu')).toBeHidden({ timeout: 5000 });

    // 3. 長時間動作テスト（10秒間の連続操作）
    const stabilityResult = await page.evaluate(async () => {
      const testDuration = 10000; // 10秒間
      const startTime = Date.now();
      let operationCount = 0;
      let errorCount = 0;

      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'No connection' };
      }

      return new Promise((resolve) => {
        const operationInterval = setInterval(() => {
          const currentTime = Date.now();

          if (currentTime - startTime >= testDuration) {
            clearInterval(operationInterval);

            resolve({
              success: errorCount === 0,
              metrics: {
                duration: currentTime - startTime,
                operationCount: operationCount,
                errorCount: errorCount,
                operationsPerSecond: operationCount / ((currentTime - startTime) / 1000)
              }
            });
            return;
          }

          try {
            // 様々な操作を順番に実行
            const operations = [
              { type: 'game:request_state', payload: {} },
              { type: 'difficulty:update', payload: { level: Math.floor(Math.random() * 5) + 1 } },
              { type: 'modifier:apply', payload: { type: 'random_test', value: Math.random() } }
            ];

            const operation = operations[operationCount % operations.length];
            const message = {
              ...operation,
              timestamp: new Date().toISOString()
            };

            window.websocketClient.ws.send(JSON.stringify(message));
            operationCount++;

          } catch (error) {
            errorCount++;
          }
        }, 200); // 200msごとに操作
      });
    });

    expect(stabilityResult.success).toBe(true);

    const metrics = stabilityResult.metrics;
    console.log('✅ 安定性メトリクス:');
    console.log(`  - 実行時間: ${metrics.duration}ms`);
    console.log(`  - 操作数: ${metrics.operationCount}`);
    console.log(`  - エラー数: ${metrics.errorCount}`);
    console.log(`  - 操作/秒: ${metrics.operationsPerSecond.toFixed(2)}`);

    // 安定性基準の確認
    expect(metrics.errorCount).toBeLessThanOrEqual(1);  // エラー1個以下
    expect(metrics.operationCount).toBeGreaterThan(30);  // 30回以上の操作

    console.log('⏱️ 長時間動作安定性テストが成功しました');
  });

});
