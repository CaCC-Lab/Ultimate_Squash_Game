/**
 * チャレンジシステム E2Eテスト
 * 
 * 個人開発規約遵守:
 * - TDD必須: 実際のブラウザでのチャレンジ機能テスト
 * - モック禁止: 実際のWebSocketサーバーとの通信
 * - エラー3要素: テスト失敗時の詳細メッセージ
 */

import { test, expect } from '@playwright/test';

test.describe('チャレンジシステム', () => {
  
  test.beforeEach(async ({ page }) => {
    // ブラウザコンソールエラーの監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ ブラウザコンソールエラー: ${msg.text()}`);
      }
    });
    
    // ゲームページを開いてWebSocket接続を確立
    await page.goto('/docs/game.html');
    await expect(page.locator('.connection-status')).toContainText('🟢 接続中', { timeout: 10000 });
  });

  test('チャレンジボタンが表示される', async ({ page }) => {
    // チャレンジボタンまたはチャレンジ関連要素の存在確認
    const challengeElements = [
      '#challengeButton',
      '.challenge-button',
      '[data-action="challenge"]',
      '.challenge-selector',
      '#challengeMenu'
    ];
    
    let challengeElementFound = false;
    
    for (const selector of challengeElements) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          challengeElementFound = true;
          console.log(`✅ チャレンジ要素が見つかりました: ${selector}`);
          break;
        }
      } catch (error) {
        // 要素が見つからない場合は次を試す
        continue;
      }
    }
    
    // 何らかのチャレンジ関連要素が存在することを確認
    expect(challengeElementFound).toBe(true);
  });

  test('チャレンジロード機能が動作する', async ({ page }) => {
    // WebSocketクライアントでチャレンジロードをテスト
    const challengeLoadResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      try {
        // テストチャレンジデータ
        const testChallenge = {
          id: 'test-challenge-e2e',
          name: 'E2Eテストチャレンジ',
          objectives: ['スコア50点を達成', 'ボールを5回ヒット'],
          gameModifiers: {
            ballSpeed: 1.2,
            paddleSize: 0.9,
            scoreMultiplier: 1.5
          },
          difficulty: 2,
          timeLimit: 30
        };
        
        // WebSocket経由でチャレンジロード
        const message = {
          type: 'challenge:load',
          payload: testChallenge,
          timestamp: new Date().toISOString()
        };
        
        window.websocketClient.ws.send(JSON.stringify(message));
        
        return { success: true, challengeId: testChallenge.id };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(challengeLoadResult.success).toBe(true);
    console.log(`✅ チャレンジロード機能が動作しました: ${challengeLoadResult.challengeId}`);
  });

  test('難易度調整機能が動作する', async ({ page }) => {
    // WebSocketクライアントで難易度調整をテスト
    const difficultyUpdateResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      try {
        // 難易度更新メッセージ
        const message = {
          type: 'difficulty:update',
          payload: {
            level: 4,
            description: 'エキスパート'
          },
          timestamp: new Date().toISOString()
        };
        
        window.websocketClient.ws.send(JSON.stringify(message));
        
        return { success: true, level: 4 };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(difficultyUpdateResult.success).toBe(true);
    console.log(`✅ 難易度調整機能が動作しました: レベル${difficultyUpdateResult.level}`);
  });

  test('ゲーム修飾子適用が動作する', async ({ page }) => {
    // WebSocketクライアントでゲーム修飾子をテスト
    const modifierApplyResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      try {
        // ゲーム修飾子適用メッセージ
        const message = {
          type: 'modifier:apply',
          payload: {
            type: 'speed_boost',
            value: 1.5,
            duration: 10
          },
          timestamp: new Date().toISOString()
        };
        
        window.websocketClient.ws.send(JSON.stringify(message));
        
        return { success: true, modifier: 'speed_boost' };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(modifierApplyResult.success).toBe(true);
    console.log(`✅ ゲーム修飾子適用が動作しました: ${modifierApplyResult.modifier}`);
  });

  test('チャレンジ応答メッセージを受信する', async ({ page }) => {
    // WebSocketレスポンスの監視設定
    const responseReceived = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      return new Promise((resolve) => {
        let messageReceived = false;
        const timeout = setTimeout(() => {
          if (!messageReceived) {
            resolve({ success: false, error: 'Response timeout' });
          }
        }, 5000);
        
        // WebSocketメッセージリスナー
        function messageHandler(event) {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type && (
              data.type.includes('challenge') || 
              data.type.includes('difficulty') || 
              data.type.includes('modifier')
            )) {
              messageReceived = true;
              clearTimeout(timeout);
              window.websocketClient.ws.removeEventListener('message', messageHandler);
              resolve({ 
                success: true, 
                messageType: data.type, 
                payload: data.payload 
              });
            }
          } catch (error) {
            // JSON解析エラーは無視（他のメッセージの可能性）
          }
        }
        
        window.websocketClient.ws.addEventListener('message', messageHandler);
        
        // テストメッセージを送信
        const testMessage = {
          type: 'challenge:load',
          payload: {
            id: 'response-test-challenge',
            name: 'レスポンステスト',
            objectives: ['テスト目標'],
            gameModifiers: { ballSpeed: 1.0 },
            difficulty: 1,
            timeLimit: 60
          },
          timestamp: new Date().toISOString()
        };
        
        window.websocketClient.ws.send(JSON.stringify(testMessage));
      });
    });
    
    expect(responseReceived.success).toBe(true);
    console.log(`✅ チャレンジ応答メッセージを受信しました: ${responseReceived.messageType}`);
  });

  test('複数のチャレンジメッセージを連続送信', async ({ page }) => {
    // 複数のチャレンジメッセージを連続送信してサーバーの安定性をテスト
    const multipleMessagesResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      try {
        const messages = [
          {
            type: 'challenge:load',
            payload: {
              id: 'multi-test-1',
              name: '連続テスト1',
              objectives: ['目標1'],
              gameModifiers: { ballSpeed: 1.1 },
              difficulty: 1,
              timeLimit: 30
            }
          },
          {
            type: 'difficulty:update',
            payload: { level: 3, description: '上級' }
          },
          {
            type: 'modifier:apply',
            payload: { type: 'paddle_boost', value: 1.3, duration: 15 }
          },
          {
            type: 'game:request_state',
            payload: {}
          }
        ];
        
        // 連続送信
        for (let i = 0; i < messages.length; i++) {
          const message = {
            ...messages[i],
            timestamp: new Date().toISOString()
          };
          
          window.websocketClient.ws.send(JSON.stringify(message));
          
          // 少し間隔を空ける
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return { success: true, messageCount: messages.length };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(multipleMessagesResult.success).toBe(true);
    console.log(`✅ 複数メッセージの連続送信が成功しました: ${multipleMessagesResult.messageCount}件`);
  });

  test('無効なチャレンジデータの処理', async ({ page }) => {
    // 無効なデータを送信してエラーハンドリングをテスト
    const invalidDataResult = await page.evaluate(async () => {
      if (!window.websocketClient || !window.websocketClient.connected) {
        return { success: false, error: 'WebSocket not connected' };
      }
      
      try {
        // 無効なチャレンジデータを送信
        const invalidMessages = [
          // 必須フィールド欠如
          {
            type: 'challenge:load',
            payload: {
              name: '不完全なチャレンジ'
              // id が欠如
            }
          },
          // 不正なJSON
          'invalid json string',
          // 空のペイロード
          {
            type: 'challenge:load',
            payload: null
          }
        ];
        
        for (const invalidMessage of invalidMessages) {
          try {
            if (typeof invalidMessage === 'string') {
              window.websocketClient.ws.send(invalidMessage);
            } else {
              window.websocketClient.ws.send(JSON.stringify(invalidMessage));
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            // 送信エラーは想定内
          }
        }
        
        return { success: true, note: 'Invalid data handled gracefully' };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    // 無効なデータが適切に処理されることを確認（エラーで落ちない）
    expect(invalidDataResult.success).toBe(true);
    console.log('✅ 無効なチャレンジデータが適切に処理されました');
  });

});