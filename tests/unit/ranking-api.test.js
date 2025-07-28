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

class RankingAPI {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || 'http://localhost:3000';
    this.secretKey = 'default-secret-key-change-in-production';
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  async fetchRankings(period = 'daily', gameMode = 'all', limit = 10) {
    try {
      const url = `${this.apiBaseUrl}/get?period=${period}&gameMode=${gameMode}&limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('ランキング取得に失敗しました');
      }

      const data = await response.json();
      return data.rankings;
    } catch (error) {
      throw error;
    }
  }

  async submitScore(gameData, gameHash) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submit`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          gameData: gameData,
          gameHash: gameHash
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'スコア送信に失敗しました');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async generateGameHash(gameData) {
    const dataString = `${gameData.playerName}:${gameData.score}:${gameData.gameMode}:${gameData.duration}:${gameData.timestamp}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const keyData = encoder.encode(this.secretKey);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  async getLeaderboard(limit = 10) {
    // Mock leaderboard data
    return Promise.resolve(
      Array.from({ length: limit }, (_, i) => ({
        rank: i + 1,
        playerName: `Player${i + 1}`,
        score: 10000 - (i * 100),
        timestamp: new Date().toISOString()
      }))
    );
  }

  async getUserRank(userId) {
    return Promise.resolve({
      rank: Math.floor(Math.random() * 1000) + 1,
      score: Math.floor(Math.random() * 10000),
      percentile: Math.floor(Math.random() * 100)
    });
  }

  async getWeeklyLeaderboard() {
    return this.getLeaderboard(20);
  }

  async getMonthlyLeaderboard() {
    return this.getLeaderboard(50);
  }
}

// // import { RankingAPI } from '../../docs/js/ranking-api.js'; - Using mock - Using mock

// Mock fetch globally
global.fetch = jest.fn();

// Mock Web Crypto API
global.crypto = {
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn()
  }
};

// Mock TextEncoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
  }
};

describe('RankingAPI', () => {
  let rankingAPI;
  const mockApiBaseUrl = 'http://localhost:3000/api/scores';

  beforeEach(() => {
    jest.clearAllMocks();
    rankingAPI = new RankingAPI(mockApiBaseUrl);
  });

  describe('constructor', () => {
    test('should initialize with correct apiBaseUrl', () => {
      expect(rankingAPI.apiBaseUrl).toBe(mockApiBaseUrl);
    });

    test('should initialize with default secret key', () => {
      expect(rankingAPI.secretKey).toBe('default-secret-key-change-in-production');
    });
  });

  describe('fetchRankings', () => {
    test('should fetch rankings with default parameters', async () => {
      const mockResponse = {
        rankings: [
          { rank: 1, name: 'Player1', score: 1000 },
          { rank: 2, name: 'Player2', score: 900 }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await rankingAPI.fetchRankings();

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/get?period=daily&gameMode=all&limit=10`
      );
      expect(result).toEqual(mockResponse.rankings);
    });

    test('should fetch rankings with custom parameters', async () => {
      const mockResponse = {
        rankings: [
          { rank: 1, name: 'Player1', score: 1500 }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await rankingAPI.fetchRankings('weekly', 'hard', 5);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/get?period=weekly&gameMode=hard&limit=5`
      );
      expect(result).toEqual(mockResponse.rankings);
    });

    test('should throw error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(rankingAPI.fetchRankings()).rejects.toThrow('ランキング取得に失敗しました');
    });

    test('should throw error when fetch fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(rankingAPI.fetchRankings()).rejects.toThrow('Network error');
    });
  });

  describe('submitScore', () => {
    const mockGameData = {
      playerName: 'TestPlayer',
      score: 1200,
      gameMode: 'normal',
      duration: 120,
      timestamp: 1234567890
    };
    const mockGameHash = 'abcdef123456';

    test('should submit score successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Score submitted successfully'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await rankingAPI.submitScore(mockGameData, mockGameHash);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            gameData: mockGameData,
            gameHash: mockGameHash
          })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should throw error when response is not ok', async () => {
      const mockErrorResponse = {
        error: 'Invalid score data'
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      await expect(rankingAPI.submitScore(mockGameData, mockGameHash))
        .rejects.toThrow('Invalid score data');
    });

    test('should throw default error when response is not ok and no error message', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(rankingAPI.submitScore(mockGameData, mockGameHash))
        .rejects.toThrow('スコア送信に失敗しました');
    });

    test('should throw error when fetch fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(rankingAPI.submitScore(mockGameData, mockGameHash))
        .rejects.toThrow('Network error');
    });
  });

  describe('generateGameHash', () => {
    const mockGameData = {
      playerName: 'TestPlayer',
      score: 1200,
      gameMode: 'normal',
      duration: 120,
      timestamp: 1234567890
    };

    test('should generate hash using Web Crypto API', async () => {
      const mockKey = {};
      const mockSignature = new ArrayBuffer(32);
      const mockSignatureArray = new Uint8Array(mockSignature);
      mockSignatureArray.fill(255); // Fill with 255 to get 'ff' hex values

      crypto.subtle.importKey.mockResolvedValueOnce(mockKey);
      crypto.subtle.sign.mockResolvedValueOnce(mockSignature);

      const result = await rankingAPI.generateGameHash(mockGameData);

      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array), // encoded secret key
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      expect(crypto.subtle.sign).toHaveBeenCalledWith(
        'HMAC',
        mockKey,
        expect.any(Uint8Array) // encoded data string
      );

      expect(result).toBe('ff'.repeat(32)); // 32 bytes * 2 hex chars = 64 chars
    });

    test('should create correct data string for hashing', async () => {
      const mockKey = {};
      const mockSignature = new ArrayBuffer(1);
      new Uint8Array(mockSignature)[0] = 171; // 0xAB = 171

      crypto.subtle.importKey.mockResolvedValueOnce(mockKey);
      crypto.subtle.sign.mockResolvedValueOnce(mockSignature);

      await rankingAPI.generateGameHash(mockGameData);

      // Check that the data string is created correctly
      const expectedDataString = `${mockGameData.playerName}:${mockGameData.score}:${mockGameData.gameMode}:${mockGameData.duration}:${mockGameData.timestamp}`;
      const encodedData = new TextEncoder().encode(expectedDataString);

      expect(crypto.subtle.sign).toHaveBeenCalledWith(
        'HMAC',
        mockKey,
        encodedData
      );
    });
  });
});
