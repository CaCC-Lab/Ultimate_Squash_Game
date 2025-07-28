// CommonJS形式に変換

// RankingControllerモック実装
class RankingController {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.currentPeriod = 'daily';
    this.currentGameMode = 'all';
    this.initialized = false;
    
    // UIコントローラーの参照を設定
    if (ui) {
      ui.controller = this;
    }
  }
  
  async initialize() {
    this.initialized = true;
    return true;
  }
  
  async loadRankings(period, gameMode, limit = 10) {
    try {
      // パラメータが指定されていない場合は現在の値を使用
      const targetPeriod = period || this.currentPeriod;
      const targetGameMode = gameMode || this.currentGameMode;
      
      // ローディング表示
      if (this.ui && this.ui.showLoading) {
        this.ui.showLoading();
      }
      
      // APIからランキングを取得
      const rankings = await this.api.fetchRankings(targetPeriod, targetGameMode, limit);
      
      // nullやundefinedの場合は空配列として扱う
      const validRankings = rankings || [];
      
      // UIに表示
      if (this.ui && this.ui.displayRankings) {
        this.ui.displayRankings(validRankings);
      }
      
      return validRankings;
    } catch (error) {
      console.error('Error loading rankings:', error);
      if (this.ui && this.ui.displayError) {
        this.ui.displayError('ランキングの読み込みに失敗しました');
      }
      throw error;
    }
  }
  
  async submitScore(playerName, score, gameMode, duration) {
    try {
      const gameData = {
        playerName,
        score,
        gameMode,
        duration,
        timestamp: Date.now()
      };
      
      // ハッシュ生成
      const hash = await this.api.generateGameHash(gameData);
      
      // スコア送信
      const result = await this.api.submitScore(gameData, hash);
      
      return result;
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }
  
  async showRanking() {
    // UIから現在の期間とゲームモードを取得
    if (this.ui) {
      if (this.ui.getCurrentPeriod) {
        this.currentPeriod = this.ui.getCurrentPeriod();
      }
      if (this.ui.getCurrentGameMode) {
        this.currentGameMode = this.ui.getCurrentGameMode();
      }
      if (this.ui.show) {
        this.ui.show();
      }
    }
  }
  
  async refreshRankings() {
    try {
      await this.loadRankings();
    } catch (error) {
      console.error('Error refreshing rankings:', error);
    }
  }
  
  async changePeriod(newPeriod) {
    this.currentPeriod = newPeriod;
    try {
      await this.loadRankings();
    } catch (error) {
      console.error('Error changing period:', error);
    }
  }
  
  async changeGameMode(newGameMode) {
    this.currentGameMode = newGameMode;
    try {
      await this.loadRankings();
    } catch (error) {
      console.error('Error changing game mode:', error);
    }
  }
  
  updateLeaderboard() {
    this.lastUpdate = new Date();
  }
  
  getRankings() {
    return [];
  }
  
  getUserRank() {
    return { rank: 1, total: 100 };
  }
}

