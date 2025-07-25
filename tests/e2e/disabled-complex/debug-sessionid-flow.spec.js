import { test, expect } from '@playwright/test';

test.describe('SessionID Flow Debug', () => {
    test('trace sessionId through the entire flow', async ({ page }) => {
        // すべてのコンソールメッセージを捕捉
        page.on('console', msg => {
            console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
        });

        // エラーを捕捉
        page.on('pageerror', error => {
            console.error(`[Browser Error]`, error);
        });

        await page.goto('http://localhost:3000/docs/js/optimization/metrics-demo.html');

        // Worker内にデバッグコードを注入
        await page.evaluate(() => {
            console.log('🔍 Injecting debug code into metrics collector...');
            
            const collector = window.metricsCollector;
            
            // sendWorkerMessage をラップしてデバッグ
            const originalSendWorkerMessage = collector.sendWorkerMessage.bind(collector);
            collector.sendWorkerMessage = function(type, data) {
                console.log(`🔄 Sending to Worker: ${type}`, data);
                return originalSendWorkerMessage(type, data);
            };
            
            // handleWorkerMessage をラップしてデバッグ
            const originalHandleWorkerMessage = collector.handleWorkerMessage.bind(collector);
            collector.handleWorkerMessage = function(message) {
                console.log(`📥 Received from Worker:`, message);
                return originalHandleWorkerMessage(message);
            };
            
            // recordMetric をラップしてデバッグ
            const originalRecordMetric = collector.recordMetric.bind(collector);
            collector.recordMetric = function(metricName, value) {
                console.log(`📊 Recording metric: ${metricName} = ${value}, sessionId = ${this.sessionId}`);
                return originalRecordMetric(metricName, value);
            };
        });

        // 収集開始
        await page.click('#startBtn');
        console.log('🚀 Started collection');

        // セッション作成を待つ
        await page.waitForTimeout(2000);
        
        // セッション情報を確認
        const sessionInfo = await page.evaluate(() => {
            const collector = window.metricsCollector;
            return {
                sessionId: collector.sessionId,
                isCollecting: collector.isCollecting,
                workerExists: !!collector.metricsWorker,
                persistenceEnabled: collector.config.enablePersistence,
                pendingMetricsCount: collector.pendingMetrics.length
            };
        });
        
        console.log('📋 Session Info:', sessionInfo);
        expect(sessionInfo.sessionId).toBeTruthy();
        expect(sessionInfo.persistenceEnabled).toBe(true);

        // メトリクス収集を待つ（より長く）
        console.log('⏳ Waiting for metrics collection...');
        await page.waitForTimeout(8000);
        
        // ペンディングメトリクスの状態を確認
        const pendingState = await page.evaluate(() => {
            const collector = window.metricsCollector;
            return {
                pendingCount: collector.pendingMetrics.length,
                samplePendingMetrics: collector.pendingMetrics.slice(0, 3),
                sessionId: collector.sessionId
            };
        });
        
        console.log('🔄 Pending Metrics State:', pendingState);

        // 手動でflush実行
        console.log('🚀 Manual flush execution...');
        await page.evaluate(async () => {
            const collector = window.metricsCollector;
            await collector.persistMetrics();
            if (collector.metricsWorker) {
                await collector.sendWorkerMessage('flush', {});
            }
        });
        
        await page.waitForTimeout(2000);
        
        // クエリを実行
        console.log('🔍 Executing query...');
        await page.click('button[onclick="queryRecentMetrics()"]');
        
        await page.waitForTimeout(3000);
        
        // 結果を確認
        const queryResults = await page.locator('#queryResults').textContent();
        console.log('📊 Query Results:', queryResults);
        
        // Worker内の状態をダンプ
        const workerState = await page.evaluate(async () => {
            const collector = window.metricsCollector;
            try {
                // Worker内の状態を直接問い合わせる（カスタムメッセージ）
                return {
                    workerActive: !!collector.metricsWorker,
                    promiseCount: collector.workerPromises.size
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('🔧 Worker State:', workerState);
        
        // IndexedDBの内容を直接確認
        const dbContents = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const request = indexedDB.open('SquashGameMetrics', 1);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['metrics'], 'readonly');
                    const store = transaction.objectStore('metrics');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = () => {
                        const results = getAllRequest.result;
                        resolve({
                            success: true,
                            count: results.length,
                            samples: results.slice(0, 5),
                            sessionIds: [...new Set(results.map(r => r.sessionId).filter(Boolean))]
                        });
                    };
                    
                    getAllRequest.onerror = () => {
                        resolve({ success: false, error: getAllRequest.error });
                    };
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: request.error });
                };
            });
        });
        
        console.log('💾 Direct IndexedDB Contents:', dbContents);
        
        // 分析
        if (dbContents.success && dbContents.count > 0) {
            console.log(`✅ Found ${dbContents.count} metrics in IndexedDB`);
            console.log(`📋 Unique sessionIds:`, dbContents.sessionIds);
            console.log(`📊 Sample data:`, dbContents.samples);
            
            if (dbContents.sessionIds.length === 0) {
                console.error('❌ NO sessionIds found in stored metrics!');
            } else {
                console.log('✅ SessionIds are being stored correctly');
            }
        } else {
            console.error('❌ Failed to read IndexedDB or no data found');
        }
    });
});