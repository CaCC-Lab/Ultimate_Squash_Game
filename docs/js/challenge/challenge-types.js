/**
 * 週替わりチャレンジのタイプシステム
 * 様々な種類のチャレンジを定義し、達成条件を管理します
 */

/**
 * チャレンジタイプクラス
 * 各チャレンジの種類、目標、制限事項を定義します
 */
export class ChallengeType {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.type = config.type;
    this.target = config.target || null;
    this.timeLimit = config.timeLimit || null;
    this.restrictions = config.restrictions || [];
    this.conditions = config.conditions || [];
  }

  /**
   * チャレンジの完了条件を確認します
   * @param {Object} gameState 現在のゲーム状態
   * @returns {boolean} 完了したかどうか
   */
  checkCompletion(gameState) {
    switch (this.type) {
      case 'SCORE_TARGET':
        return gameState.score >= this.target;

      case 'TIME_LIMIT':
        return gameState.score >= this.target &&
               gameState.elapsedTime <= this.timeLimit;

      case 'RESTRICTION':
        // 制限付きチャレンジは、違反がなく目標スコアを達成した場合に完了
        return gameState.score >= this.target && !this.hasViolations;

      case 'COMBO':
        // 複合条件チャレンジは、すべての条件を満たした場合に完了
        return this.conditions.every(condition =>
          this.checkCondition(condition, gameState)
        );

      default:
        return false;
    }
  }

  /**
   * 制限事項の違反をチェックします
   * @param {Object} action 実行されたアクション
   * @returns {boolean} 違反があったかどうか
   */
  checkViolation(action) {
    if (this.type !== 'RESTRICTION') {
      return false;
    }

    // アクションタイプと制限のマッピング
    const violationMap = {
      'POWERUP_USED': 'NO_POWERUPS',
      'GAME_PAUSED': 'NO_PAUSE'
    };

    const restriction = violationMap[action.action];
    if (restriction && this.restrictions.includes(restriction)) {
      this.hasViolations = true;
      return true;
    }

    return false;
  }

  /**
   * チャレンジの進捗率を計算します
   * @param {Object} gameState 現在のゲーム状態
   * @returns {number} 進捗率（0-100）
   */
  getProgress(gameState) {
    switch (this.type) {
      case 'SCORE_TARGET':
      case 'RESTRICTION':
        if (!this.target) return 0;
        const progress = (gameState.score / this.target) * 100;
        return Math.min(progress, 100);

      case 'TIME_LIMIT':
        if (!this.target) return 0;
        const scoreProgress = (gameState.score / this.target) * 100;
        return Math.min(scoreProgress, 100);

      case 'COMBO':
        if (this.conditions.length === 0) return 0;
        const conditionProgress = this.conditions.map(condition =>
          this.getConditionProgress(condition, gameState)
        );
        const averageProgress = conditionProgress.reduce((a, b) => a + b, 0) / conditionProgress.length;
        return Math.min(averageProgress, 100);

      default:
        return 0;
    }
  }

  /**
   * 個別の条件をチェックします
   * @private
   */
  checkCondition(condition, gameState) {
    switch (condition.type) {
      case 'SCORE':
        return gameState.score >= condition.target;
      case 'CONSECUTIVE_HITS':
        return gameState.consecutiveHits >= condition.target;
      default:
        return false;
    }
  }

  /**
   * 個別の条件の進捗を計算します
   * @private
   */
  getConditionProgress(condition, gameState) {
    switch (condition.type) {
      case 'SCORE':
        return (gameState.score / condition.target) * 100;
      case 'CONSECUTIVE_HITS':
        return (gameState.consecutiveHits / condition.target) * 100;
      default:
        return 0;
    }
  }
}

/**
 * チャレンジファクトリークラス
 * 週番号に基づいてプロシージャルにチャレンジを生成します
 */
export class ChallengeFactory {
  constructor() {
    // チャレンジタイプのプール
    this.challengeTypes = [
      'SCORE_TARGET',
      'TIME_LIMIT',
      'RESTRICTION',
      'COMBO'
    ];

    // 制限のプール
    this.restrictions = [
      'NO_POWERUPS',
      'NO_PAUSE',
      'NO_MISS'
    ];

    // 基本難易度設定
    this.baseDifficulty = {
      scoreTarget: 500,
      timeLimit: 120000, // 2分
      difficultyMultiplier: 1.1 // 週ごとの難易度上昇率
    };
  }