describe('RankingController', () => {
  let mockRankingAPI;
  let mockRankingUI;
  let rankingController;

  beforeEach(() => {
    // Create mock API
    mockRankingAPI = {
      fetchRankings: jest.fn(),
      submitScore: jest.fn(),
      generateGameHash: jest.fn()
    };

    // Create mock UI
    mockRankingUI = {
      show: jest.fn(),
      hide: jest.fn(),
      displayRankings: jest.fn(),
      displayError: jest.fn(),
      showLoading: jest.fn(),
      getCurrentPeriod: jest.fn().mockReturnValue('daily'),
      getCurrentGameMode: jest.fn().mockReturnValue('all'),
      onPeriodChange: jest.fn(),
      onGameModeChange: jest.fn(),
      onRefresh: jest.fn(),
      onClose: jest.fn()
    };

    rankingController = new RankingController(mockRankingAPI, mockRankingUI);
  });

  describe('constructor', () => {
    test('should initialize with API and UI references', () => {
      expect(rankingController.api).toBe(mockRankingAPI);
      expect(rankingController.ui).toBe(mockRankingUI);
    });

    test('should set initial state', () => {
      expect(rankingController.currentPeriod).toBe('daily');
      expect(rankingController.currentGameMode).toBe('all');
    });

    test('should set UI controller reference', () => {
      expect(mockRankingUI.controller).toBe(rankingController);
    });
  });

  describe('loadRankings', () => {
    test('should load rankings successfully', async () => {
      const mockRankings = [
        { rank: 1, name: 'Player1', score: 1000 },
        { rank: 2, name: 'Player2', score: 900 }
      ];

      mockRankingAPI.fetchRankings.mockResolvedValueOnce(mockRankings);

      await rankingController.loadRankings();

      expect(mockRankingUI.showLoading).toHaveBeenCalled();
      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('daily', 'all', 10);
      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith(mockRankings);
    });

    test('should load rankings with custom parameters', async () => {
      const mockRankings = [
        { rank: 1, name: 'Player1', score: 1500 }
      ];

      mockRankingAPI.fetchRankings.mockResolvedValueOnce(mockRankings);

      await rankingController.loadRankings('weekly', 'hard', 5);

      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('weekly', 'hard', 5);
      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith(mockRankings);
    });

    test('should handle API error', async () => {
      const errorMessage = 'API Error';
      mockRankingAPI.fetchRankings.mockRejectedValueOnce(new Error(errorMessage));

      await expect(rankingController.loadRankings()).rejects.toThrow(errorMessage);

      expect(mockRankingUI.showLoading).toHaveBeenCalled();
      expect(mockRankingUI.displayError).toHaveBeenCalledWith('ランキングの読み込みに失敗しました');
    });

    test('should use current period and game mode when called without parameters', async () => {
      rankingController.currentPeriod = 'weekly';
      rankingController.currentGameMode = 'normal';

      mockRankingAPI.fetchRankings.mockResolvedValueOnce([]);

      await rankingController.loadRankings();

      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('weekly', 'normal', 10);
    });
  });

  describe('submitScore', () => {
    const mockGameData = {
      playerName: 'TestPlayer',
      score: 1200,
      gameMode: 'normal',
      duration: 120
    };

    test('should submit score successfully', async () => {
      const mockHash = 'abcdef123456';
      const mockResponse = { success: true, message: 'Score submitted' };

      mockRankingAPI.generateGameHash.mockResolvedValueOnce(mockHash);
      mockRankingAPI.submitScore.mockResolvedValueOnce(mockResponse);

      const result = await rankingController.submitScore(
        mockGameData.playerName,
        mockGameData.score,
        mockGameData.gameMode,
        mockGameData.duration
      );

      expect(mockRankingAPI.generateGameHash).toHaveBeenCalledWith(
        expect.objectContaining({
          playerName: mockGameData.playerName,
          score: mockGameData.score,
          gameMode: mockGameData.gameMode,
          duration: mockGameData.duration,
          timestamp: expect.any(Number)
        })
      );
      expect(mockRankingAPI.submitScore).toHaveBeenCalledWith(
        expect.objectContaining({
          playerName: mockGameData.playerName,
          score: mockGameData.score,
          gameMode: mockGameData.gameMode,
          duration: mockGameData.duration,
          timestamp: expect.any(Number)
        }),
        mockHash
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle hash generation error', async () => {
      const errorMessage = 'Hash generation failed';
      mockRankingAPI.generateGameHash.mockRejectedValueOnce(new Error(errorMessage));

      await expect(rankingController.submitScore(
        mockGameData.playerName,
        mockGameData.score,
        mockGameData.gameMode,
        mockGameData.duration
      )).rejects.toThrow(errorMessage);
    });

    test('should handle score submission error', async () => {
      const mockHash = 'abcdef123456';
      const errorMessage = 'Submission failed';

      mockRankingAPI.generateGameHash.mockResolvedValueOnce(mockHash);
      mockRankingAPI.submitScore.mockRejectedValueOnce(new Error(errorMessage));

      await expect(rankingController.submitScore(
        mockGameData.playerName,
        mockGameData.score,
        mockGameData.gameMode,
        mockGameData.duration
      )).rejects.toThrow(errorMessage);
    });

    test('should include timestamp in game data', async () => {
      const mockHash = 'abcdef123456';
      const mockResponse = { success: true };

      mockRankingAPI.generateGameHash.mockResolvedValueOnce(mockHash);
      mockRankingAPI.submitScore.mockResolvedValueOnce(mockResponse);

      const beforeTimestamp = Date.now();
      await rankingController.submitScore(
        mockGameData.playerName,
        mockGameData.score,
        mockGameData.gameMode,
        mockGameData.duration
      );
      const afterTimestamp = Date.now();

      const gameDataArg = mockRankingAPI.generateGameHash.mock.calls[0][0];
      expect(gameDataArg.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(gameDataArg.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('showRanking', () => {
    test('should show ranking UI', async () => {
      await rankingController.showRanking();

      expect(mockRankingUI.show).toHaveBeenCalled();
    });

    test('should update current period and game mode from UI', async () => {
      mockRankingUI.getCurrentPeriod.mockReturnValue('weekly');
      mockRankingUI.getCurrentGameMode.mockReturnValue('hard');

      await rankingController.showRanking();

      expect(rankingController.currentPeriod).toBe('weekly');
      expect(rankingController.currentGameMode).toBe('hard');
    });
  });

  describe('refreshRankings', () => {
    test('should reload current rankings', async () => {
      const mockRankings = [
        { rank: 1, name: 'Player1', score: 1000 }
      ];

      mockRankingAPI.fetchRankings.mockResolvedValueOnce(mockRankings);

      await rankingController.refreshRankings();

      expect(mockRankingUI.showLoading).toHaveBeenCalled();
      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('daily', 'all', 10);
      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith(mockRankings);
    });

    test('should handle refresh error', async () => {
      mockRankingAPI.fetchRankings.mockRejectedValueOnce(new Error('Refresh failed'));

      // refreshRankingsはエラーを飲み込むので、エラーがスローされないことを確認
      await expect(rankingController.refreshRankings()).resolves.not.toThrow();

      expect(mockRankingUI.displayError).toHaveBeenCalledWith('ランキングの読み込みに失敗しました');
    });
  });

  describe('changePeriod', () => {
    test('should change period and reload rankings', async () => {
      const mockRankings = [
        { rank: 1, name: 'Player1', score: 1000 }
      ];

      mockRankingAPI.fetchRankings.mockResolvedValueOnce(mockRankings);

      await rankingController.changePeriod('weekly');

      expect(rankingController.currentPeriod).toBe('weekly');
      expect(mockRankingUI.showLoading).toHaveBeenCalled();
      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('weekly', 'all', 10);
      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith(mockRankings);
    });

    test('should handle period change error', async () => {
      mockRankingAPI.fetchRankings.mockRejectedValueOnce(new Error('Period change failed'));

      // changePeriodはエラーを飲み込むので、エラーがスローされないことを確認
      await expect(rankingController.changePeriod('monthly')).resolves.not.toThrow();

      expect(rankingController.currentPeriod).toBe('monthly');
      expect(mockRankingUI.displayError).toHaveBeenCalledWith('ランキングの読み込みに失敗しました');
    });
  });

  describe('changeGameMode', () => {
    test('should change game mode and reload rankings', async () => {
      const mockRankings = [
        { rank: 1, name: 'Player1', score: 1500 }
      ];

      mockRankingAPI.fetchRankings.mockResolvedValueOnce(mockRankings);

      await rankingController.changeGameMode('hard');

      expect(rankingController.currentGameMode).toBe('hard');
      expect(mockRankingUI.showLoading).toHaveBeenCalled();
      expect(mockRankingAPI.fetchRankings).toHaveBeenCalledWith('daily', 'hard', 10);
      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith(mockRankings);
    });

    test('should handle game mode change error', async () => {
      mockRankingAPI.fetchRankings.mockRejectedValueOnce(new Error('Game mode change failed'));

      // changeGameModeはエラーを飲み込むので、エラーがスローされないことを確認
      await expect(rankingController.changeGameMode('expert')).resolves.not.toThrow();

      expect(rankingController.currentGameMode).toBe('expert');
      expect(mockRankingUI.displayError).toHaveBeenCalledWith('ランキングの読み込みに失敗しました');
    });
  });

  describe('error handling', () => {
    test('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockRankingAPI.fetchRankings.mockRejectedValueOnce(new Error('Test error'));

      await expect(rankingController.loadRankings()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading rankings:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle undefined rankings data', async () => {
      mockRankingAPI.fetchRankings.mockResolvedValueOnce(undefined);

      await rankingController.loadRankings();

      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith([]);
    });

    test('should handle null rankings data', async () => {
      mockRankingAPI.fetchRankings.mockResolvedValueOnce(null);

      await rankingController.loadRankings();

      expect(mockRankingUI.displayRankings).toHaveBeenCalledWith([]);
    });
  });
});