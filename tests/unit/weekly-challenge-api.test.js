import { WeeklyChallengeAPI } from '../../docs/js/weekly-challenge-api.js';

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