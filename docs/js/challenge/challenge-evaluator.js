/**
 * 週替わりチャレンジ評価システム
 *
 * チャレンジの達成状況を評価し、進捗を計算する
 */
class ChallengeEvaluator {
  constructor() {
    this.evaluationMethods = {
      'score': this.evaluateScoreChallenge,
      'consecutive_hits': this.evaluateConsecutiveHitsChallenge,
      'time_survival': this.evaluateTimeSurvivalChallenge,
      'special_action': this.evaluateSpecialActionChallenge
    };
  }

  /**
     * チャレンジの評価を実行
     *
     * @param {Object} challenge - 評価するチャレンジ
     * @param {Object} gameStats - ゲーム統計
     * @returns {Object} 評価結果
     */
  evaluateChallenge(challenge, gameStats) {
    if (!challenge || !gameStats) {
      throw new Error('Challenge and gameStats are required');
    }

    const evaluationMethod = this.evaluationMethods[challenge.type];
    if (!evaluationMethod) {
      throw new Error(`Unsupported challenge type: ${challenge.type}`);
    }

    const result = evaluationMethod.call(this, challenge, gameStats);

    // 結果の標準化
    return {
      completed: result.completed,
      progress: result.progress,
      currentValue: result.currentValue,
      targetValue: challenge.target,
      timeRemaining: Math.max(0, challenge.timeLimit - gameStats.gameDuration),
      bonusPoints: result.bonusPoints || 0,
      metadata: {
        evaluationType: challenge.type,
        evaluatedAt: new Date().toISOString(),
        gameStats: gameStats,
        challenge: challenge
      }
    };
  }

  /**
     * 旧APIとの互換性のため（レガシー）
     * @param {Object} challenge - チャレンジ情報
     * @param {Object} gameResult - ゲームプレイの結果
     * @returns {boolean} - 達成したかどうか
     */
  evaluate(challenge, gameResult) {
    // 入力検証
    this.validateInputs(challenge, gameResult);

    // チャレンジタイプに応じて判定
    switch (challenge.type) {
      case 'score':
        return this.evaluateScoreChallengeLegacy(challenge, gameResult);

      case 'restriction':
        return this.evaluateRestrictionChallenge(challenge, gameResult);

      case 'time':
        return this.evaluateTimeChallenge(challenge, gameResult);

      case 'composite':
        return this.evaluateCompositeChallenge(challenge, gameResult);

      default:
        throw new Error(`Unknown challenge type: ${challenge.type}`);
    }
  }

  /**
   * 入力値の検証
   * @param {Object} challenge - チャレンジ情報
   * @param {Object} gameResult - ゲームプレイの結果
   */
  validateInputs(challenge, gameResult) {
    if (!challenge || !challenge.type) {
      throw new Error('Invalid challenge: missing type');
    }

    if (!gameResult) {
      throw new Error('Invalid game result: missing data');
    }

    // チャレンジタイプに応じて必要なデータが存在するかチェック
    if (challenge.type === 'score' && typeof gameResult.score !== 'number') {
      throw new Error('Invalid game result: missing score');
    }

    if (challenge.type === 'restriction' && typeof gameResult.powerUpsUsed !== 'number') {
      throw new Error('Invalid game result: missing powerUpsUsed');
    }

    if (challenge.type === 'time' && typeof gameResult.duration !== 'number') {
      throw new Error('Invalid game result: missing duration');
    }

    if (challenge.type === 'composite') {
      if (typeof gameResult.score !== 'number') {
        throw new Error('Invalid game result: missing score');
      }
      if (typeof gameResult.powerUpsUsed !== 'number') {
        throw new Error('Invalid game result: missing powerUpsUsed');
      }
    }
  }

