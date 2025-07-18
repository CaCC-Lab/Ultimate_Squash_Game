/**
 * Browser Adaptive Timeout System - Phase 5A
 * 
 * ブラウザ固有の特性に基づいて、適応的なタイムアウト設定を提供
 * WebKit/Firefox/Mobile環境での最適化を実現
 */

class BrowserAdaptiveTimeoutManager {
    constructor() {
        this.browserInfo = this.detectBrowserInfo();
        this.performanceProfile = this.createPerformanceProfile();
        this.timeoutMultipliers = this.calculateTimeoutMultipliers();
        
        console.log('[Adaptive Timeout] Browser detected:', this.browserInfo);
        console.log('[Adaptive Timeout] Performance profile:', this.performanceProfile);
        console.log('[Adaptive Timeout] Timeout multipliers:', this.timeoutMultipliers);
    }
    
    /**
     * ブラウザ情報の検出
     */
    detectBrowserInfo() {
        const userAgent = navigator.userAgent;
        const isWebKit = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
        const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
        const isEdge = /Edge/.test(userAgent);
        
        // ハードウェア情報
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const deviceMemory = navigator.deviceMemory || 4; // GB
        const connectionType = navigator.connection?.effectiveType || 'unknown';
        
        return {
            name: isWebKit ? 'webkit' : isFirefox ? 'firefox' : isChrome ? 'chrome' : isEdge ? 'edge' : 'unknown',
            isWebKit,
            isFirefox,
            isChrome,
            isMobile,
            isEdge,
            hardwareConcurrency,
            deviceMemory,
            connectionType,
            userAgent
        };
    }
    
    /**
     * パフォーマンスプロファイルの作成
     */
    createPerformanceProfile() {
        const startTime = performance.now();
        
        // 簡単なパフォーマンステスト
        let iterationCount = 0;
        const testDuration = 10; // 10ms
        const testEndTime = startTime + testDuration;
        
        while (performance.now() < testEndTime) {
            iterationCount++;
        }
        
        const computeScore = iterationCount / testDuration;
        
        // WebWorker サポート確認
        const webWorkerSupported = typeof Worker !== 'undefined';
        
        // Service Worker サポート確認
        const serviceWorkerSupported = 'serviceWorker' in navigator;
        
        // Web Audio API サポート確認
        const audioContextSupported = 'AudioContext' in window || 'webkitAudioContext' in window;
        
        return {
            computeScore,
            webWorkerSupported,
            serviceWorkerSupported,
            audioContextSupported,
            measuredAt: new Date().toISOString()
        };
    }
    
    /**
     * タイムアウト倍率の計算
     */
    calculateTimeoutMultipliers() {
        const base = 1.0;
        let multiplier = base;
        
        // ブラウザ固有の調整
        if (this.browserInfo.isWebKit) {
            multiplier *= 1.5; // WebKitは一般的に遅い
        } else if (this.browserInfo.isFirefox) {
            multiplier *= 1.3; // Firefoxは中程度
        } else if (this.browserInfo.isChrome) {
            multiplier *= 1.0; // Chromeは基準
        }
        
        // モバイル環境の調整
        if (this.browserInfo.isMobile) {
            multiplier *= 2.0; // モバイルは大幅に遅い
        }
        
        // ハードウェア性能による調整
        if (this.browserInfo.hardwareConcurrency < 4) {
            multiplier *= 1.5; // CPU性能が低い場合
        }
        
        if (this.browserInfo.deviceMemory < 4) {
            multiplier *= 1.4; // メモリが少ない場合
        }
        
        // 計算性能による調整
        if (this.performanceProfile.computeScore < 1000) {
            multiplier *= 1.3; // 計算性能が低い場合
        }
        
        // 接続品質による調整
        if (this.browserInfo.connectionType === 'slow-2g' || this.browserInfo.connectionType === '2g') {
            multiplier *= 2.0; // 低速接続
        } else if (this.browserInfo.connectionType === '3g') {
            multiplier *= 1.5; // 中速接続
        }
        
        return {
            base: base,
            calculated: multiplier,
            pyodideInit: multiplier * 1.2, // Pyodide初期化は特に重い
            gameLoad: multiplier * 1.0,
            audioInit: multiplier * 0.8, // オーディオ初期化は軽い
            canvasSetup: multiplier * 0.6, // Canvas設定は軽い
            networkRequest: multiplier * 1.1 // ネットワーク要求
        };
    }
    
