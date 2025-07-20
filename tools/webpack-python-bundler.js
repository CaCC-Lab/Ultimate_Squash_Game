/**
 * Webpack + Python統合バンドラー
 * Pyodide最適化に特化したJavaScript + Pythonコードバンドリング
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class PyodideOptimizedBundler {
    constructor(config) {
        this.config = {
            pythonSourceDir: 'pygame_version/src',
            jsSourceDir: 'docs/js',
            outputDir: 'dist/optimized',
            bundleName: 'ultimate-squash-optimized',
            ...config
        };
        
        this.metrics = {
            originalSize: 0,
            bundledSize: 0,
            compressionRatio: 0,
            moduleCount: 0,
            estimatedSpeedUp: 0
        };
    }
    
    async analyzePythonModules() {
        console.log('🔍 Python モジュール分析中...');
        
        // Python バンドラーを実行
        const pythonBundlerPath = path.join(__dirname, 'python_bundler.py');
        const bundleOutput = `${this.config.outputDir}/${this.config.bundleName}.py`;
        
        try {
            execSync(`python "${pythonBundlerPath}" "${this.config.pythonSourceDir}" "${bundleOutput}"`);
            
            // バンドルサイズ測定
            const bundleStats = fs.statSync(bundleOutput);
            this.metrics.bundledSize = bundleStats.size;
            
            console.log(`✅ Python バンドル完成: ${bundleOutput} (${this.metrics.bundledSize} bytes)`);
            
        } catch (error) {
            console.error('❌ Python バンドリング失敗:', error.message);
            throw error;
        }
    }
    
    generatePyodideLoader() {
        console.log('⚡ Pyodide専用ローダー生成中...');
        
        const loaderTemplate = `
/**
 * Pyodide最適化ローダー - 自動生成
 * バンドル最適化: JavaScript + Python統合
 */

class PyodideOptimizedLoader {
    constructor() {
        this.pyodide = null;
        this.gameModule = null;
        this.initStartTime = null;
        this.metrics = {
            loadTime: 0,
            parseTime: 0,
            initTime: 0,
            totalTime: 0
        };
    }
    