  /**
   * スコアチャレンジの評価
   *
   * @param {Object} challenge - チャレンジ
   * @param {Object} gameStats - ゲーム統計
   * @returns {Object} 評価結果
   */
  evaluateScoreChallenge(challenge, gameStats) {
    const currentScore = gameStats.score || 0;
    const targetScore = challenge.target;
    const timeLimit = challenge.timeLimit;
    const gameDuration = gameStats.gameDuration || 0;

    const completed = currentScore >= targetScore && gameDuration <= timeLimit;
    const progress = Math.min((currentScore / targetScore) * 100, 100);

    // ボーナス計算（早期達成、超過達成）
    let bonusPoints = 0;
    if (completed) {
      // 早期達成ボーナス
      const timeBonus = Math.max(0, timeLimit - gameDuration);
      bonusPoints += Math.floor(timeBonus * 2);

      // 超過達成ボーナス
      if (currentScore > targetScore) {
        const overAchievement = currentScore - targetScore;
        bonusPoints += Math.floor(overAchievement * 0.1);
      }
    }

    return {
      completed,
      progress,
      currentValue: currentScore,
      bonusPoints
    };
  }

  /**
   * 連続ヒットチャレンジの評価
   *
   * @param {Object} challenge - チャレンジ
   * @param {Object} gameStats - ゲーム統計
   * @returns {Object} 評価結果
   */
  evaluateConsecutiveHitsChallenge(challenge, gameStats) {
    const currentHits = gameStats.consecutiveHits || 0;
    const targetHits = challenge.target;
    const timeLimit = challenge.timeLimit;
    const gameDuration = gameStats.gameDuration || 0;

    const completed = currentHits >= targetHits && gameDuration <= timeLimit;
    const progress = Math.min((currentHits / targetHits) * 100, 100);

    // ボーナス計算
    let bonusPoints = 0;
    if (completed) {
      // 連続ヒット数ボーナス
      bonusPoints += Math.floor(currentHits * 5);

      // 時間効率ボーナス
      const efficiency = timeLimit / Math.max(gameDuration, 1);
      bonusPoints += Math.floor(efficiency * 10);
    }

    return {
      completed,
      progress,
      currentValue: currentHits,
      bonusPoints
    };
  }

  /**
   * 生存時間チャレンジの評価
   *
   * @param {Object} challenge - チャレンジ
   * @param {Object} gameStats - ゲーム統計
   * @returns {Object} 評価結果
   */
  evaluateTimeSurvivalChallenge(challenge, gameStats) {
    const currentDuration = gameStats.gameDuration || 0;
    const targetDuration = challenge.target;
    const timeLimit = challenge.timeLimit;

    const completed = currentDuration >= targetDuration && currentDuration <= timeLimit;
    const progress = Math.min((currentDuration / targetDuration) * 100, 100);

    // ボーナス計算
    let bonusPoints = 0;
    if (completed) {
      // 生存時間ボーナス
      bonusPoints += Math.floor(currentDuration * 1.5);

      // 完璧な生存（目標時間ちょうど）
      const perfectSurvival = Math.abs(currentDuration - targetDuration) <= 5;
      if (perfectSurvival) {
        bonusPoints += 50;
      }
    }

    return {
      completed,
      progress,
      currentValue: currentDuration,
      bonusPoints
    };
  }

