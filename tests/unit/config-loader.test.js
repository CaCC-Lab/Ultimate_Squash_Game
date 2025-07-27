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
    if (configLoader) {
      configLoader.config = null;
    }
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
      expect(configLoader.configPath).toBe('config/app-config.json');
    });
  });
  
  describe('設定データの読み込み', () => {
    const mockConfig = {
      game: {
        canvas: { width: 800, height: 600 }
      },
      ai: {
        model: { default: 'mistral', fallback: 'gemma' },
        commentary: { enabled: true }
      }
    };
    
    test('設定データが正常に読み込まれる', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });
      
      await configLoader.load();
      
      expect(global.fetch).toHaveBeenCalledWith('config/app-config.json');
      // fetch が呼ばれ、設定が読み込まれることを確認
      expect(configLoader.config).toBeDefined();
      expect(configLoader.config.game).toBeDefined();
      expect(configLoader.config.ai).toBeDefined();
    });
    
    test('設定読み込みエラー時にデフォルト値が使用される', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await configLoader.load();
      
      expect(configLoader.config).toBeDefined();
      expect(configLoader.config.game).toBeDefined();
    });
    
    test('無効なJSON応答時にデフォルト値が使用される', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      
      await configLoader.load();
      
      expect(configLoader.config).toBeDefined();
      expect(configLoader.config.game).toBeDefined();
    });
  });
  
  describe('設定値の取得', () => {
    beforeEach(() => {
      configLoader.config = {
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
      const gameConfig = configLoader.get('game');
      
      expect(gameConfig).toEqual({
        canvas: { width: 800, height: 600 },
        colors: { background: '#000000' }
      });
    });
    
    test('ネストされた設定値が正しく取得される', () => {
      const canvasWidth = configLoader.get('game.canvas.width');
      expect(canvasWidth).toBe(800);
      
      const aiModel = configLoader.get('ai.model.default');
      expect(aiModel).toBe('mistral');
    });
    
    test('存在しないパスの場合はデフォルト値が返される', () => {
      const nonExistent = configLoader.get('non.existent.path', 'default');
      expect(nonExistent).toBe('default');
    });
  });
  
  describe('設定値の設定', () => {
    beforeEach(() => {
      configLoader.config = {
        game: {
          canvas: { width: 800 }
        }
      };
    });
    
    test('設定値が正しく更新される', () => {
      configLoader.set('game.canvas.width', 1024);
      expect(configLoader.get('game.canvas.width')).toBe(1024);
    });
    
    test('新しいパスに設定値が作成される', () => {
      configLoader.set('new.path.value', 'test');
      expect(configLoader.get('new.path.value')).toBe('test');
    });
  });
  
  describe('特定の設定取得メソッド', () => {
    beforeEach(() => {
      configLoader.config = {
        game: {
          canvas: { width: 800, height: 600 }
        },
        ai: {
          model: { default: 'mistral', fallback: 'gemma' },
          commentary: { 
            enabled: true,
            minInterval: 5000,
            cacheExpiry: 30000,
            language: 'ja'
          },
          ada: {
            enabled: true,
            adjustmentInterval: 10000
          },
          eventPolling: {
            interval: 500
          }
        }
      };
    });
    
    test('getCanvasConfigでキャンバス設定が取得される', () => {
      const canvasConfig = configLoader.getCanvasConfig();
      expect(canvasConfig).toEqual({
        width: 800,
        height: 600,
        style: {}
      });
    });
    
    test('getAIConfigでAI設定が取得される', () => {
      const aiConfig = configLoader.getAIConfig();
      expect(aiConfig).toEqual({
        commentaryEnabled: true,
        commentaryInterval: 5000,
        cacheExpiry: 30000,
        adaEnabled: true,
        adaInterval: 10000,
        model: 'mistral',
        fallbackModel: 'gemma',
        eventPollingInterval: 500,
        language: 'ja'
      });
    });
  });
});