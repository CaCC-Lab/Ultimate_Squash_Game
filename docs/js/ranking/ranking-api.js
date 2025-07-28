// Ultimate Squash Game - Ranking API
export class RankingAPI {
  /**
     * @param {string} apiBaseUrl APIのベースURL
     */
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.secretKey = 'default-secret-key-change-in-production'; // 本番環境では環境変数から取得
  }

  /**
     * スコアをサーバーに送信します。
     * @param {object} gameData ゲームデータ
     * @param {string} gameHash ゲームデータのハッシュ
     * @returns {Promise<object>} 送信結果
     */
  async submitScore(gameData, gameHash) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameData,
          gameHash
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スコア送信に失敗しました');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }

  /**
     * ランキングデータをサーバーから取得します。
     * @param {string} period 期間 (daily, weekly, monthly, allTime)
     * @param {string} gameMode ゲームモード (all, normal, hard, expert)
     * @param {number} limit 取得件数
     * @returns {Promise<Array<object>>} ランキングデータ
     */
  async fetchRankings(period = 'daily', gameMode = 'all', limit = 10) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/get?period=${period}&gameMode=${gameMode}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('ランキング取得に失敗しました');
      }

      const data = await response.json();
      return data.rankings;
    } catch (error) {
      console.error('Error fetching rankings:', error);
      throw error;
    }
  }

  /**
     * ゲームデータのハッシュを生成します。
     * @param {object} gameData ゲームデータ
     * @returns {Promise<string>} 生成されたハッシュ
     */
  async generateGameHash(gameData) {
    const { playerName, score, gameMode, duration, timestamp } = gameData;
    const dataString = `${playerName}:${score}:${gameMode}:${duration}:${timestamp}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