  /**
   * 特殊アクションチャレンジの評価
   *
   * @param {Object} challenge - チャレンジ
   * @param {Object} gameStats - ゲーム統計
   * @returns {Object} 評価結果
   */
  evaluateSpecialActionChallenge(challenge, gameStats) {
    const specialActions = gameStats.specialActions || [];
    const targetAction = challenge.target;
    const timeLimit = challenge.timeLimit;
    const gameDuration = gameStats.gameDuration || 0;

    let completed = false;
    let currentValue = 0;
    let progress = 0;

    // 特殊アクションの種類に応じた評価
    switch (targetAction) {
      case 'multi_ball_activated':
        completed = specialActions.includes('multi_ball_activated') && gameDuration <= timeLimit;
        currentValue = specialActions.includes('multi_ball_activated') ? 1 : 0;
        progress = completed ? 100 : 0;
        break;

      case 'powerup_collected':
        // パワーアップを3回収集
        const powerupCount = specialActions.filter(action => action === 'powerup_collected').length;
        completed = powerupCount >= 3 && gameDuration <= timeLimit;
        currentValue = powerupCount;
        progress = Math.min((powerupCount / 3) * 100, 100);
        break;

      case 'ada_difficulty_increased':
        completed = specialActions.includes('ada_difficulty_increased') && gameDuration <= timeLimit;
        currentValue = specialActions.includes('ada_difficulty_increased') ? 1 : 0;
        progress = completed ? 100 : 0;
        break;

      case 'perfect_combo':
        completed = specialActions.includes('perfect_combo') && gameDuration <= timeLimit;
        currentValue = specialActions.includes('perfect_combo') ? 1 : 0;
        progress = completed ? 100 : 0;
        break;

      default:
        // 一般的な特殊アクション
        completed = specialActions.includes(targetAction) && gameDuration <= timeLimit;
        currentValue = specialActions.includes(targetAction) ? 1 : 0;
        progress = completed ? 100 : 0;
    }

    // ボーナス計算
    let bonusPoints = 0;
    if (completed) {
      // 特殊アクションボーナス
      bonusPoints += 30;

      // 複数特殊アクションボーナス
      const uniqueActions = [...new Set(specialActions)];
      if (uniqueActions.length > 1) {
        bonusPoints += (uniqueActions.length - 1) * 10;
      }
    }

    return {
      completed,
      progress,
      currentValue,
      bonusPoints
    };
  }

  /**
   * スコアチャレンジの判定（レガシー版）
   * @param {Object} challenge - チャレンジ情報
   * @param {Object} gameResult - ゲームプレイの結果
   * @returns {boolean} - 達成したかどうか
   */
  evaluateScoreChallengeLegacy(challenge, gameResult) {
    const targetScore = challenge.goal.targetScore;
    return gameResult.score >= targetScore;
  }

  /**
   * 制限チャレンジの判定（パワーアップなしなど）
   * @param {Object} challenge - チャレンジ情報
   * @param {Object} gameResult - ゲームプレイの結果
   * @returns {boolean} - 達成したかどうか
   */
  evaluateRestrictionChallenge(challenge, gameResult) {
    const maxPowerUps = challenge.goal.maxPowerUps;
    return gameResult.powerUpsUsed <= maxPowerUps;
  }

  /**
   * 時間制限チャレンジの判定
   * @param {Object} challenge - チャレンジ情報
   * @param {Object} gameResult - ゲームプレイの結果
   * @returns {boolean} - 達成したかどうか
   */
  evaluateTimeChallenge(challenge, gameResult) {
    const maxDuration = challenge.goal.maxDuration;
    return gameResult.duration <= maxDuration;
  }

  /**
   * 複合チャレンジの判定
   * @param {Object} challenge - チャレンジ情報
   * @param {Object} gameResult - ゲームプレイの結果
   * @returns {boolean} - 達成したかどうか
   */
  evaluateCompositeChallenge(challenge, gameResult) {
    const goal = challenge.goal;

    // 全ての条件が満たされている必要がある
    let allConditionsMet = true;

    // スコア条件のチェック
    if (goal.targetScore && gameResult.score < goal.targetScore) {
      allConditionsMet = false;
    }

    // パワーアップ制限のチェック
    if (goal.maxPowerUps !== undefined && gameResult.powerUpsUsed > goal.maxPowerUps) {
      allConditionsMet = false;
    }

    // 時間制限のチェック
    if (goal.maxDuration && gameResult.duration > goal.maxDuration) {
      allConditionsMet = false;
    }

    // ポーズ制限のチェック
    if (goal.maxPauseCount !== undefined && gameResult.pauseCount > goal.maxPauseCount) {
      allConditionsMet = false;
    }

    return allConditionsMet;
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeEvaluator;
}

// ブラウザ環境でのグローバル利用
if (typeof window !== 'undefined') {
  window.ChallengeEvaluator = new ChallengeEvaluator();
}
