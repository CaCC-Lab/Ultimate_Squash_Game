/**
 * チャレンジとゲームの統合モジュール
 * ゲームプレイとチャレンジシステムを連携させる
 */

class ChallengeGameIntegration {
  constructor(gameEngine, challengeSystem) {
    this.gameEngine = gameEngine;
    this.challengeSystem = challengeSystem;
    this.isChallengeModeActive = false;
    this.currentChallengeSession = null;
    this.challengeProgress = null;
    
    // イベントハンドラのバインド
    this.handleGameScore = this.handleGameScore.bind(this);
    this.handleGameEnd = this.handleGameEnd.bind(this);
    this.handleGameMistake = this.handleGameMistake.bind(this);
    
    this.setupEventListeners();
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ゲームイベントの監視
    if (this.gameEngine) {
      this.gameEngine.on('score', this.handleGameScore);
      this.gameEngine.on('gameEnd', this.handleGameEnd);
      this.gameEngine.on('mistake', this.handleGameMistake);
    }
  }

  /**
   * チャレンジモードを開始
   * @param {Object} challenge - チャレンジオブジェクト
   */
  async startChallengeMode(challenge) {
    if (this.isChallengeModeActive) {
      console.warn('Challenge mode is already active');
      return;
    }
    
    try {
      // チャレンジセッションを開始
      this.currentChallengeSession = await this.challengeSystem.startChallenge(challenge.id);
      this.isChallengeModeActive = true;
      
      // 進捗追跡を初期化
      if (this.challengeSystem.challengeProgress) {
        this.challengeProgress = this.challengeSystem.challengeProgress;
        this.challengeProgress.startChallenge(challenge.id);
      }
      
      // ゲーム設定を調整
      this.applyChallengeModeSettings(challenge);
      
      // UIを更新
      this.updateUI('challengeStart', challenge);
      
      return this.currentChallengeSession;
    } catch (error) {
      console.error('Failed to start challenge mode:', error);
      this.isChallengeModeActive = false;
      throw error;
    }
  }

  /**
   * チャレンジモードの設定を適用
   * @param {Object} challenge - チャレンジオブジェクト
   */
  applyChallengeModeSettings(challenge) {
    if (!this.gameEngine) return;
    
    // 難易度に応じてゲーム設定を調整
    switch (challenge.difficulty) {
      case 'easy':
        this.gameEngine.setDifficulty({
          ballSpeed: 0.8,
          aiSpeed: 0.7,
          scoreMultiplier: 1.0
        });
        break;
      
      case 'medium':
        this.gameEngine.setDifficulty({
          ballSpeed: 1.0,
          aiSpeed: 0.85,
          scoreMultiplier: 1.2
        });
        break;
      
      case 'hard':
        this.gameEngine.setDifficulty({
          ballSpeed: 1.2,
          aiSpeed: 1.0,
          scoreMultiplier: 1.5
        });
        break;
      
      case 'extreme':
        this.gameEngine.setDifficulty({
          ballSpeed: 1.5,
          aiSpeed: 1.2,
          scoreMultiplier: 2.0
        });
        break;
    }
    
    // チャレンジ固有の設定
    if (challenge.gameSettings) {
      this.gameEngine.applySettings(challenge.gameSettings);
    }
  }

  /**
   * ゲームスコアイベントの処理
   * @param {Object} scoreData - スコアデータ
   */
  handleGameScore(scoreData) {
    if (!this.isChallengeModeActive || !this.challengeProgress) return;
    
    // 進捗を更新
    this.challengeProgress.updateScore(scoreData.points, scoreData.isCombo);
    
    // UIを更新
    this.updateUI('scoreUpdate', {
      currentScore: this.challengeProgress.getCurrentProgress().currentScore,
      targetScore: this.currentChallengeSession?.challenge?.targetScore
    });
  }

  /**
   * ゲーム終了イベントの処理
   * @param {Object} gameResult - ゲーム結果
   */
  async handleGameEnd(gameResult) {
    if (!this.isChallengeModeActive) return;
    
    try {
      // チャレンジ結果を作成
      const challengeResult = {
        score: gameResult.score,
        timeUsed: gameResult.duration,
        mistakes: gameResult.mistakes || 0,
        maxCombo: this.challengeProgress?.getCurrentProgress().maxCombo || 0
      };
      
      // チャレンジを終了
      const submission = await this.challengeSystem.submitChallengeResult(
        this.currentChallengeSession.challengeId,
        challengeResult
      );
      
      // UIを更新
      this.updateUI('challengeEnd', submission);
      
      // チャレンジモードを終了
      this.endChallengeMode();
      
      return submission;
    } catch (error) {
      console.error('Failed to submit challenge result:', error);
      this.endChallengeMode();
      throw error;
    }
  }

