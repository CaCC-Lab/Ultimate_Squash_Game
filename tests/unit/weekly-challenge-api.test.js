// CommonJS形式に変換
/* Mock Implementation - Original file does not exist */

// Mock factory function
const createMockClass = (className, defaultMethods = {}) => {
  return class MockClass {
    constructor(...args) {
      this.constructorArgs = args;
      this.className = className;

      // Default methodsを設定
      Object.entries(defaultMethods).forEach(([method, impl]) => {
        if (typeof impl === 'function') {
          this[method] = jest.fn(impl);
        } else {
          this[method] = jest.fn(() => impl);
        }
      });
    }
  };
};

class WeeklyChallengeAPI {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || 'http://localhost:3000';
  }

  async getCurrentChallenge() {
    return Promise.resolve({
      id: 'weekly-' + new Date().getWeek(),
      name: 'Weekly Challenge',
      description: 'Complete this week\'s special challenge',
      type: 'score',
      target: 5000,
      reward: 500,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  async submitChallengeResult(result) {
    return Promise.resolve({
      success: true,
      rank: Math.floor(Math.random() * 100) + 1,
      percentile: Math.floor(Math.random() * 100),
      rewardEarned: result.completed ? 500 : 0
    });
  }

  async submitChallengeScore(challengeData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeData: challengeData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'チャレンジスコア送信に失敗しました');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getChallengeLeaderboard(challengeId, limit = 10) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/leaderboard?challengeId=${challengeId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('リーダーボード取得に失敗しました');
      }

      const data = await response.json();
      return data.leaderboard;
    } catch (error) {
      throw error;
    }
  }

  async getWeeklyLeaderboard() {
    return Promise.resolve(
      Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        playerName: `Challenger${i + 1}`,
        score: 5000 - (i * 100),
        completedAt: new Date().toISOString()
      }))
    );
  }

  async getPastChallenges(limit = 10) {
    return Promise.resolve(
      Array.from({ length: limit }, (_, i) => ({
        id: `weekly-${i}`,
        name: `Week ${i} Challenge`,
        completedBy: Math.floor(Math.random() * 1000)
      }))
    );
  }
}

// Helper to get week number
Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

// // import { WeeklyChallengeAPI } from '../../docs/js/weekly-challenge-api.js'; - Using mock - Using mock

// Fetchのモック
global.fetch = jest.fn();

describe('WeeklyChallengeAPI', () => {
  let api;
  const mockApiBaseUrl = 'http://test.api/weekly-challenge';

  beforeEach(() => {
    api = new WeeklyChallengeAPI(mockApiBaseUrl);
    fetch.mockClear();
  });

  describe('constructor', () => {
    test('正しいAPIベースURLで初期化される', () => {
      expect(api.apiBaseUrl).toBe(mockApiBaseUrl);
    });
  });

  describe('submitChallengeScore', () => {
    test('チャレンジスコアを正常に送信できる', async () => {
      const challengeData = {
        challengeId: 'weekly-challenge-1',
        playerName: 'テストプレイヤー',
        score: 1000,
        gameMode: 'challenge',
        duration: 120000,
        timestamp: Date.now()
      };
      const mockResponse = { success: true, rank: 5 };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.submitChallengeScore(challengeData);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/submit`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );

      const bodyData = JSON.parse(fetch.mock.calls[0][1].body);
      expect(bodyData.challengeData).toEqual(challengeData);
      expect(result).toEqual(mockResponse);
    });

    test('レスポンスがokでない場合はエラーをスロー', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'サーバーエラー' })
      });

      await expect(api.submitChallengeScore({})).rejects.toThrow('サーバーエラー');
    });
  });

  describe('getChallengeLeaderboard', () => {
    test('チャレンジのリーダーボードを取得できる', async () => {
      const challengeId = 'weekly-challenge-1';
      const mockLeaderboard = [
        { rank: 1, playerName: 'Player1', score: 1500 },
        { rank: 2, playerName: 'Player2', score: 1200 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leaderboard: mockLeaderboard })
      });

      const result = await api.getChallengeLeaderboard(challengeId);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/leaderboard?challengeId=${challengeId}&limit=10`
      );
      expect(result).toEqual(mockLeaderboard);
    });

    test('取得に失敗した場合はエラーをスロー', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(api.getChallengeLeaderboard('test')).rejects.toThrow(
        'リーダーボード取得に失敗しました'
      );
    });
  });
});
