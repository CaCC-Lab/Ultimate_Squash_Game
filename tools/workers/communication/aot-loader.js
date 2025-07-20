/**
 * WebWorker並列処理フェーズ4 - AOTローダーマネージャー
 * Ultimate Squash Game専用AOTバイトコード管理システム
 * 
 * 機能:
 * - AOTバイトコードの効率的な読み込み
 * - Worker間でのモジュール共有
 * - キャッシング機構
 * - パフォーマンス最適化
 */

/**
 * AOTローダーマネージャー
 * 改善されたAOTバイトコード基盤を活用してWorker並列処理を最適化
 */
export class AOTLoaderManager {
    constructor() {
        this.moduleCache = new Map();
        this.moduleIndex = null;
        this.loadingPromises = new Map();
        this.initialized = false;
        
        // パフォーマンス統計
        this.stats = {
            modulesLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0,
            averageLoadTime: 0
        };
        
        console.log('🔧 AOTLoaderManager初期化完了');
    }
    
    /**
     * AOTローダーの初期化
     */
    async initialize() {
        if (this.initialized) {
            console.log('⚠️ AOTLoaderManager already initialized');
            return;
        }
        
        console.log('📦 AOTバイトコードインデックス読み込み中...');
        
        try {
            // バイトコードインデックスの読み込み
            await this.loadModuleIndex();
            
            // 重要モジュールの事前ロード
            await this.preloadEssentialModules();
            
            this.initialized = true;
            console.log('✅ AOTLoaderManager初期化完了');
            
        } catch (error) {
            console.error('❌ AOTローダー初期化失敗:', error);
            throw error;
        }
    }
    
    /**
     * モジュールインデックスの読み込み
     */
    async loadModuleIndex() {
        try {
            // AOTバイトコードインデックスファイルの読み込み
            const indexPath = '/dist/aot-cache/module-index.json';
            const response = await fetch(indexPath);
            
            if (!response.ok) {
                throw new Error(`インデックス読み込み失敗: ${response.status}`);
            }
            
            this.moduleIndex = await response.json();
            
            console.log(`📊 AOTモジュールインデックス読み込み完了: ${Object.keys(this.moduleIndex.modules).length}モジュール`);
            
        } catch (error) {
            console.warn('⚠️ AOTインデックス読み込み失敗、フォールバック生成:', error);
            
            // フォールバックインデックスの生成
            this.moduleIndex = this.generateFallbackIndex();
        }
    }
    
    /**
     * フォールバックインデックスの生成
     * AOTファイルが見つからない場合の対応
     */
    generateFallbackIndex() {
        return {
            version: '1.0.0',
            generated: new Date().toISOString(),
            compression: 'none',
            modules: {
                'game_engine': {
                    file: 'game_engine.bundle.js',
                    size: 0,
                    compressed: false,
                    dependencies: []
                },
                'ai_enhancer': {
                    file: 'ai_enhancer.bundle.js',
                    size: 0,
                    compressed: false,
                    dependencies: []
                },
                'physics': {
                    file: 'physics.bundle.js',
                    size: 0,
                    compressed: false,
                    dependencies: []
                }
            }
        };
    }
    
