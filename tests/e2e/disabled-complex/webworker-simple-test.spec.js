/**
 * WebWorker Phase 4 シンプル動作確認テスト
 * パフォーマンス測定を行わず、基本的な機能のみをテスト
 */

import { test, expect } from '@playwright/test';

test.describe('WebWorker Phase 4 基本動作確認', () => {
    let page;
    
    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        
        // HTTPサーバーのベースURL
        const baseURL = 'http://localhost:8000';
        
        // ベースページを読み込み
        await page.goto(`${baseURL}`);
        
        // 基本的なWorkerファイルが存在するか確認
        const response = await page.goto(`${baseURL}/tools/workers/communication/worker-manager.js`);
        expect(response.status()).toBe(200);
        
        // ベースページに戻る
        await page.goto(`${baseURL}`);
        
        // 必要なスクリプトを順番に読み込み
        await page.addScriptTag({
            type: 'module',
            url: '/tools/workers/communication/message-protocol.js'
        });
        
        await page.addScriptTag({
            type: 'module',
            url: '/tools/workers/communication/aot-loader.js'
        });
        
        await page.addScriptTag({
            type: 'module', 
            url: '/tools/workers/communication/worker-manager.js'
        });
        
        // モジュールが読み込まれるまで少し待機
        await page.waitForTimeout(2000);
    });
    
    test('基本的なWorkerManager作成とクリーンアップ', async () => {
        console.log('🧪 基本的なWorkerManager動作確認開始');
        
        const result = await page.evaluate(async () => {
            try {
                // WorkerManagerクラスのインポート
                const { default: WorkerManager } = await import('/tools/workers/communication/worker-manager.js');
                
                console.log('✅ WorkerManager正常にインポート済み');
                
                // WorkerManagerのインスタンス作成
                const manager = new WorkerManager();
                console.log('✅ WorkerManagerインスタンス作成成功');
                
                // 初期化処理
                await manager.initialize();
                console.log('✅ WorkerManager初期化成功');
                
                // 基本的な統計取得
                const stats = manager.getStats();
                console.log('✅ 統計情報取得成功:', stats);
                
                // クリーンアップ
                await manager.terminateAll();
                console.log('✅ WorkerManager終了処理成功');
                
                return {
                    success: true,
                    stats: stats,
                    workerCount: stats.activeWorkers
                };
                
            } catch (error) {
                console.error('❌ WorkerManager動作エラー:', error);
                return {
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
            }
        });
        
        console.log('📊 基本動作確認結果:', JSON.stringify(result, null, 2));
        
        // 結果検証
        expect(result.success).toBe(true);
        if (result.error) {
            throw new Error(`基本動作確認失敗: ${result.error}`);
        }
        
        expect(result.stats).toBeDefined();
        expect(result.stats.activeWorkers).toBeGreaterThanOrEqual(0);
        
        console.log('✅ WebWorker Phase 4 基本動作確認合格');
    });
    
    test('単一Workerの作成と通信テスト', async () => {
        console.log('🔗 単一Worker通信テスト開始');
        
        const result = await page.evaluate(async () => {
            try {
                const { default: WorkerManager } = await import('/tools/workers/communication/worker-manager.js');
                const { MessageType, MessageBuilder } = await import('/tools/workers/communication/message-protocol.js');
                
                const manager = new WorkerManager();
                
                // 初期化（標準Workerを作成）
                await manager.initialize();
                
                // game-logic Workerとの通信テスト
                const pingMessage = new MessageBuilder()
                    .type(MessageType.PING)
                    .payload({ timestamp: performance.now() })
                    .build();
                
                console.log('📡 PINGメッセージ送信中...');
                
                const startTime = performance.now();
                const response = await manager.sendMessage('game-logic', pingMessage, 10000); // 10秒タイムアウト
                const responseTime = performance.now() - startTime;
                
                console.log('📨 PONG応答受信:', response);
                
                // クリーンアップ
                await manager.terminateAll();
                
                return {
                    success: true,
                    responseTime: responseTime,
                    messageType: response.type,
                    roundTripTime: responseTime
                };
                
            } catch (error) {
                console.error('❌ 単一Worker通信エラー:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('📊 単一Worker通信結果:', JSON.stringify(result, null, 2));
        
        // 結果検証
        expect(result.success).toBe(true);
        if (result.error) {
            throw new Error(`単一Worker通信失敗: ${result.error}`);
        }
        
        expect(result.messageType).toBe('PONG');
        expect(result.responseTime).toBeLessThan(5000); // 5秒以内のレスポンス
        
        console.log(`⚡ レスポンス時間: ${result.responseTime.toFixed(1)}ms`);
        console.log('✅ 単一Worker通信テスト合格');
    });
    
    test.afterEach(async () => {
        if (page) {
            await page.close();
        }
    });
});