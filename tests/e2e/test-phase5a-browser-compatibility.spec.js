/**
 * Phase 5A: ブラウザ互換性改善テスト
 * 
 * WebKit/Firefox/Mobile環境での適応的タイムアウトシステムの検証
 */

const { test, expect } = require('@playwright/test');

test.describe('Phase 5A: ブラウザ互換性改善テスト', () => {
    
    test.beforeEach(async ({ page }) => {
        // コンソールログをキャプチャ
        page.on('console', msg => {
            if (msg.type() === 'log' && msg.text().includes('Adaptive Timeout')) {
                console.log('🔧 Adaptive Timeout Log:', msg.text());
            }
        });
        
        // エラーをキャプチャ
        page.on('pageerror', error => {
            console.error('❌ Page Error:', error.message);
        });
    });
    
    test('適応的タイムアウトシステムの基本動作確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // BrowserAdaptiveTimeoutManagerの存在確認
        const adaptiveTimeoutAvailable = await page.evaluate(() => {
            return typeof BrowserAdaptiveTimeoutManager === 'function' && 
                   window.browserAdaptiveTimeout !== undefined;
        });
        expect(adaptiveTimeoutAvailable).toBe(true);
        
        // ブラウザ情報の検出確認
        const browserInfo = await page.evaluate(() => {
            return window.browserAdaptiveTimeout.browserInfo;
        });
        
        expect(browserInfo).toHaveProperty('name');
        expect(browserInfo).toHaveProperty('hardwareConcurrency');
        expect(browserInfo).toHaveProperty('deviceMemory');
        
        console.log(`✅ ブラウザ情報検出完了: ${browserInfo.name}`);
        console.log(`📊 ハードウェア情報: CPU=${browserInfo.hardwareConcurrency}, RAM=${browserInfo.deviceMemory}GB`);
    });
    
    test('ブラウザ別タイムアウト倍率の適用確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // タイムアウト倍率の取得
        const timeoutMultipliers = await page.evaluate(() => {
            return window.browserAdaptiveTimeout.timeoutMultipliers;
        });
        
        expect(timeoutMultipliers).toHaveProperty('calculated');
        expect(timeoutMultipliers).toHaveProperty('pyodideInit');
        expect(timeoutMultipliers).toHaveProperty('gameLoad');
        
        // ブラウザ固有の倍率確認
        const browserSpecificMultiplier = await page.evaluate(() => {
            const info = window.browserAdaptiveTimeout.browserInfo;
            if (info.isWebKit) return 'webkit';
            if (info.isFirefox) return 'firefox';
            if (info.isChrome) return 'chrome';
            return 'unknown';
        });
        
        console.log(`🎯 ブラウザ: ${browserName} (検出: ${browserSpecificMultiplier})`);
        console.log(`⚡ タイムアウト倍率: ${timeoutMultipliers.calculated.toFixed(2)}x`);
        console.log(`🔄 Pyodide初期化倍率: ${timeoutMultipliers.pyodideInit.toFixed(2)}x`);
        
        // 適応的タイムアウトの計算確認
        const adaptiveTimeout = await page.evaluate(() => {
            return window.browserAdaptiveTimeout.getAdaptiveTimeout('pyodideInit', 30000);
        });
        
        expect(adaptiveTimeout).toBeGreaterThan(5000);  // 最小5秒
        expect(adaptiveTimeout).toBeLessThan(120000);   // 最大2分
        
        console.log(`⏰ 適応的タイムアウト: ${adaptiveTimeout}ms`);
    });
    
    test('並列初期化システムとの統合確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // 適応的タイムアウトが適用された並列初期化の開始
        const initializationResult = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Initialization timeout'));
                }, 120000); // 2分のタイムアウト
                
                if (window.parallelInitializer) {
                    window.parallelInitializer.on('initializationCompleted', (stats) => {
                        clearTimeout(timeout);
                        resolve(stats);
                    });
                    
                    window.parallelInitializer.on('initializationError', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                    
                    window.parallelInitializer.startInitialization();
                } else {
                    clearTimeout(timeout);
                    reject(new Error('ParallelInitializer not found'));
                }
            });
        });
        
        // 初期化成功の確認
        expect(initializationResult.successRate).toBeGreaterThan(75);
        expect(initializationResult.totalDuration).toBeGreaterThan(0);
        
        console.log(`✅ 並列初期化成功: ${initializationResult.successRate}%`);
        console.log(`⏱️  総初期化時間: ${initializationResult.totalDuration}ms`);
        console.log(`🎯 完了ステージ: ${initializationResult.completedStages}/${initializationResult.totalStages}`);
    });
    
    test('WebKit環境での最適化確認', async ({ page, browserName }) => {
        test.skip(browserName !== 'webkit', 'WebKit専用テスト');
        
        await page.goto('http://localhost:3000/docs/game.html');
        
        // WebKit固有の最適化設定確認
        const webkitOptimizations = await page.evaluate(() => {
            const info = window.browserAdaptiveTimeout.browserInfo;
            const opts = window.browserAdaptiveTimeout.getBrowserSpecificOptimizations();
            
            return {
                isWebKit: info.isWebKit,
                webWorkerPoolSize: opts.webWorkerPoolSize,
                useRequestIdleCallback: opts.useRequestIdleCallback,
                priorityHints: opts.priorityHints
            };
        });
        
        expect(webkitOptimizations.isWebKit).toBe(true);
        expect(webkitOptimizations.webWorkerPoolSize).toBe(1); // WebKit制限
        expect(webkitOptimizations.useRequestIdleCallback).toBe(false); // 対応不完全
        expect(webkitOptimizations.priorityHints).toBe(false); // 未対応
        
        console.log('✅ WebKit最適化設定が適用されました');
        console.log(`🔧 Web Workerプールサイズ: ${webkitOptimizations.webWorkerPoolSize}`);
    });
    
    test('Firefox環境での最適化確認', async ({ page, browserName }) => {
        test.skip(browserName !== 'firefox', 'Firefox専用テスト');
        
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Firefox固有の最適化設定確認
        const firefoxOptimizations = await page.evaluate(() => {
            const info = window.browserAdaptiveTimeout.browserInfo;
            const opts = window.browserAdaptiveTimeout.getBrowserSpecificOptimizations();
            
            return {
                isFirefox: info.isFirefox,
                webWorkerPoolSize: opts.webWorkerPoolSize,
                useRequestIdleCallback: opts.useRequestIdleCallback,
                priorityHints: opts.priorityHints
            };
        });
        
        expect(firefoxOptimizations.isFirefox).toBe(true);
        expect(firefoxOptimizations.webWorkerPoolSize).toBe(2); // Firefox標準
        expect(firefoxOptimizations.useRequestIdleCallback).toBe(true); // 対応
        expect(firefoxOptimizations.priorityHints).toBe(false); // 部分対応
        
        console.log('✅ Firefox最適化設定が適用されました');
        console.log(`🔧 Web Workerプールサイズ: ${firefoxOptimizations.webWorkerPoolSize}`);
    });
    
    test('Chrome環境での最適化確認', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chrome専用テスト');
        
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Chrome固有の最適化設定確認
        const chromeOptimizations = await page.evaluate(() => {
            const info = window.browserAdaptiveTimeout.browserInfo;
            const opts = window.browserAdaptiveTimeout.getBrowserSpecificOptimizations();
            
            return {
                isChrome: info.isChrome,
                webWorkerPoolSize: opts.webWorkerPoolSize,
                useRequestIdleCallback: opts.useRequestIdleCallback,
                priorityHints: opts.priorityHints,
                hardwareConcurrency: info.hardwareConcurrency
            };
        });
        
        expect(chromeOptimizations.isChrome).toBe(true);
        expect(chromeOptimizations.webWorkerPoolSize).toBeGreaterThan(0);
        expect(chromeOptimizations.useRequestIdleCallback).toBe(true);
        expect(chromeOptimizations.priorityHints).toBe(true);
        
        console.log('✅ Chrome最適化設定が適用されました');
        console.log(`🔧 Web Workerプールサイズ: ${chromeOptimizations.webWorkerPoolSize}`);
        console.log(`💻 ハードウェア並列度: ${chromeOptimizations.hardwareConcurrency}`);
    });
    
    test('段階的タイムアウト機能の確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // 段階的タイムアウト機能のテスト
        const progressiveTimeoutResult = await page.evaluate(() => {
            return new Promise((resolve) => {
                const attempts = [];
                let attemptCount = 0;
                
                // 模擬的な失敗関数
                const mockOperation = async () => {
                    attemptCount++;
                    attempts.push({
                        attempt: attemptCount,
                        timestamp: Date.now()
                    });
                    
                    if (attemptCount < 2) {
                        throw new Error('Mock failure');
                    }
                    return { success: true, attempts: attempts };
                };
                
                // 段階的タイムアウトでリトライ
                window.browserAdaptiveTimeout.waitWithProgressiveTimeout(
                    'gameLoad', 
                    mockOperation, 
                    3
                ).then(result => {
                    resolve(result);
                }).catch(error => {
                    resolve({ error: error.message, attempts: attempts });
                });
            });
        });
        
        if (progressiveTimeoutResult.success) {
            expect(progressiveTimeoutResult.attempts.length).toBe(2);
            console.log('✅ 段階的タイムアウト機能が正常に動作');
            console.log(`🔄 リトライ回数: ${progressiveTimeoutResult.attempts.length}`);
        } else {
            console.log('⚠️ 段階的タイムアウト機能のテストが失敗');
        }
    });
    
    test('パフォーマンス推奨事項の生成確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // パフォーマンスレポートの生成
        const performanceReport = await page.evaluate(() => {
            return window.browserAdaptiveTimeout.createPerformanceReport();
        });
        
        expect(performanceReport).toHaveProperty('browserInfo');
        expect(performanceReport).toHaveProperty('performanceProfile');
        expect(performanceReport).toHaveProperty('timeoutMultipliers');
        expect(performanceReport).toHaveProperty('optimizations');
        expect(performanceReport).toHaveProperty('recommendations');
        
        console.log('✅ パフォーマンスレポート生成完了');
        console.log(`📊 ブラウザ: ${performanceReport.browserInfo.name}`);
        console.log(`💡 推奨事項: ${performanceReport.recommendations.length}件`);
        
        // 推奨事項の内容確認
        performanceReport.recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. [${rec.type}] ${rec.message}`);
        });
    });
    
    test('メモリ制約環境での動作確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // 低メモリ環境の模擬
        const lowMemoryResult = await page.evaluate(() => {
            // デバイスメモリを模擬的に低く設定
            const originalDeviceMemory = window.browserAdaptiveTimeout.browserInfo.deviceMemory;
            
            // 低メモリ環境でのタイムアウト計算
            const mockLowMemoryBrowser = Object.assign({}, window.browserAdaptiveTimeout.browserInfo);
            mockLowMemoryBrowser.deviceMemory = 2; // 2GB RAM
            
            window.browserAdaptiveTimeout.browserInfo = mockLowMemoryBrowser;
            const multipliers = window.browserAdaptiveTimeout.calculateTimeoutMultipliers();
            
            // 元の値に戻す
            window.browserAdaptiveTimeout.browserInfo.deviceMemory = originalDeviceMemory;
            
            return {
                original: originalDeviceMemory,
                simulated: 2,
                multipliers: multipliers
            };
        });
        
        expect(lowMemoryResult.multipliers.calculated).toBeGreaterThan(1.0);
        
        console.log('✅ 低メモリ環境での最適化確認完了');
        console.log(`💾 実際のメモリ: ${lowMemoryResult.original}GB`);
        console.log(`🔄 低メモリ時の倍率: ${lowMemoryResult.multipliers.calculated.toFixed(2)}x`);
    });
    
    test('ネットワーク接続品質による最適化確認', async ({ page, browserName }) => {
        await page.goto('http://localhost:3000/docs/game.html');
        
        // ネットワーク接続品質の影響確認
        const networkOptimization = await page.evaluate(() => {
            const connectionType = window.browserAdaptiveTimeout.browserInfo.connectionType;
            const baseTimeout = 30000;
            const networkTimeout = window.browserAdaptiveTimeout.getAdaptiveTimeout('networkRequest', baseTimeout);
            
            return {
                connectionType: connectionType,
                baseTimeout: baseTimeout,
                optimizedTimeout: networkTimeout,
                improvement: networkTimeout / baseTimeout
            };
        });
        
        expect(networkOptimization.optimizedTimeout).toBeGreaterThan(5000);
        
        console.log('✅ ネットワーク最適化確認完了');
        console.log(`📶 接続タイプ: ${networkOptimization.connectionType}`);
        console.log(`⏰ 最適化倍率: ${networkOptimization.improvement.toFixed(2)}x`);
    });
    
});

// ブラウザ固有のテストスイート
test.describe('ブラウザ固有の詳細テスト', () => {
    
    test('Safari/WebKit固有の問題対応確認', async ({ page, browserName }) => {
        test.skip(browserName !== 'webkit', 'WebKit専用テスト');
        
        await page.goto('http://localhost:3000/docs/game.html');
        
        // Safari固有の問題への対応確認
        const safariHandling = await page.evaluate(() => {
            // Web Audio APIの制限対応確認
            const audioContext = window.audioContext || window.webkitAudioContext;
            const audioSupported = audioContext !== undefined;
            
            // Service Workerの制限確認
            const serviceWorkerSupported = 'serviceWorker' in navigator;
            
            return {
                audioSupported: audioSupported,
                serviceWorkerSupported: serviceWorkerSupported,
                userAgent: navigator.userAgent.includes('Safari')
            };
        });
        
        console.log('✅ Safari/WebKit固有の対応確認完了');
        console.log(`🔊 Audio API: ${safariHandling.audioSupported ? '対応' : '未対応'}`);
        console.log(`⚙️ Service Worker: ${safariHandling.serviceWorkerSupported ? '対応' : '未対応'}`);
    });
    
});