    async initialize() {
        this.initStartTime = performance.now();
        console.log('🚀 Pyodide最適化ローダー開始');
        
        try {
            // Stage 1: Pyodide基盤初期化
            await this.initializePyodide();
            
            // Stage 2: 最適化Pythonバンドル読み込み
            await this.loadOptimizedBundle();
            
            // Stage 3: ゲーム初期化
            await this.initializeGame();
            
            this.metrics.totalTime = performance.now() - this.initStartTime;
            console.log(\`✅ 初期化完了: \${this.metrics.totalTime.toFixed(1)}ms\`);
            
            return this.gameModule;
            
        } catch (error) {
            console.error('❌ 初期化失敗:', error);
            throw error;
        }
    }
    
    async initializePyodide() {
        const startTime = performance.now();
        
        // Service Worker キャッシュ活用
        this.pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
            packages: []  // 最小構成
        });
        
        this.metrics.loadTime = performance.now() - startTime;
        console.log(\`📦 Pyodide読み込み: \${this.metrics.loadTime.toFixed(1)}ms\`);
    }
    
    async loadOptimizedBundle() {
        const startTime = performance.now();
        
        // 最適化Pythonバンドルの読み込み
        const response = await fetch('${this.config.bundleName}.py');
        const pythonCode = await response.text();
        
        // Pyodideで実行
        this.pyodide.runPython(pythonCode);
        
        this.metrics.parseTime = performance.now() - startTime;
        console.log(\`🐍 Pythonバンドル読み込み: \${this.metrics.parseTime.toFixed(1)}ms\`);
    }
    
    async initializeGame() {
        const startTime = performance.now();
        
        // ゲームインスタンス作成
        this.gameModule = this.pyodide.runPython(\`
            # 最適化ゲーム初期化
            init_game()
        \`);
        
        this.metrics.initTime = performance.now() - startTime;
        console.log(\`🎮 ゲーム初期化: \${this.metrics.initTime.toFixed(1)}ms\`);
    }
    
    // パフォーマンスメトリクス取得
    getPerformanceMetrics() {
        return {
            ...this.metrics,
            compressionRatio: ${this.metrics.compressionRatio},
            estimatedSpeedUp: ${this.metrics.estimatedSpeedUp}
        };
    }
    
    // JavaScript-Python Bridge最適化
    optimizedBridge() {
        return {
            // 高頻度呼び出し用の最適化されたメソッド
            updateRacket: (x) => {
                return this.pyodide.runPython(\`game_instance.handle_mouse_motion(\${x})\`);
            },
            
            updateFrame: () => {
                return this.pyodide.runPython(\`game_instance.update_game_frame()\`);
            },
            
            getGameState: () => {
                return this.pyodide.runPython(\`game_instance.get_game_state_json()\`);
            }
        };
    }
}

// グローバル公開
window.PyodideOptimizedLoader = PyodideOptimizedLoader;

// 自動初期化オプション
if (window.AUTO_INIT_PYODIDE) {
    document.addEventListener('DOMContentLoaded', async () => {
        const loader = new PyodideOptimizedLoader();
        window.gameLoader = loader;
        await loader.initialize();
    });
}
        `;
        
        const loaderPath = `${this.config.outputDir}/${this.config.bundleName}-loader.js`;
        fs.writeFileSync(loaderPath, loaderTemplate);
        
        console.log(`✅ Pyodideローダー生成: ${loaderPath}`);
    }
    
    generateWebpackConfig() {
        const webpackConfig = {
            entry: `./docs/js/optimization/pyodide-performance-tracker.js`,
            output: {
                path: path.resolve(this.config.outputDir),
                filename: `${this.config.bundleName}-webpack.js`,
                library: 'UltimateSquashOptimized',
                libraryTarget: 'umd'
            },
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-env']
                            }
                        }
                    }
                ]
            },
            optimization: {
                minimize: true,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all',
                        },
                        pyodide: {
                            test: /pyodide/i,
                            name: 'pyodide',
                            chunks: 'all',
                        }
                    }
                }
            },
            resolve: {
                extensions: ['.js', '.json']
            }
        };
        
        const configPath = `${this.config.outputDir}/webpack.config.js`;
        fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(webpackConfig, null, 2)};`);
        
        console.log(`📦 Webpack設定生成: ${configPath}`);
        return webpackConfig;
    }
    
    async calculateOptimizationMetrics() {
        console.log('📊 最適化メトリクス計算中...');
        
        // 元ファイルサイズの計算
        const sourceFiles = this.getSourceFiles();
        this.metrics.originalSize = sourceFiles.reduce((total, file) => {
            return total + fs.statSync(file).size;
        }, 0);
        
        // 圧縮率計算
        this.metrics.compressionRatio = (
            (this.metrics.originalSize - this.metrics.bundledSize) / 
            this.metrics.originalSize * 100
        ).toFixed(1);
        
        // 推定速度向上（ヒューリスティック）
        const networkRequestReduction = this.metrics.moduleCount * 50; // 50ms/request
        const parseTimeReduction = this.metrics.originalSize * 0.001;  // 1ms/KB
        
        this.metrics.estimatedSpeedUp = networkRequestReduction + parseTimeReduction;
        
        console.log('📈 最適化メトリクス:');
        console.log(`  - 元サイズ: ${this.metrics.originalSize} bytes`);
        console.log(`  - バンドルサイズ: ${this.metrics.bundledSize} bytes`);
        console.log(`  - 圧縮率: ${this.metrics.compressionRatio}%`);
        console.log(`  - 推定速度向上: ${this.metrics.estimatedSpeedUp.toFixed(1)}ms`);
    }
    
    getSourceFiles() {
        const files = [];
        
        // Python ファイル
        const walkDir = (dir) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (item.endsWith('.py')) {
                    files.push(fullPath);
                }
            }
        };
        
        walkDir(this.config.pythonSourceDir);
        
        // JavaScript ファイル
        const jsFiles = [
            'docs/js/optimization/pyodide-performance-tracker.js',
            'docs/js/optimization/performance-monitor.js',
            'docs/js/pyodide-preloader.js'
        ].filter(file => fs.existsSync(file));
        
        files.push(...jsFiles);
        this.metrics.moduleCount = files.length;
        
        return files;
    }
    
    async build() {
        console.log('🔨 統合ビルド開始...');
        
        // 出力ディレクトリ作成
        fs.mkdirSync(this.config.outputDir, { recursive: true });
        
        try {
            // 1. Python モジュール解析・バンドル
            await this.analyzePythonModules();
            
            // 2. Pyodide最適化ローダー生成
            this.generatePyodideLoader();
            
            // 3. Webpack設定生成
            this.generateWebpackConfig();
            
            // 4. メトリクス計算
            await this.calculateOptimizationMetrics();
            
            // 5. 最終レポート生成
            this.generateFinalReport();
            
            console.log('🎉 統合ビルド完了！');
            
        } catch (error) {
            console.error('❌ ビルド失敗:', error);
            throw error;
        }
    }
    
    generateFinalReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            config: this.config,
            files: {
                pythonBundle: `${this.config.bundleName}.py`,
                jsLoader: `${this.config.bundleName}-loader.js`,
                webpackConfig: 'webpack.config.js'
            },
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = `${this.config.outputDir}/build-report.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📋 ビルドレポート: ${reportPath}`);
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        if (this.metrics.compressionRatio < 30) {
            recommendations.push('追加の最適化が可能: 未使用コードの除去を検討');
        }
        
        if (this.metrics.estimatedSpeedUp < 500) {
            recommendations.push('並列読み込みの追加実装を検討');
        }
        
        if (this.metrics.moduleCount > 15) {
            recommendations.push('モジュール分割の再検討を推奨');
        }
        
        return recommendations;
    }
}

module.exports = PyodideOptimizedBundler;

// CLI実行
if (require.main === module) {
    const bundler = new PyodideOptimizedBundler();
    bundler.build().catch(console.error);
}