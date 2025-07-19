/**
 * 週替わりチャレンジ用のAPIクライアント
 * チャレンジスコアの送信とリーダーボードの取得を担当
 */
export class WeeklyChallengeAPI {
  /**
   * @param {string} apiBaseUrl APIのベースURL
   */
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.secretKey = 'default-secret-key-change-in-production'; // 本番環境では環境変数から取得
  }

  /**
   * チャレンジスコアをサーバーに送信します。
   * @param {object} challengeData チャレンジデータ
   * @returns {Promise<object>} 送信結果
   */
  async submitChallengeScore(challengeData) {
    try {
      const challengeHash = await this.generateChallengeHash(challengeData);
      
      const response = await fetch(`${this.apiBaseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeData,
          challengeHash
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スコア送信に失敗しました');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting challenge score:', error);
      throw error;
    }
  }

  /**
   * チャレンジのリーダーボードを取得します。
   * @param {string} challengeId チャレンジID
   * @param {number} limit 取得件数（デフォルト: 10）
   * @returns {Promise<Array<object>>} リーダーボードデータ
   */
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
      console.error('Error fetching challenge leaderboard:', error);
      throw error;
    }
  }

  /**
   * 現在アクティブなチャレンジ情報を取得します。
   * @returns {Promise<object>} アクティブなチャレンジ情報
   */
  async getActiveChallenge() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/active`);

      if (!response.ok) {
        throw new Error('アクティブチャレンジの取得に失敗しました');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active challenge:', error);
      throw error;
    }
  }

  /**
   * チャレンジデータのハッシュを生成します。
   * @param {object} challengeData チャレンジデータ
   * @returns {Promise<string>} 生成されたハッシュ
   */
  async generateChallengeHash(challengeData) {
    const { challengeId, playerName, score, gameMode, duration, timestamp } = challengeData;
    const dataString = `${challengeId}:${playerName}:${score}:${gameMode}:${duration}:${timestamp}`;

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