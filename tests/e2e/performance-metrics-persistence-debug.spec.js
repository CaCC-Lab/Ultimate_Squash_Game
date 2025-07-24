import { test, expect } from '@playwright/test';

test.describe('Debug Performance Metrics', () => {
    test('debug sessionId and persistence', async ({ page }) => {
        // コンソールメッセージを捕捉
        page.on('console', msg => {
            console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
        });

        // エラーを捕捉
        page.on('pageerror', error => {
            console.error(`[Browser Error]`, error);
        });

        await page.goto('http://localhost:3000/docs/js/optimization/metrics-demo.html');

        // 収集開始
        await page.click('#startBtn');
        console.log('Started collection');

        // セッション情報を確認
        await page.waitForTimeout(1000);
        const sessionInfo = await page.locator('#sessionInfo').textContent();
        console.log('Session Info:', sessionInfo);

        // sessionInfoがnullでないことを確認
        const sessionData = JSON.parse(sessionInfo);
        console.log('Parsed session data:', sessionData);
        expect(sessionData.sessionId).toBeTruthy();
        expect(sessionData.persistenceEnabled).toBe(true);

        // メトリクス収集を待つ
        await page.waitForTimeout(6000);

        // クエリボタンをクリックする前の状態確認
        const queryResultsBefore = await page.locator('#queryResults').textContent();
        console.log('Query results before click:', queryResultsBefore);

        // クエリを実行
        await page.click('button[onclick="queryRecentMetrics()"]');
        console.log('Clicked query button');

        // 結果が更新されるのを待つ
        await page.waitForTimeout(2000);

        // クエリ結果を確認
        const queryResultsAfter = await page.locator('#queryResults').textContent();
        console.log('Query results after click:', queryResultsAfter);

        // エラーメッセージの詳細を確認
        if (queryResultsAfter.includes('クエリエラー') || queryResultsAfter === 'クエリを実行してください') {
            console.error('Query failed or not executed');
            
            // ログ内容を確認
            const logContent = await page.locator('#logContent').textContent();
            console.log('Log content:', logContent);
        }

        // デバッグ用: ブラウザコンソールでコマンドを実行
        const debugInfo = await page.evaluate(async () => {
            const collector = window.metricsCollector;
            return {
                isCollecting: collector.isCollecting,
                sessionId: collector.sessionId,
                persistenceEnabled: collector.config.enablePersistence,
                pendingMetrics: collector.pendingMetrics.length,
                metricsWorker: !!collector.metricsWorker,
                workerPromises: collector.workerPromises.size
            };
        });
        console.log('Debug info from browser:', debugInfo);

        // 直接queryStoredMetricsを呼び出してみる
        try {
            const directQueryResult = await page.evaluate(async () => {
                try {
                    const results = await window.metricsCollector.queryStoredMetrics({
                        startTime: Date.now() - 60000,
                        limit: 10
                    });
                    return { success: true, data: results };
                } catch (error) {
                    return { success: false, error: error.message, stack: error.stack };
                }
            });
            console.log('Direct query result:', directQueryResult);
        } catch (e) {
            console.error('Direct query error:', e);
        }
    });
});