    /**
     * 適応的タイムアウト時間の取得
     */
    getAdaptiveTimeout(operation, baseTimeout = 30000) {
        const multiplier = this.timeoutMultipliers[operation] || this.timeoutMultipliers.calculated;
        const adaptiveTimeout = Math.round(baseTimeout * multiplier);
        
        // 最小・最大制限
        const minTimeout = 5000;   // 5秒
        const maxTimeout = 120000; // 2分
        
        const finalTimeout = Math.max(minTimeout, Math.min(maxTimeout, adaptiveTimeout));
        
        console.log(`[Adaptive Timeout] ${operation}: ${baseTimeout}ms → ${finalTimeout}ms (multiplier: ${multiplier.toFixed(2)})`);
        
        return finalTimeout;
    }
    
    /**
     * 段階的タイムアウト（リトライ機能付き）
     */
    async waitWithProgressiveTimeout(operation, checkFunction, maxAttempts = 3) {
        let attempt = 1;
        let currentTimeout = this.getAdaptiveTimeout(operation, 15000); // 初回は短めに
        
        while (attempt <= maxAttempts) {
            try {
                console.log(`[Adaptive Timeout] ${operation} attempt ${attempt}/${maxAttempts}, timeout: ${currentTimeout}ms`);
                
                const result = await Promise.race([
                    checkFunction(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), currentTimeout)
                    )
                ]);
                
                console.log(`[Adaptive Timeout] ${operation} succeeded on attempt ${attempt}`);
                return result;
                
            } catch (error) {
                console.warn(`[Adaptive Timeout] ${operation} failed on attempt ${attempt}:`, error.message);
                
                if (attempt === maxAttempts) {
                    throw new Error(`${operation} failed after ${maxAttempts} attempts. Last error: ${error.message}`);
                }
                
                // 次の試行で時間を延長
                currentTimeout = Math.min(currentTimeout * 1.5, 120000);
                attempt++;
                
                // 少し待機してからリトライ
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    /**
     * ブラウザ固有の最適化設定
     */
    getBrowserSpecificOptimizations() {
        const optimizations = {
            webWorkerPoolSize: 2,
            enableServiceWorker: true,
            useRequestIdleCallback: true,
            priorityHints: true
        };
        
        if (this.browserInfo.isWebKit) {
            // WebKit固有の最適化
            optimizations.webWorkerPoolSize = 1; // WebKitはWeb Workerが不安定
            optimizations.useRequestIdleCallback = false; // 対応が不完全
            optimizations.priorityHints = false; // 未対応
        } else if (this.browserInfo.isFirefox) {
            // Firefox固有の最適化
            optimizations.webWorkerPoolSize = 2;
            optimizations.useRequestIdleCallback = true;
            optimizations.priorityHints = false; // 部分対応
        } else if (this.browserInfo.isChrome) {
            // Chrome固有の最適化
            optimizations.webWorkerPoolSize = Math.min(4, this.browserInfo.hardwareConcurrency);
            optimizations.useRequestIdleCallback = true;
            optimizations.priorityHints = true;
        }
        
        if (this.browserInfo.isMobile) {
            // モバイル向け最適化
            optimizations.webWorkerPoolSize = Math.min(2, optimizations.webWorkerPoolSize);
            optimizations.useRequestIdleCallback = false; // バッテリー節約
        }
        
        return optimizations;
    }
    
    /**
     * パフォーマンス監視とレポート
     */
    createPerformanceReport() {
        return {
            browserInfo: this.browserInfo,
            performanceProfile: this.performanceProfile,
            timeoutMultipliers: this.timeoutMultipliers,
            optimizations: this.getBrowserSpecificOptimizations(),
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * 推奨事項の生成
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.browserInfo.isWebKit) {
            recommendations.push({
                type: 'webkit',
                message: 'WebKit環境では初期化時間が長くなる可能性があります',
                action: 'タイムアウト時間を1.5倍に延長し、Web Workerの使用を制限'
            });
        }
        
        if (this.browserInfo.isMobile) {
            recommendations.push({
                type: 'mobile',
                message: 'モバイル環境ではリソースが限られます',
                action: 'バッテリー節約のため一部機能を無効化'
            });
        }
        
        if (this.browserInfo.hardwareConcurrency < 4) {
            recommendations.push({
                type: 'hardware',
                message: 'CPU性能が限られています',
                action: '並列処理を制限し、順次処理を優先'
            });
        }
        
        if (this.performanceProfile.computeScore < 1000) {
            recommendations.push({
                type: 'performance',
                message: 'デバイスの計算性能が低いです',
                action: '重い処理を分割し、レスポンシブな体験を提供'
            });
        }
        
        return recommendations;
    }
}

// グローバルに公開
window.BrowserAdaptiveTimeoutManager = BrowserAdaptiveTimeoutManager;

// 自動初期化
if (typeof window !== 'undefined') {
    window.browserAdaptiveTimeout = new BrowserAdaptiveTimeoutManager();
    console.log('[Adaptive Timeout] Browser adaptive timeout system initialized');
}