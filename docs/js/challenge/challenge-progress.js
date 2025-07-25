/**
 * チャレンジ進捗管理システム
 * チャレンジの進行状況を追跡し、更新するためのクラス
 */

class ChallengeProgress {
  constructor() {
    this.currentProgress = {
      challengeId: null,
      startTime: null,
      currentScore: 0,
      timeElapsed: 0,
      mistakes: 0,
      combos: 0,
      maxCombo: 0,
      achievements: []
    };
    
    this.milestones = [
      { score: 100, name: 'スタート', achieved: false },
      { score: 500, name: 'ウォームアップ', achieved: false },
      { score: 1000, name: 'ハーフウェイ', achieved: false },
      { score: 2000, name: 'エキスパート', achieved: false },
      { score: 5000, name: 'マスター', achieved: false }
    ];
    
    this.listeners = [];
  }

  /**
   * チャレンジを開始
   * @param {string} challengeId - チャレンジID
   */
  startChallenge(challengeId) {
    this.currentProgress = {
      challengeId,
      startTime: Date.now(),
      currentScore: 0,
      timeElapsed: 0,
      mistakes: 0,
      combos: 0,
      maxCombo: 0,
      achievements: []
    };
    
    // マイルストーンをリセット
    this.milestones.forEach(milestone => {
      milestone.achieved = false;
    });
    
    this.notifyListeners('start', this.currentProgress);
  }

  /**
   * スコアを更新
   * @param {number} points - 追加するポイント
   * @param {boolean} isCombo - コンボかどうか
   */
  updateScore(points, isCombo = false) {
    this.currentProgress.currentScore += points;
    
    if (isCombo) {
      this.currentProgress.combos++;
      if (this.currentProgress.combos > this.currentProgress.maxCombo) {
        this.currentProgress.maxCombo = this.currentProgress.combos;
      }
    } else {
      this.currentProgress.combos = 0;
    }
    
    // マイルストーンチェック
    this.checkMilestones();
    
    this.notifyListeners('scoreUpdate', {
      score: this.currentProgress.currentScore,
      combos: this.currentProgress.combos
    });
  }

  /**
   * ミスを記録
   */
  recordMistake() {
    this.currentProgress.mistakes++;
    this.currentProgress.combos = 0;
    
    this.notifyListeners('mistake', {
      mistakes: this.currentProgress.mistakes
    });
  }

  /**
   * 時間を更新
   */
  updateTime() {
    if (this.currentProgress.startTime) {
      this.currentProgress.timeElapsed = Math.floor((Date.now() - this.currentProgress.startTime) / 1000);
      
      this.notifyListeners('timeUpdate', {
        timeElapsed: this.currentProgress.timeElapsed
      });
    }
  }

  /**
   * マイルストーンをチェック
   */
  checkMilestones() {
    this.milestones.forEach(milestone => {
      if (!milestone.achieved && this.currentProgress.currentScore >= milestone.score) {
        milestone.achieved = true;
        this.currentProgress.achievements.push({
          name: milestone.name,
          score: milestone.score,
          achievedAt: Date.now()
        });
        
        this.notifyListeners('milestone', milestone);
      }
    });
  }

  /**
   * チャレンジを終了
   */
  endChallenge() {
    const finalProgress = {
      ...this.currentProgress,
      endTime: Date.now(),
      totalTime: this.currentProgress.timeElapsed
    };
    
    this.notifyListeners('end', finalProgress);
    
    // 履歴に保存
    this.saveToHistory(finalProgress);
    
    return finalProgress;
  }

  /**
   * 進捗を履歴に保存
   * @param {Object} progress - 進捗データ
   */
  saveToHistory(progress) {
    const history = this.getHistory();
    history.push({
      ...progress,
      completedAt: Date.now()
    });
    
    // 最新100件のみ保持
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    localStorage.setItem('challengeProgressHistory', JSON.stringify(history));
  }

  /**
   * 履歴を取得
   * @returns {Array} 進捗履歴
   */
  getHistory() {
    const historyData = localStorage.getItem('challengeProgressHistory');
    return historyData ? JSON.parse(historyData) : [];
  }

  /**
   * 現在の進捗を取得
   * @returns {Object} 現在の進捗
   */
  getCurrentProgress() {
    return { ...this.currentProgress };
  }

  /**
   * パーセンテージで進捗を取得
   * @param {number} targetScore - 目標スコア
   * @returns {number} 進捗率（0-100）
   */
  getProgressPercentage(targetScore) {
    if (!targetScore || targetScore <= 0) return 0;
    const percentage = (this.currentProgress.currentScore / targetScore) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  /**
   * リスナーを追加
   * @param {Function} callback - コールバック関数
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * リスナーを削除
   * @param {Function} callback - コールバック関数
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * リスナーに通知
   * @param {string} event - イベント名
   * @param {Object} data - イベントデータ
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    });
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return {
        totalChallenges: 0,
        averageScore: 0,
        bestScore: 0,
        totalPlayTime: 0,
        averagePlayTime: 0
      };
    }
    
    const totalScore = history.reduce((sum, entry) => sum + entry.currentScore, 0);
    const totalTime = history.reduce((sum, entry) => sum + entry.totalTime, 0);
    const bestScore = Math.max(...history.map(entry => entry.currentScore));
    
    return {
      totalChallenges: history.length,
      averageScore: Math.round(totalScore / history.length),
      bestScore: bestScore,
      totalPlayTime: totalTime,
      averagePlayTime: Math.round(totalTime / history.length)
    };
  }

  /**
   * 進捗をリセット
   */
  reset() {
    this.currentProgress = {
      challengeId: null,
      startTime: null,
      currentScore: 0,
      timeElapsed: 0,
      mistakes: 0,
      combos: 0,
      maxCombo: 0,
      achievements: []
    };
    
    this.milestones.forEach(milestone => {
      milestone.achieved = false;
    });
    
    this.notifyListeners('reset', {});
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeProgress;
}

// ブラウザ環境用
if (typeof window !== 'undefined') {
  window.ChallengeProgress = ChallengeProgress;
}