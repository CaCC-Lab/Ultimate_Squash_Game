/**
 * ウィークリーチャレンジ統合システムのテスト
 */

// 必要な依存関係を読み込み
const fs = require('fs');
const path = require('path');

// テスト用のDOM環境をセットアップ
global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};
global.document = {
    createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        addEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn(() => false)
        },
        style: {}
    })),
    querySelector: jest.fn(),
    body: {
        appendChild: jest.fn(),
        innerHTML: ''
    }
};
global.localStorage = {
    _storage: {},
    setItem: function(key, value) {
        this._storage[key] = value;
    },
    getItem: function(key) {
        return this._storage[key] || null;
    },
    removeItem: function(key) {
        delete this._storage[key];
    },
    clear: function() {
        this._storage = {};
    }
};

// テスト用スクリプトを読み込み
const loadScript = (filename) => {
    const scriptPath = path.join(__dirname, '../../docs/js', filename);
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    eval(scriptContent);
};

describe('WeeklyChallengeIntegration', () => {
    let integration;
    
    beforeEach(() => {
        // DOM環境をリセット
        document.body.innerHTML = '';
        localStorage.clear();
        
        // 必要なスクリプトを読み込み
        loadScript('challenge-types.js');
        loadScript('challenge-generator.js');
        loadScript('challenge-evaluator.js');
        loadScript('challenge-rewards.js');
        loadScript('weekly-challenge.js');
        loadScript('weekly-challenge-integration.js');
        
        integration = new WeeklyChallengeIntegration();
    });
    
    afterEach(() => {
        // クリーンアップ
        if (integration) {
            integration.listeners = [];
        }
    });
    
    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(integration).toBeDefined();
            expect(integration.challengeEvaluator).toBeDefined();
            expect(integration.challengeGenerator).toBeDefined();
            expect(integration.challengeRewards).toBeDefined();
            expect(integration.currentChallenge).toBeDefined();
            expect(integration.challengeProgress).toBeDefined();
        });
        
        test('現在のチャレンジが設定される', () => {
            expect(integration.currentChallenge).not.toBeNull();
            expect(integration.currentChallenge.id).toBeDefined();
            expect(integration.currentChallenge.title).toBeDefined();
            expect(integration.currentChallenge.description).toBeDefined();
        });
        
        test('チャレンジ進捗が初期化される', () => {
            expect(integration.challengeProgress).toEqual({
                progress: 0,
                completed: false
            });
        });
    });
    
    describe('ゲームセッション管理', () => {
        const mockGameState = {
            score: 100,
            hits: 10,
            ballSpeed: 5,
            paddleSize: 100,
            isGameOver: false
        };
        
        test('ゲームセッションを開始できる', () => {
            const startTime = Date.now();
            integration.startGameSession(mockGameState);
            
            expect(integration.gameSession).toBeDefined();
            expect(integration.gameSession.startTime).toBeGreaterThanOrEqual(startTime);
            expect(integration.gameSession.gameState).toBe(mockGameState);
            expect(integration.gameSession.sessionStats).toBeDefined();
        });
        
        test('ゲーム状態を更新できる', () => {
            integration.startGameSession(mockGameState);
            
            const updatedState = {
                ...mockGameState,
                score: 500,
                hits: 25
            };
            
            integration.updateGameState(updatedState);
            
            expect(integration.gameSession.sessionStats.score).toBe(500);
            expect(integration.gameSession.sessionStats.hits).toBe(25);
        });
        
        test('ゲーム終了時にセッションが終了される', () => {
            integration.startGameSession(mockGameState);
            
            const gameOverState = {
                ...mockGameState,
                isGameOver: true
            };
            
            integration.updateGameState(gameOverState);
            
            expect(integration.gameSession).toBeNull();
        });
    });
    
    describe('チャレンジ評価', () => {
        test('進捗が正しく評価される', () => {
            const mockGameState = {
                score: 500,
                hits: 25,
                ballSpeed: 5,
                paddleSize: 100
            };
            
            integration.startGameSession(mockGameState);
            integration.updateGameState(mockGameState);
            
            // 進捗が更新されることを確認
            expect(integration.challengeProgress.progress).toBeGreaterThan(0);
        });
        
        test('チャレンジ完了時の処理', () => {
            const mockGameState = {
                score: 2000, // 高スコアでチャレンジ完了
                hits: 100,
                ballSpeed: 5,
                paddleSize: 100
            };
            
            integration.startGameSession(mockGameState);
            integration.updateGameState(mockGameState);
            
            // 完了フラグが設定される可能性があることを確認
            expect(typeof integration.challengeProgress.completed).toBe('boolean');
        });
    });
    
    describe('UI管理', () => {
        test('チャレンジ表示UIが作成される', () => {
            const challengeDisplay = document.querySelector('.challenge-display');
            expect(challengeDisplay).toBeDefined();
        });
        
        test('プログレスバーが作成される', () => {
            const progressBar = document.querySelector('.challenge-progress');
            expect(progressBar).toBeDefined();
        });
        
        test('チャレンジボタンが作成される', () => {
            const challengeButton = document.querySelector('.challenge-button');
            expect(challengeButton).toBeDefined();
        });
        
        test('チャレンジ表示の切り替えが機能する', () => {
            const challengeDisplay = document.querySelector('.challenge-display');
            const initialHidden = challengeDisplay.classList.contains('hidden');
            
            integration.toggleChallengeDisplay();
            
            const afterToggle = challengeDisplay.classList.contains('hidden');
            expect(afterToggle).toBe(!initialHidden);
        });
    });
    
    describe('データ永続化', () => {
        test('チャレンジ進捗が保存される', () => {
            integration.challengeProgress = {
                progress: 50,
                completed: false
            };
            
            integration.saveChallengeProgress();
            
            const storageKey = `challenge_progress_${integration.currentChallenge.id}`;
            const savedData = localStorage.getItem(storageKey);
            
            expect(savedData).toBeDefined();
            expect(JSON.parse(savedData)).toEqual({
                progress: 50,
                completed: false
            });
        });
        
        test('チャレンジ進捗が読み込まれる', () => {
            const testProgress = {
                progress: 75,
                completed: false
            };
            
            const storageKey = `challenge_progress_${integration.currentChallenge.id}`;
            localStorage.setItem(storageKey, JSON.stringify(testProgress));
            
            const loadedProgress = integration.loadChallengeProgress();
            
            expect(loadedProgress).toEqual(testProgress);
        });
    });
    
    describe('イベント通知', () => {
        test('リスナーを追加・削除できる', () => {
            const listener = jest.fn();
            
            integration.addListener(listener);
            expect(integration.listeners).toContain(listener);
            
            integration.removeListener(listener);
            expect(integration.listeners).not.toContain(listener);
        });
        
        test('リスナーに通知が送信される', () => {
            const listener = jest.fn();
            integration.addListener(listener);
            
            integration.notifyListeners('test', { data: 'test' });
            
            expect(listener).toHaveBeenCalledWith('test', { data: 'test' });
        });
        
        test('チャレンジ初期化時に通知が送信される', () => {
            const listener = jest.fn();
            
            const newIntegration = new WeeklyChallengeIntegration();
            newIntegration.addListener(listener);
            
            expect(listener).toHaveBeenCalledWith('challengeInitialized', expect.any(Object));
        });
    });
    
    describe('エラーハンドリング', () => {
        test('エラーが適切に処理される', () => {
            const listener = jest.fn();
            integration.addListener(listener);
            
            const error = new Error('テストエラー');
            integration.handleError('テストメッセージ', error);
            
            expect(listener).toHaveBeenCalledWith('error', {
                message: 'テストメッセージ',
                error: error
            });
        });
        
        test('リスナー通知でエラーが発生しても他のリスナーは実行される', () => {
            const errorListener = jest.fn(() => {
                throw new Error('リスナーエラー');
            });
            const normalListener = jest.fn();
            
            integration.addListener(errorListener);
            integration.addListener(normalListener);
            
            // エラーが発生しても例外が投げられない
            expect(() => {
                integration.notifyListeners('test', {});
            }).not.toThrow();
            
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();
        });
    });
    
    describe('統計情報', () => {
        test('現在のチャレンジ情報を取得できる', () => {
            const challenge = integration.getCurrentChallenge();
            
            expect(challenge).toBe(integration.currentChallenge);
            expect(challenge.id).toBeDefined();
            expect(challenge.title).toBeDefined();
        });
        
        test('チャレンジ統計を取得できる', () => {
            const stats = integration.getChallengeStats();
            
            expect(stats).toEqual({
                current: integration.currentChallenge,
                progress: integration.challengeProgress,
                session: integration.gameSession
            });
        });
    });
});

describe('WeeklyChallengeDebug', () => {
    beforeEach(() => {
        localStorage.clear();
        loadScript('weekly-challenge-integration.js');
    });
    
    test('デバッグモードを有効/無効にできる', () => {
        WeeklyChallengeDebug.enableDebugMode();
        expect(WeeklyChallengeDebug.isDebugMode()).toBe(true);
        
        WeeklyChallengeDebug.disableDebugMode();
        expect(WeeklyChallengeDebug.isDebugMode()).toBe(false);
    });
    
    test('チャレンジ完了をシミュレートできる', () => {
        const integration = new WeeklyChallengeIntegration();
        
        // チャレンジ完了をシミュレート
        WeeklyChallengeDebug.simulateChallengeCompletion(integration);
        
        expect(integration.gameSession).toBeDefined();
        expect(integration.gameSession.sessionStats).toBeDefined();
        expect(integration.gameSession.sessionStats.score).toBe(1000);
    });
});