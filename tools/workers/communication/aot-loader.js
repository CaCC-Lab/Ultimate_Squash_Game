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
        this.bundleLoaded = false;
        this.bundleContent = null;
        
        // モジュール名マッピング（期待されるAOTモジュール名 → 実際のバンドルモジュール名）
        this.moduleMapping = {
            'game_engine': 'model.pygame_game_state',
            'physics': 'model.pygame_game_state',
            'ai_enhancer': 'model.pygame_game_state',
            'collision': 'model.pygame_game_state',
            'strategy': 'model.pygame_game_state',
            'prediction': 'model.pygame_game_state',
            'metrics': 'profiler.memory_profiler',
            'performance': 'profiler.memory_profiler',
            'web_game_view': 'view.optimized_web_game_view_enhanced',
            'controller': 'controller.web_game_controller'
        };
        
        // パフォーマンス統計
        this.stats = {
            modulesLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0,
            averageLoadTime: 0
        };
        
        console.log('🔧 AOTLoaderManager初期化完了（バンドルベース）');
    }
    
    /**
     * AOTローダーの初期化
     */
    async initialize() {
        if (this.initialized) {
            console.log('⚠️ AOTLoaderManager already initialized');
            return;
        }
        
        console.log('📦 AOTバンドルファイル読み込み中...');
        
        try {
            // バンドルファイルの読み込み
            await this.loadBundleFile();
            
            // 利用可能なモジュールを検証
            await this.validateAvailableModules();
            
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
     * バンドルファイルの読み込み
     */
    async loadBundleFile() {
        try {
            // AOTバンドルファイルの読み込み
            const bundlePath = '/dist/bundled_game_aot.py';
            const response = await fetch(bundlePath);
            
            if (!response.ok) {
                throw new Error(`バンドル読み込み失敗: ${response.status}`);
            }
            
            this.bundleContent = await response.text();
            this.bundleLoaded = true;
            
            console.log(`📊 AOTバンドルファイル読み込み完了: ${this.bundleContent.length}文字`);
            
        } catch (error) {
            console.warn('⚠️ AOTバンドル読み込み失敗:', error);
            this.bundleLoaded = false;
            throw error;
        }
    }
    
    /**
     * 利用可能なモジュールの検証
     */
    async validateAvailableModules() {
        if (!this.bundleLoaded || !this.bundleContent) {
            throw new Error('バンドルファイルが読み込まれていません');
        }
        
        const availableModules = [];
        
        // バンドル内のモジュール名を検索
        for (const [mappedName, actualName] of Object.entries(this.moduleMapping)) {
            // モジュール名がバンドル内に存在するかチェック
            if (this.bundleContent.includes(`# === ${actualName} モジュール`)) {
                availableModules.push(mappedName);
            }
        }
        
        console.log(`📋 利用可能なモジュール: ${availableModules.join(', ')}`);
        return availableModules;
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
            'game_engine',    // pygame_game_state に対応
            'physics',        // pygame_game_state に対応
            'ai_enhancer',    // pygame_game_state に対応
            'web_game_view',  // view.optimized_web_game_view_enhanced に対応
            'metrics'         // profiler.memory_profiler に対応
        ];
        
        console.log('🚀 重要モジュールの事前ロード中...');
        
        const loadPromises = essentialModules
            .filter(module => this.moduleMapping[module])
            .map(module => this.loadModule(module));
        
        const results = await Promise.allSettled(loadPromises);
        
        const loaded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📈 事前ロード完了: ${loaded}成功, ${failed}失敗`);
    }
    
    /**
     * モジュールの読み込み
     * @param {string} moduleName モジュール名
     * @returns {Promise<Object>} モジュールデータオブジェクト
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
            
            // キャッシュに保存（両方の名前で保存）
            this.moduleCache.set(moduleName, moduleData);
            if (this.moduleMapping[moduleName]) {
                this.moduleCache.set(this.moduleMapping[moduleName], moduleData);
            }
            
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
     * 実際のモジュール読み込み処理（バンドルベース）
     * @param {string} moduleName モジュール名
     * @returns {Promise<ArrayBuffer>} モジュールデータ
     */
    async performModuleLoad(moduleName) {
        if (!this.bundleLoaded || !this.bundleContent) {
            throw new Error('バンドルファイルが読み込まれていません');
        }
        
        // モジュール名マッピングを使用して実際のモジュール名を取得
        const actualModuleName = this.moduleMapping[moduleName] || moduleName;
        
        try {
            // バンドル内でモジュールセクションを検索（複数パターンを試行）
            let moduleMarker;
            let startIndex = -1;
            
            // パターン1: 完全なモジュール名（model.pygame_game_state等）
            moduleMarker = `# === ${actualModuleName} モジュール`;
            startIndex = this.bundleContent.indexOf(moduleMarker);
            
            // パターン2: AOTバイトコード最適化済みマーカー
            if (startIndex === -1) {
                moduleMarker = `# === ${actualModuleName} モジュール（AOTバイトコード最適化済み） ===`;
                startIndex = this.bundleContent.indexOf(moduleMarker);
            }
            
            // パターン3: より寛容な検索（部分一致）
            if (startIndex === -1) {
                const searchPattern = actualModuleName.split('.').pop(); // 最後の部分のみ
                moduleMarker = `# === ${searchPattern} モジュール`;
                startIndex = this.bundleContent.indexOf(moduleMarker);
            }
            
            if (startIndex === -1) {
                throw new Error(`モジュール '${actualModuleName}' がバンドル内に見つかりません（検索パターン: ${moduleMarker}）`);
            }
            
            // 次のモジュールまたはファイル終端を検索
            const nextModuleIndex = this.bundleContent.indexOf('# === ', startIndex + moduleMarker.length);
            const endIndex = nextModuleIndex !== -1 ? nextModuleIndex : this.bundleContent.length;
            
            // モジュールセクションを抽出
            const moduleSection = this.bundleContent.substring(startIndex, endIndex);
            
            // Base64エンコードされたバイトコードデータを検索
            const bytecodeMatch = moduleSection.match(/_bytecode_data = """([^"]+)"""/s);
            
            if (bytecodeMatch) {
                // Base64バイトコードが見つかった場合
                const base64Data = bytecodeMatch[1];
                const moduleContent = this.createBytecodeModule(moduleName, actualModuleName, base64Data);
                return new TextEncoder().encode(moduleContent);
            } else {
                // 通常のPythonコードの場合、モジュールセクション全体を返す
                console.log(`📦 通常モジュールとして読み込み: ${moduleName} -> ${actualModuleName}`);
                return new TextEncoder().encode(moduleSection);
            }
            
        } catch (error) {
            console.error(`❌ バンドルからのモジュール読み込みエラー (${moduleName}):`, error);
            
            // フォールバック: 基本的なJavaScriptファイルとして読み込み
            return await this.loadFallbackModule(moduleName);
        }
    }
    
    /**
     * バイトコードモジュールの作成
     * @param {string} mappedName マッピングされたモジュール名
     * @param {string} actualName 実際のモジュール名
     * @param {string} base64Data Base64エンコードされたバイトコードデータ
     * @returns {string} 実行可能なモジュールコンテンツ
     */
    createBytecodeModule(mappedName, actualName, base64Data) {
        return `
// AOTバイトコード最適化モジュール: ${mappedName} -> ${actualName}
// WebWorker並列処理フェーズ4 バンドル統合済み

// Base64エンコードされたバイトコードデータ
const _bytecode_data = "${base64Data}";

// モジュール情報
const moduleInfo = {
    name: "${mappedName}",
    actualName: "${actualName}", 
    type: "aot_bytecode",
    loaded: false,
    exports: {}
};

// バイトコードからモジュールを初期化
function initializeModule() {
    try {
        // Base64デコード
        const binaryString = atob(_bytecode_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // モジュールデータとして保存
        moduleInfo.bytecode = bytes;
        moduleInfo.loaded = true;
        
        console.log(\`🚀 AOTバイトコードモジュール初期化完了: \${moduleInfo.name}\`);
        
        // WebWorker環境でのPyodide統合ポイント
        if (typeof self !== 'undefined' && self.pyodide) {
            // Pyodide環境でバイトコードを実行
            return self.pyodide.runPython(\`
# AOTバイトコードモジュール: \${actualName}
import base64
import marshal
import types
import sys

# バイトコード実行の準備
bytecode_data = base64.b64decode('\${base64Data}')

try:
    # .pycファイルのヘッダーをスキップしてマーシャルデータを取得
    code_obj = marshal.loads(bytecode_data[16:])  # Python 3.7+ format
    
    # モジュールオブジェクトを作成
    module = types.ModuleType('\${actualName}')
    module.__file__ = '<aot_bytecode>'
    
    # バイトコードを実行
    exec(code_obj, module.__dict__)
    
    # モジュールをsys.modulesに登録
    sys.modules['\${actualName}'] = module
    
    # マップされた名前でも登録
    if '\${mappedName}' != '\${actualName}':
        sys.modules['\${mappedName}'] = module
    
    print(f"✅ AOTバイトコード実行成功: \${actualName}")
    
except Exception as e:
    print(f"❌ AOTバイトコード実行エラー: {e}")
    import traceback
    traceback.print_exc()
\`);
        } else {
            console.warn('⚠️ Pyodide環境が利用できません。バイトコードはロードのみ実行');
        }
        
        return moduleInfo;
        
    } catch (error) {
        console.error(\`❌ バイトコードモジュール初期化エラー (\${mappedName}): \`, error);
        moduleInfo.error = error.message;
        return moduleInfo;
    }
}

// モジュール初期化を実行
const initializedModule = initializeModule();

// WorkerAOTLoader用のエクスポート
export default {
    moduleInfo: initializedModule,
    name: "${mappedName}",
    actualName: "${actualName}",
    type: "aot_bytecode",
    
    // 互換性のための基本的なメソッド
    initialize() {
        return Promise.resolve(initializedModule);
    },
    
    getBytecode() {
        return initializedModule.bytecode;
    },
    
    isLoaded() {
        return initializedModule.loaded;
    }
};
`;
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
     * 依存関係の解決（バンドルベース）
     * @param {Array<string>} modules モジュール一覧
     * @returns {Promise<Array<string>>} 依存関係を含むモジュール一覧
     */
    async resolveDependencies(modules) {
        const resolved = new Set(modules);
        
        // バンドルベースではモジュール内の依存関係は既に解決済み
        // 基本的な依存関係のみ追加
        for (const module of modules) {
            resolved.add(module);
            
            // 基本的な依存関係マッピング
            if (module.includes('game_engine') || module.includes('physics') || module.includes('ai_enhancer')) {
                resolved.add('web_game_view');
                resolved.add('metrics');
            }
            if (module.includes('controller')) {
                resolved.add('game_engine');
                resolved.add('web_game_view');
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
        console.log('バンドル読み込み状態:', this.bundleLoaded);
        console.log('キャッシュサイズ:', this.moduleCache.size);
        console.log('統計情報:', this.getStats());
        console.log('モジュールマッピング:', this.moduleMapping);
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