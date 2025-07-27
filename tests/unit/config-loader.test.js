/**
 * ConfigLoader Unit Test (Jest)
 */

// JSDOM環境でのファイル読み込みのため、requireを使用
const fs = require('fs');
const path = require('path');

// ConfigLoaderクラスをテスト用に読み込み
const getConfigLoader = () => {
  const configLoaderPath = path.join(__dirname, '../../docs/js/utils/config-loader.js');
  const code = fs.readFileSync(configLoaderPath, 'utf8');
  
  // JSDOM環境用に調整
  global.window = global.window || {};
  global.document = global.document || { readyState: 'complete' };
  global.fetch = jest.fn();
  
  // module.exportsを設定
  const module = { exports: {} };
  
  // コードを実行してConfigLoaderクラスを取得
  const vm = require('vm');
  const context = vm.createContext({
    window: global.window,
    document: global.document,
    console: console,
    module: module,
    fetch: global.fetch
  });
  
  vm.runInContext(code, context);
  return context.module.exports.ConfigLoader;
};

describe('ConfigLoader Unit Tests', () => {
  let ConfigLoader;
  let configLoader;
  
  beforeAll(() => {
    ConfigLoader = getConfigLoader();
  });
  
  beforeEach(() => {
    // フェッチモックをリセット
    global.fetch.mockReset();
    
    // ConfigLoaderインスタンスを作成
    configLoader = new ConfigLoader();
  });
  
  afterEach(() => {
    // グローバル状態をクリア
    delete global.window.configData;
  });
  
  describe('基本機能', () => {
    test('ConfigLoaderクラスが正しく定義されている', () => {
      expect(ConfigLoader).toBeDefined();
      expect(typeof ConfigLoader).toBe('function');
    });
    
    test('インスタンスが正しく作成される', () => {
      expect(configLoader).toBeDefined();
      expect(configLoader.constructor).toBe(ConfigLoader);
    });
    
    test('設定ファイルパスが正しく設定されている', () => {
      expect(configLoader.configPath).toBe('/docs/config/app-config.json');
    });
  });
  
  describe('設定データの読み込み', () => {
    const mockConfig = {
      game: {
        canvas: { width: 800, height: 600 }
      },
      ai: {
        model: { default: 'mistral' },
        commentary: { enabled: true }
      }
    };
    
    test('設定データが正常に読み込まれる', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });
      
      await configLoader.loadConfig();
      
      expect(global.fetch).toHaveBeenCalledWith('/docs/config/app-config.json');
      expect(global.window.configData).toEqual(mockConfig);
    });
    
    test('設定読み込みエラー時にデフォルト値が使用される', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await configLoader.loadConfig();
      
      expect(global.window.configData).toEqual({});
    });
    
    test('無効なJSON応答時にデフォルト値が使用される', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      
      await configLoader.loadConfig();
      
      expect(global.window.configData).toEqual({});
    });
  });
  
  describe('設定値の取得', () => {
    beforeEach(() => {
      global.window.configData = {
        game: {
          canvas: { width: 800, height: 600 },
          colors: { background: '#000000' }
        },
        ai: {
          model: { default: 'mistral', fallback: 'gemma' },
          commentary: { enabled: true, minInterval: 5000 }
        }
      };
    });
    
    test('ゲーム設定が正しく取得される', () => {
      const gameConfig = configLoader.getGameConfig();
      
      expect(gameConfig).toEqual({
        canvas: { width: 800, height: 600 },
        colors: { background: '#000000' }
      });
    });
    
    test('AI設定が正しく取得される', () => {
      const aiConfig = configLoader.getAIConfig();
      
      expect(aiConfig).toEqual({
        model: { default: 'mistral', fallback: 'gemma' },
        commentary: { enabled: true, minInterval: 5000 }
      });
    });
    
    test('設定データが存在しない場合は空オブジェクトが返される', () => {
      delete global.window.configData;
      
      const gameConfig = configLoader.getGameConfig();
      const aiConfig = configLoader.getAIConfig();
      
      expect(gameConfig).toEqual({});
      expect(aiConfig).toEqual({});
    });
  });
  
  describe('環境変数オーバーライド', () => {
    test('URL パラメータによる設定オーバーライド', () => {
      // URL パラメータをシミュレート
      global.window.location = {
        search: '?ai_model=gemma&debug_mode=true'
      };
      
      const overrides = configLoader.getEnvironmentOverrides();
      
      expect(overrides).toHaveProperty('ai_model', 'gemma');
      expect(overrides).toHaveProperty('debug_mode', 'true');
    });
    
    test('空のURL パラメータでは空オブジェクトが返される', () => {
      global.window.location = { search: '' };
      
      const overrides = configLoader.getEnvironmentOverrides();
      
      expect(overrides).toEqual({});
    });
  });
});