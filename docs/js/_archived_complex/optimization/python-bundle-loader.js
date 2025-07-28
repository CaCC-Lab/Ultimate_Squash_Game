/**
 * Python Bundle Loader - Gemini提案によるPythonコードバンドリング最適化
 * 
 * Pyodide初期化高速化のための統合バンドリングシステム
 * 既存のpython_bundler.pyとwebpack-python-bundler.jsと統合
 */

export class PythonBundleLoader {
    constructor() {
        this.bundleConfig = {
            bundlePath: '/bundled_game.py',
            precompiledPath: '/dist/optimized/ultimate-squash-optimized.py',
            fallbackPath: '/src/main.py',
            usePrecompiled: true,
            enableCaching: true,
            compressionEnabled: true
        };
        
        this.loadMetrics = {
            bundleSize: 0,
            compressionRatio: 0,
            loadTime: 0,
            parseTime: 0,
            cacheHit: false,
            optimizationLevel: 'none'
        };
        
        this.pyodide = null;
        this.gameInstance = null;
        this.performanceTracker = window.pyodideTracker || null;
        
        console.log('[Python Bundle Loader] Initialized with bundle config:', this.bundleConfig);
    }
    
    /**
     * Pyodideの最適化初期化（Gemini提案のバンドリング戦略）
     */
    async initializePyodideWithBundle(pyodideInstance) {
        this.pyodide = pyodideInstance;
        const startTime = performance.now();
        
        // パフォーマンストラッカーに初期化段階を記録
        if (this.performanceTracker) {
            this.performanceTracker.recordStage('python_bundle_load_start');
        }
        
        console.log('🐍 Python Bundle Loader: バンドル読み込み開始');
        
        try {
            // 1. バンドルファイルの選択と読み込み
            const bundleContent = await this.loadOptimalBundle();
            
            // 2. Pyodideでバンドル実行
            await this.executePythonBundle(bundleContent);
            
            // 3. ゲームインスタンス初期化
            await this.initializeGameInstance();
            
            // 4. メトリクス記録
            this.loadMetrics.loadTime = performance.now() - startTime;
            this.recordLoadMetrics();
            
            console.log(`✅ Python Bundle loaded successfully in ${this.loadMetrics.loadTime.toFixed(1)}ms`);
            console.log('📊 Load metrics:', this.loadMetrics);
            
            return this.gameInstance;
            
        } catch (error) {
            console.error('❌ Python Bundle loading failed:', error);
            return await this.fallbackToIndividualModules();
        }
    }
    
    /**
     * 最適なバンドルファイルの選択と読み込み
     */
    async loadOptimalBundle() {
        const loadStrategies = [
            {
                name: 'precompiled',
                path: this.bundleConfig.precompiledPath,
                enabled: this.bundleConfig.usePrecompiled
            },
            {
                name: 'bundled',
                path: this.bundleConfig.bundlePath,
                enabled: true
            },
            {
                name: 'fallback',
                path: this.bundleConfig.fallbackPath,
                enabled: true
            }
        ];
        
        for (const strategy of loadStrategies) {
            if (!strategy.enabled) continue;
            
            try {
                console.log(`🔍 Trying bundle strategy: ${strategy.name} (${strategy.path})`);
                
                const bundleContent = await this.fetchBundleContent(strategy.path);
                
                if (bundleContent) {
                    this.loadMetrics.optimizationLevel = strategy.name;
                    console.log(`✅ Successfully loaded bundle: ${strategy.name}`);
                    return bundleContent;
                }
                
            } catch (error) {
                console.warn(`⚠️ Strategy ${strategy.name} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All bundle loading strategies failed');
    }
    
    /**
     * バンドルコンテンツの取得（キャッシング対応）
     */
    async fetchBundleContent(bundlePath) {
        const cacheKey = `python-bundle-${bundlePath}`;
        
        // キャッシュ確認
        if (this.bundleConfig.enableCaching && 'caches' in window) {
            try {
                const cache = await caches.open('python-bundles');
                const cachedResponse = await cache.match(bundlePath);
                
                if (cachedResponse) {
                    this.loadMetrics.cacheHit = true;
                    console.log('💨 Cache hit for bundle:', bundlePath);
                    return await cachedResponse.text();
                }
            } catch (error) {
                console.warn('Cache access failed:', error);
            }
        }
        
        // ネットワークから取得
        const response = await fetch(bundlePath);
        
        if (!response.ok) {
            throw new Error(`Bundle fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        this.loadMetrics.bundleSize = content.length;
        
        // キャッシュに保存
        if (this.bundleConfig.enableCaching && 'caches' in window) {
            try {
                const cache = await caches.open('python-bundles');
                await cache.put(bundlePath, new Response(content));
            } catch (error) {
                console.warn('Cache storage failed:', error);
            }
        }
        
        return content;
    }
    
    /**
     * Pythonバンドルの実行
     */
    async executePythonBundle(bundleContent) {
        const parseStart = performance.now();
        
        if (this.performanceTracker) {
            this.performanceTracker.recordStage('python_bundle_parse_start');
        }
        
        console.log('🔥 Executing Python bundle...');
        
        try {
            // Pyodideでバンドルコードを実行
            this.pyodide.runPython(bundleContent);
            
            this.loadMetrics.parseTime = performance.now() - parseStart;
            
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('python_bundle_parse_complete');
            }
            
            console.log(`✅ Python bundle executed in ${this.loadMetrics.parseTime.toFixed(1)}ms`);
            
        } catch (error) {
            console.error('❌ Python bundle execution failed:', error);
            throw error;
        }
    }
    
    /**
     * ゲームインスタンスの初期化
     */
    async initializeGameInstance() {
        console.log('🎮 Initializing game instance from bundle...');
        
        try {
            // バンドルからゲームインスタンス作成
            this.gameInstance = this.pyodide.runPython(`
                # バンドルされたゲーム初期化関数を呼び出し
                if 'init_game' in globals():
                    init_game()
                elif 'create_optimized_game' in globals():
                    create_optimized_game()
                else:
                    # フォールバック: 直接ゲームエンジン作成
                    from game.engine import GameEngine
                    GameEngine()
            `);
            
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('python_game_instance_ready');
            }
            
            console.log('✅ Game instance initialized from bundle');
            
        } catch (error) {
            console.error('❌ Game instance initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * 個別モジュール読み込みへのフォールバック
     */
    async fallbackToIndividualModules() {
        console.log('🔄 Falling back to individual module loading...');
        
        if (this.performanceTracker) {
            this.performanceTracker.recordStage('python_fallback_loading');
        }
        
        try {
            // 元のpyodide-preloader.jsの方法を使用
            this.pyodide.runPython(`
                # 個別モジュール読み込み
                import sys
                sys.path.append('/src')
                
                from main import create_game_for_web
                game_instance = create_game_for_web()
            `);
            
            this.gameInstance = this.pyodide.globals.get('game_instance');
            this.loadMetrics.optimizationLevel = 'fallback';
            
            console.log('✅ Fallback loading successful');
            return this.gameInstance;
            
        } catch (error) {
            console.error('❌ Fallback loading also failed:', error);
            throw error;
        }
    }
    
    /**
     * バンドルのプリロード（Service Worker対応）
     */
    async preloadBundle() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    // Service Workerにバンドルプリロードを要求
                    registration.active?.postMessage({
                        type: 'PRELOAD_PYTHON_BUNDLE',
                        bundlePath: this.bundleConfig.bundlePath
                    });
                    
                    console.log('📡 Bundle preload requested via Service Worker');
                }
            } catch (error) {
                console.warn('Service Worker preload failed:', error);
            }
        }
        
        // 通常のプリロード
        try {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = this.bundleConfig.bundlePath;
            link.as = 'fetch';
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
            
            console.log('🔗 Bundle preload link added');
        } catch (error) {
            console.warn('Link preload failed:', error);
        }
    }
    