  /**
   * ミスイベントの処理
   * @param {Object} mistakeData - ミスデータ
   */
  handleGameMistake(mistakeData) {
    if (!this.isChallengeModeActive || !this.challengeProgress) return;
    
    this.challengeProgress.recordMistake();
    
    // UIを更新
    this.updateUI('mistake', {
      mistakes: this.challengeProgress.getCurrentProgress().mistakes
    });
  }

  /**
   * チャレンジモードを終了
   */
  endChallengeMode() {
    this.isChallengeModeActive = false;
    this.currentChallengeSession = null;
    
    // ゲーム設定をリセット
    if (this.gameEngine) {
      this.gameEngine.resetDifficulty();
    }
    
    // 進捗をリセット
    if (this.challengeProgress) {
      this.challengeProgress.reset();
    }
    
    // UIを更新
    this.updateUI('challengeModeEnd', {});
  }

  /**
   * UIを更新
   * @param {string} event - イベント名
   * @param {Object} data - イベントデータ
   */
  updateUI(event, data) {
    // カスタムイベントを発火
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('challengeGameUpdate', {
        detail: { event, data }
      });
      window.dispatchEvent(customEvent);
    }
    
    // 基本的なUI更新
    switch (event) {
      case 'challengeStart':
        this.showChallengeStartUI(data);
        break;
      
      case 'scoreUpdate':
        this.updateScoreUI(data);
        break;
      
      case 'challengeEnd':
        this.showChallengeResultUI(data);
        break;
    }
  }

  /**
   * チャレンジ開始UIを表示
   * @param {Object} challenge - チャレンジオブジェクト
   */
  showChallengeStartUI(challenge) {
    const notification = document.getElementById('challenge-notification');
    if (notification) {
      notification.innerHTML = `
        <div class="challenge-start">
          <h3>チャレンジ開始！</h3>
          <p>${challenge.title}</p>
          <p>目標: ${challenge.targetScore}点</p>
        </div>
      `;
      notification.classList.add('show');
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * スコアUIを更新
   * @param {Object} scoreData - スコアデータ
   */
  updateScoreUI(scoreData) {
    const progressBar = document.getElementById('challenge-progress-bar');
    if (progressBar && scoreData.targetScore) {
      const percentage = Math.min((scoreData.currentScore / scoreData.targetScore) * 100, 100);
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('data-progress', `${Math.round(percentage)}%`);
    }
    
    const scoreDisplay = document.getElementById('challenge-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `${scoreData.currentScore} / ${scoreData.targetScore}`;
    }
  }

  /**
   * チャレンジ結果UIを表示
   * @param {Object} submission - 提出結果
   */
  showChallengeResultUI(submission) {
    const resultModal = document.getElementById('challenge-result-modal');
    if (resultModal) {
      const { evaluation, rewards } = submission;
      
      resultModal.innerHTML = `
        <div class="challenge-result">
          <h2>${evaluation.success ? '成功！' : '失敗...'}</h2>
          <div class="score-details">
            <p>スコア: ${evaluation.score}</p>
            <p>タイムボーナス: ${evaluation.timeBonus || 0}</p>
            <p>合計: ${evaluation.totalScore}</p>
          </div>
          ${rewards ? `
            <div class="rewards">
              <h3>獲得報酬</h3>
              <p>ポイント: ${rewards.points}</p>
              ${rewards.badge ? `<p>バッジ: ${rewards.badge}</p>` : ''}
            </div>
          ` : ''}
          <button onclick="this.parentElement.parentElement.style.display='none'">閉じる</button>
        </div>
      `;
      
      resultModal.style.display = 'block';
    }
  }

  /**
   * 現在のチャレンジ状態を取得
   * @returns {Object} チャレンジ状態
   */
  getChallengeState() {
    return {
      isActive: this.isChallengeModeActive,
      session: this.currentChallengeSession,
      progress: this.challengeProgress?.getCurrentProgress()
    };
  }

  /**
   * クリーンアップ
   */
  destroy() {
    // イベントリスナーを削除
    if (this.gameEngine) {
      this.gameEngine.off('score', this.handleGameScore);
      this.gameEngine.off('gameEnd', this.handleGameEnd);
      this.gameEngine.off('mistake', this.handleGameMistake);
    }
    
    // チャレンジモードを終了
    if (this.isChallengeModeActive) {
      this.endChallengeMode();
    }
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeGameIntegration;
}

// ブラウザ環境用
if (typeof window !== 'undefined') {
  window.ChallengeGameIntegration = ChallengeGameIntegration;
}