  /**
   * 週番号に基づいてチャレンジを生成します
   * @param {number} weekNumber 週番号
   * @returns {ChallengeType} 生成されたチャレンジ
   */
  createChallenge(weekNumber) {
    // 週番号からシード値を生成（決定論的）
    const seed = this.generateSeed(weekNumber);

    // チャレンジタイプを決定
    const typeIndex = this.pseudoRandom(seed) % this.challengeTypes.length;
    const challengeType = this.challengeTypes[typeIndex];

    // 難易度を計算
    const difficulty = this.calculateDifficulty(weekNumber);

    // チャレンジを生成
    return this.generateChallengeByType(challengeType, weekNumber, seed, difficulty);
  }

  /**
   * シード値を生成します
   * @private
   */
  generateSeed(weekNumber) {
    // 週番号に基づく決定論的なシード
    return weekNumber * 12345 % 100000;
  }

  /**
   * 擬似乱数を生成します
   * @private
   */
  pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return Math.floor(Math.abs(x));
  }

  /**
   * 週番号に基づいて難易度を計算します
   * @private
   */
  calculateDifficulty(weekNumber) {
    // 週が進むごとに難易度が上昇
    return Math.pow(this.baseDifficulty.difficultyMultiplier, weekNumber - 1);
  }

  /**
   * タイプ別にチャレンジを生成します
   * @private
   */
  generateChallengeByType(type, weekNumber, seed, difficulty) {
    const baseScore = Math.floor(this.baseDifficulty.scoreTarget * difficulty);

    switch (type) {
      case 'SCORE_TARGET':
        return new ChallengeType({
          id: `weekly-challenge-${weekNumber}-score`,
          name: `スコアチャレンジ #${weekNumber}`,
          description: `${baseScore}点以上を獲得しよう！`,
          type: 'SCORE_TARGET',
          target: baseScore
        });

      case 'TIME_LIMIT':
        const timeLimit = Math.max(60000, this.baseDifficulty.timeLimit - (weekNumber * 5000));
        return new ChallengeType({
          id: `weekly-challenge-${weekNumber}-time`,
          name: `タイムアタックチャレンジ #${weekNumber}`,
          description: `${timeLimit / 1000}秒以内に${Math.floor(baseScore * 0.8)}点を獲得！`,
          type: 'TIME_LIMIT',
          timeLimit: timeLimit,
          target: Math.floor(baseScore * 0.8)
        });

      case 'RESTRICTION':
        const restrictionIndex = this.pseudoRandom(seed + 1) % this.restrictions.length;
        const restriction = this.restrictions[restrictionIndex];
        return new ChallengeType({
          id: `weekly-challenge-${weekNumber}-restrict`,
          name: `制限チャレンジ #${weekNumber}`,
          description: this.getRestrictionDescription(restriction, Math.floor(baseScore * 0.6)),
          type: 'RESTRICTION',
          restrictions: [restriction],
          target: Math.floor(baseScore * 0.6)
        });

      case 'COMBO':
        return new ChallengeType({
          id: `weekly-challenge-${weekNumber}-combo`,
          name: `コンボチャレンジ #${weekNumber}`,
          description: '複数の条件を同時に達成！',
          type: 'COMBO',
          conditions: [
            { type: 'SCORE', target: Math.floor(baseScore * 0.7) },
            { type: 'CONSECUTIVE_HITS', target: Math.min(10 + weekNumber, 30) }
          ]
        });

      default:
        // フォールバック
        return this.generateChallengeByType('SCORE_TARGET', weekNumber, seed, difficulty);
    }
  }

  /**
   * 制限の説明文を取得します
   * @private
   */
  getRestrictionDescription(restriction, targetScore) {
    const descriptions = {
      'NO_POWERUPS': `パワーアップなしで${targetScore}点を獲得！`,
      'NO_PAUSE': `一時停止なしで${targetScore}点を獲得！`,
      'NO_MISS': `ノーミスで${targetScore}点を獲得！`
    };
    return descriptions[restriction] || `${targetScore}点を獲得！`;
  }
}