    /**
     * バンドル統計情報の生成
     */
    getBundleStatistics() {
        const stats = {
            loadMetrics: this.loadMetrics,
            config: this.bundleConfig,
            performance: {
                totalTime: this.loadMetrics.loadTime + this.loadMetrics.parseTime,
                efficiency: this.calculateEfficiency(),
                cacheUtilization: this.loadMetrics.cacheHit ? 'hit' : 'miss'
            },
            recommendations: this.generateOptimizationRecommendations()
        };
        
        return stats;
    }
    
    /**
     * 効率性の計算
     */
    calculateEfficiency() {
        const baseTime = 2000; // 2秒をベースライン
        const actualTime = this.loadMetrics.loadTime + this.loadMetrics.parseTime;
        
        if (actualTime === 0) return 100;
        
        const efficiency = Math.max(0, ((baseTime - actualTime) / baseTime) * 100);
        return Math.round(efficiency);
    }
    
    /**
     * 最適化推奨事項の生成
     */
    generateOptimizationRecommendations() {
        const recommendations = [];
        
        if (!this.loadMetrics.cacheHit) {
            recommendations.push('Service Worker キャッシュの活用を検討');
        }
        
        if (this.loadMetrics.optimizationLevel === 'fallback') {
            recommendations.push('バンドル生成の修正が必要');
        }
        
        if (this.loadMetrics.loadTime > 1000) {
            recommendations.push('CDN使用またはバンドルサイズ削減を検討');
        }
        
        if (this.loadMetrics.parseTime > 500) {
            recommendations.push('Python コードの最適化が必要');
        }
        
        return recommendations;
    }
    
    /**
     * メトリクス記録（パフォーマンストラッカー統合）
     */
    recordLoadMetrics() {
        if (this.performanceTracker) {
            // Python実行時間をトラッカーに記録
            this.performanceTracker.recordPythonExecution('bundle_load', this.loadMetrics.loadTime);
            this.performanceTracker.recordPythonExecution('bundle_parse', this.loadMetrics.parseTime);
            
            // カスタムメトリクス記録
            this.performanceTracker.recordCustomMetric('bundle_size', this.loadMetrics.bundleSize);
            this.performanceTracker.recordCustomMetric('bundle_optimization_level', this.loadMetrics.optimizationLevel);
            this.performanceTracker.recordCustomMetric('bundle_cache_hit', this.loadMetrics.cacheHit ? 1 : 0);
        }
        
        // パフォーマンスダッシュボードに通知
        if (window.performanceDashboard) {
            window.performanceDashboard.updateBundleMetrics(this.getBundleStatistics());
        }
    }
}

// グローバル公開
window.PythonBundleLoader = PythonBundleLoader;

console.log('📦 Python Bundle Loader module loaded');