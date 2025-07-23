const { test, expect } = require('@playwright/test');

test.describe('Performance Metrics Collection', () => {
    test.setTimeout(60000); // 1分のタイムアウト

    test('should initialize performance metrics collector', async ({ page }) => {
        // コンソールメッセージを収集
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // ゲームページにアクセス
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Pyodideの読み込みを待つ
        await page.waitForTimeout(10000);
        
        // メトリクスコレクターの初期化を確認
        const initMessage = consoleMessages.find(msg => 
            msg.includes('Performance metrics collector initialized')
        );
        expect(initMessage).toBeTruthy();
        
        // グローバル変数としてメトリクスコレクターが存在することを確認
        const hasCollector = await page.evaluate(() => {
            return window.metricsCollector !== undefined;
        });
        expect(hasCollector).toBe(true);
    });

    test('should collect frame metrics during gameplay', async ({ page }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Pyodideの読み込みを待つ
        await page.waitForTimeout(10000);
        
        // メトリクス収集を開始
        await page.evaluate(() => {
            if (window.metricsCollector) {
                window.metricsCollector.start();
            }
        });
        
        // ゲームを5秒間実行
        await page.waitForTimeout(5000);
        
        // メトリクスを取得
        const metrics = await page.evaluate(() => {
            if (!window.metricsCollector) return null;
            return window.metricsCollector.getStats();
        });
        
        expect(metrics).toBeTruthy();
        expect(metrics.frameTimes).toBeTruthy();
        expect(metrics.frameTimes.min).toBeGreaterThan(0);
        expect(metrics.frameTimes.avg).toBeGreaterThan(0);
        expect(metrics.fps).toBeTruthy();
        expect(metrics.fps.avg).toBeGreaterThan(0);
    });

    test('should measure game logic and rendering separately', async ({ page }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Pyodideの読み込みを待つ
        await page.waitForTimeout(10000);
        
        // メトリクス収集を開始
        await page.evaluate(() => {
            if (window.metricsCollector) {
                window.metricsCollector.start();
                // Simulate some timing data for testing
                window.metricsCollector.startGameLogicTiming();
                window.metricsCollector.endGameLogicTiming();
                window.metricsCollector.startRenderTiming();
                window.metricsCollector.endRenderTiming();
            }
        });
        
        // ゲームを5秒間実行
        await page.waitForTimeout(5000);
        
        // 詳細なメトリクスを取得
        const metrics = await page.evaluate(() => {
            if (!window.metricsCollector) return null;
            return window.metricsCollector.getStats();
        });
        
        // ゲームロジックとレンダリングの計測値を確認
        expect(metrics.gameLogicTime).toBeTruthy();
        expect(metrics.gameLogicTime.avg).toBeGreaterThanOrEqual(0);
        expect(metrics.renderingTime).toBeTruthy();
        expect(metrics.renderingTime.avg).toBeGreaterThanOrEqual(0);
    });

    test('should track memory usage', async ({ page }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Pyodideの読み込みを待つ
        await page.waitForTimeout(10000);
        
        // メトリクス収集を開始
        await page.evaluate(() => {
            if (window.metricsCollector) {
                window.metricsCollector.start();
            }
        });
        
        // ゲームを5秒間実行
        await page.waitForTimeout(5000);
        
        // メモリ使用量を確認
        const metrics = await page.evaluate(() => {
            if (!window.metricsCollector) return null;
            return window.metricsCollector.getStats();
        });
        
        expect(metrics).toBeTruthy();
        // Memory tracking is only available in Chrome-based browsers
        if (metrics.memoryUsage) {
            expect(metrics.memoryUsage.avg).toBeGreaterThan(0);
            expect(metrics.memoryUsage.max).toBeGreaterThan(0);
        }
    });

    test('should display performance overlay in debug mode', async ({ page }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Pyodideの読み込みを待つ
        await page.waitForTimeout(10000);
        
        // デバッグモードを有効化
        await page.evaluate(() => {
            if (window.metricsCollector) {
                window.metricsCollector.startCollection();
                window.metricsCollector.showOverlay();
            }
        });
        
        // オーバーレイの存在を確認
        const overlayExists = await page.evaluate(() => {
            const overlay = document.getElementById('performance-overlay');
            return overlay !== null && overlay.style.display !== 'none';
        });
        
        expect(overlayExists).toBe(true);
        
        // オーバーレイの内容を確認
        await page.waitForTimeout(2000);
        
        const overlayContent = await page.evaluate(() => {
            const overlay = document.getElementById('performance-overlay');
            return overlay ? overlay.textContent : '';
        });
        
        expect(overlayContent).toContain('FPS:');
        expect(overlayContent).toContain('Frame:');
        expect(overlayContent).toContain('Logic:');
        expect(overlayContent).toContain('Render:');
    });
});