    /**
     * 重要モジュールの事前ロード
     */
    async preloadEssentialModules() {
        const essentialModules = [
            'game_engine',
            'physics',
            'collision'
        ];
        
        console.log('🚀 重要モジュールの事前ロード中...');
        
        const loadPromises = essentialModules
            .filter(module => this.moduleIndex.modules[module])
            .map(module => this.loadModule(module));
        
        const results = await Promise.allSettled(loadPromises);
        
        const loaded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📈 事前ロード完了: ${loaded}成功, ${failed}失敗`);
    }
    
    /**
     * モジュールの読み込み
     * @param {string} moduleName モジュール名
     * @returns {Promise<ArrayBuffer>} モジュールデータ
     */
    async loadModule(moduleName) {
        const startTime = performance.now();
        
        // キャッシュチェック
        if (this.moduleCache.has(moduleName)) {
            this.stats.cacheHits++;
            console.log(`⚡ キャッシュヒット: ${moduleName}`);
            return this.moduleCache.get(moduleName);
        }
        
        this.stats.cacheMisses++;
        
        // 既存の読み込み処理があれば待機
        if (this.loadingPromises.has(moduleName)) {
            return await this.loadingPromises.get(moduleName);
        }
        
        // 新規読み込み処理
        const loadPromise = this.performModuleLoad(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);
        
        try {
            const moduleData = await loadPromise;
            
            // キャッシュに保存
            this.moduleCache.set(moduleName, moduleData);
            
            // 統計更新
            const loadTime = performance.now() - startTime;
            this.updateLoadStats(loadTime);
            
            console.log(`✅ モジュール読み込み完了: ${moduleName} (${loadTime.toFixed(1)}ms)`);
            
            return moduleData;
            
        } finally {
            this.loadingPromises.delete(moduleName);
        }
    }
    
    /**
     * 実際のモジュール読み込み処理
     * @param {string} moduleName モジュール名
     * @returns {Promise<ArrayBuffer>} モジュールデータ
     */
    async performModuleLoad(moduleName) {
        const moduleInfo = this.moduleIndex.modules[moduleName];
        
        if (!moduleInfo) {
            throw new Error(`モジュール '${moduleName}' がインデックスに見つかりません`);
        }
        
        try {
            // AOTバイトコードファイルの読み込み
            const modulePath = `/dist/aot-cache/${moduleInfo.file}`;
            const response = await fetch(modulePath);
            
            if (!response.ok) {
                throw new Error(`モジュール読み込み失敗: ${response.status}`);
            }
            
            let moduleData;
            
            if (moduleInfo.compressed) {
                // 圧縮されている場合は解凍
                moduleData = await this.decompressModule(await response.arrayBuffer());
            } else {
                // 非圧縮の場合はそのまま取得
                if (moduleInfo.file.endsWith('.js')) {
                    // JavaScriptファイルの場合はテキストとして読み込み
                    const text = await response.text();
                    moduleData = new TextEncoder().encode(text);
                } else {
                    // バイナリファイルの場合
                    moduleData = await response.arrayBuffer();
                }
            }
            
            return moduleData;
            
        } catch (error) {
            console.error(`❌ モジュール読み込みエラー (${moduleName}):`, error);
            
            // フォールバック: 基本的なJavaScriptファイルとして読み込み
            return await this.loadFallbackModule(moduleName);
        }
    }
    
    /**
     * フォールバックモジュール読み込み
     * AOTバイトコードが利用できない場合の対応
     * @param {string} moduleName モジュール名
     * @returns {Promise<ArrayBuffer>} フォールバックモジュールデータ
     */
    async loadFallbackModule(moduleName) {
        console.warn(`⚠️ フォールバックモジュール読み込み: ${moduleName}`);
        
        // 基本的なJavaScriptモジュールテンプレート
        const fallbackCode = `
// フォールバックモジュール: ${moduleName}
// AOTバイトコードが利用できない場合のプレースホルダー

console.warn('フォールバックモジュール読み込み: ${moduleName}');

// 基本的なモジュール構造
export default {
    name: '${moduleName}',
    version: '1.0.0',
    fallback: true,
    
    initialize() {
        console.log('${moduleName} フォールバック初期化');
        return Promise.resolve();
    },
    
    execute(data) {
        console.warn('${moduleName} フォールバック実行');
        return data;
    }
};
`;
        
        return new TextEncoder().encode(fallbackCode);
    }
    
    /**
     * モジュール解凍
     * @param {ArrayBuffer} compressedData 圧縮データ
     * @returns {Promise<ArrayBuffer>} 解凍データ
     */
    async decompressModule(compressedData) {
        // 将来的にはgzip等の解凍を実装
        // 現在はプレースホルダー
        console.log('🔄 モジュール解凍処理（未実装）');
        return compressedData;
    }
    
    /**
     * Worker用モジュールセットの取得
     * @param {string} workerId Worker識別子
     * @param {Array<string>} requestedModules 要求されたモジュール一覧
     * @returns {Promise<Map<string, ArrayBuffer>>} モジュールデータマップ
     */
    async getModulesForWorker(workerId, requestedModules = []) {
        console.log(`📦 Worker '${workerId}' 用モジュール準備中: ${requestedModules.length}モジュール`);
        
        const moduleMap = new Map();
        
        // 必須依存関係の解決
        const allModules = await this.resolveDependencies(requestedModules);
        
        // 並列でモジュールを読み込み
        const loadPromises = allModules.map(async (moduleName) => {
            try {
                const moduleData = await this.loadModule(moduleName);
                moduleMap.set(moduleName, moduleData);
            } catch (error) {
                console.error(`Worker '${workerId}' モジュール読み込み失敗 (${moduleName}):`, error);
            }
        });
        
        await Promise.allSettled(loadPromises);
        
        console.log(`✅ Worker '${workerId}' モジュール準備完了: ${moduleMap.size}/${allModules.length}モジュール`);
        
        return moduleMap;
    }
    
    /**
     * 依存関係の解決
     * @param {Array<string>} modules モジュール一覧
     * @returns {Promise<Array<string>>} 依存関係を含むモジュール一覧
     */
    async resolveDependencies(modules) {
        const resolved = new Set(modules);
        const toProcess = [...modules];
        
        while (toProcess.length > 0) {
            const currentModule = toProcess.pop();
            const moduleInfo = this.moduleIndex.modules[currentModule];
            
            if (moduleInfo && moduleInfo.dependencies) {
                for (const dependency of moduleInfo.dependencies) {
                    if (!resolved.has(dependency)) {
                        resolved.add(dependency);
                        toProcess.push(dependency);
                    }
                }
            }
        }
        
        return Array.from(resolved);
    }
    
    /**
     * 読み込み統計の更新
     * @param {number} loadTime 読み込み時間
     */
    updateLoadStats(loadTime) {
        this.stats.modulesLoaded++;
        this.stats.totalLoadTime += loadTime;
        this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.modulesLoaded;
    }
    
    /**
     * キャッシュクリア
     * @param {string} [moduleName] 特定のモジュール名（省略時は全削除）
     */
    clearCache(moduleName = null) {
        if (moduleName) {
            this.moduleCache.delete(moduleName);
            console.log(`🗑️ キャッシュクリア: ${moduleName}`);
        } else {
            this.moduleCache.clear();
            console.log('🗑️ 全キャッシュクリア');
        }
    }
    
    /**
     * メモリ使用量の取得
     * @returns {number} 推定メモリ使用量（MB）
     */
    getMemoryUsage() {
        let totalSize = 0;
        
        for (const [moduleName, moduleData] of this.moduleCache) {
            if (moduleData instanceof ArrayBuffer) {
                totalSize += moduleData.byteLength;
            } else if (typeof moduleData === 'string') {
                totalSize += moduleData.length * 2; // UTF-16概算
            }
        }
        
        return totalSize / (1024 * 1024); // MB変換
    }
    
    /**
     * 統計情報の取得
     * @returns {Object} 統計情報
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.moduleCache.size,
            memoryUsage: this.getMemoryUsage(),
            hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100
        };
    }
    
    /**
     * デバッグ情報の出力
     */
    debugInfo() {
        console.group('🔍 AOTLoaderManager デバッグ情報');
        console.log('初期化状態:', this.initialized);
        console.log('キャッシュサイズ:', this.moduleCache.size);
        console.log('統計情報:', this.getStats());
        console.log('モジュールインデックス:', this.moduleIndex);
        console.log('キャッシュ済みモジュール:', Array.from(this.moduleCache.keys()));
        console.groupEnd();
    }
}

/**
 * WebWorker内AOTローダー
 * Worker内で使用する軽量版AOTローダー
 */
export class WorkerAOTLoader {
    constructor(workerId) {
        this.workerId = workerId;
        this.modules = new Map();
        this.initialized = false;
    }
    
    /**
     * Worker内初期化
     * @param {Map<string, ArrayBuffer>} moduleMap モジュールデータマップ
     */
    async initialize(moduleMap) {
        console.log(`🔧 WorkerAOTLoader初期化中 (${this.workerId}): ${moduleMap.size}モジュール`);
        
        for (const [moduleName, moduleData] of moduleMap) {
            await this.loadModuleInWorker(moduleName, moduleData);
        }
        
        this.initialized = true;
        console.log(`✅ WorkerAOTLoader初期化完了 (${this.workerId})`);
    }
    
    /**
     * Worker内でのモジュール読み込み
     * @param {string} moduleName モジュール名
     * @param {ArrayBuffer} moduleData モジュールデータ
     */
    async loadModuleInWorker(moduleName, moduleData) {
        try {
            let moduleContent;
            
            if (moduleData instanceof ArrayBuffer) {
                // ArrayBufferをテキストに変換
                moduleContent = new TextDecoder().decode(moduleData);
            } else {
                moduleContent = moduleData;
            }
            
            // AOTバイトコードとして実行
            if (moduleContent.includes('_bytecode_data')) {
                // バイトコードモジュールの場合
                await this.executeAOTBytecode(moduleName, moduleContent);
            } else {
                // 通常のJavaScriptモジュールの場合
                await this.executeJavaScriptModule(moduleName, moduleContent);
            }
            
            this.modules.set(moduleName, {
                name: moduleName,
                loaded: true,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ Worker内モジュール読み込み失敗 (${moduleName}):`, error);
        }
    }
    
    /**
     * AOTバイトコードの実行
     * @param {string} moduleName モジュール名
     * @param {string} moduleContent モジュール内容
     */
    async executeAOTBytecode(moduleName, moduleContent) {
        // 改善されたAOTバイトコード実行
        // Base64エンコードされたバイトコードの直接実行を含む
        try {
            // globalThisにモジュール実行関数を定義
            const executeFunction = new Function('moduleName', moduleContent);
            await executeFunction(moduleName);
            
            console.log(`🚀 AOTバイトコード実行完了: ${moduleName}`);
            
        } catch (error) {
            console.error(`❌ AOTバイトコード実行エラー (${moduleName}):`, error);
            throw error;
        }
    }
    
    /**
     * JavaScriptモジュールの実行
     * @param {string} moduleName モジュール名
     * @param {string} moduleContent モジュール内容
     */
    async executeJavaScriptModule(moduleName, moduleContent) {
        try {
            // JavaScriptモジュールとして実行
            const moduleFunction = new Function('exports', 'module', 'require', moduleContent);
            const moduleExports = {};
            const module = { exports: moduleExports };
            
            moduleFunction(moduleExports, module, (name) => {
                // 簡易require実装
                console.warn(`require('${name}') called in ${moduleName}`);
                return {};
            });
            
            console.log(`📦 JavaScriptモジュール実行完了: ${moduleName}`);
            
        } catch (error) {
            console.error(`❌ JavaScriptモジュール実行エラー (${moduleName}):`, error);
            throw error;
        }
    }
    
    /**
     * モジュール一覧の取得
     * @returns {Array<string>} 読み込み済みモジュール名一覧
     */
    getLoadedModules() {
        return Array.from(this.modules.keys());
    }
}

// デフォルトエクスポート
export default AOTLoaderManager;