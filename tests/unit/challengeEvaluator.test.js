/**
 * ChallengeEvaluator Unit Tests
 * チャレンジ達成判定のロジックをテストします
 */

// Mock implementation
class ChallengeEvaluator {
  constructor() {
    this.evaluations = [];
  }
  
  evaluate(challenge, gameResult) {
    const result = {
      challengeId: challenge.id,
      passed: false,
      progress: 0,
      message: ''
    };
    
    switch (challenge.type) {
      case 'score':
        if (gameResult.score === undefined) {
          throw new Error('Invalid game result: missing score');
        }
        const targetScore = challenge.goal.targetScore;
        result.passed = gameResult.score >= targetScore;
        result.progress = Math.min(100, (gameResult.score / targetScore) * 100);
        result.message = `Score: ${gameResult.score}/${targetScore}`;
        break;
        
      case 'time':
        if (gameResult.duration === undefined) {
          throw new Error('Invalid game result: missing duration');
        }
        const maxDuration = challenge.goal.maxDuration;
        result.passed = gameResult.duration <= maxDuration;
        result.progress = Math.min(100, ((maxDuration - gameResult.duration) / maxDuration) * 100);
        result.message = `Time: ${gameResult.duration}s/${maxDuration}s`;
        break;
        
      case 'restriction':
        if (gameResult.powerUpsUsed === undefined) {
          throw new Error('Invalid game result: missing powerUpsUsed');
        }
        const maxPowerUps = challenge.goal.maxPowerUps;
        result.passed = gameResult.powerUpsUsed <= maxPowerUps;
        result.message = `PowerUps: ${gameResult.powerUpsUsed}/${maxPowerUps}`;
        break;
        
      case 'composite':
        // 複合チャレンジ：すべての条件を満たす必要がある
        let allConditionsMet = true;
        
        if (challenge.goal.targetScore !== undefined) {
          if (gameResult.score === undefined) {
            throw new Error('Invalid game result: missing score');
          }
          allConditionsMet = allConditionsMet && (gameResult.score >= challenge.goal.targetScore);
        }
        
        if (challenge.goal.maxPowerUps !== undefined) {
          if (gameResult.powerUpsUsed === undefined) {
            throw new Error('Invalid game result: missing powerUpsUsed');
          }
          allConditionsMet = allConditionsMet && (gameResult.powerUpsUsed <= challenge.goal.maxPowerUps);
        }
        
        result.passed = allConditionsMet;
        result.message = 'Composite challenge';
        break;
        
      default:
        throw new Error(`Unknown challenge type: ${challenge.type}`);
    }
    
    this.evaluations.push(result);
    return result.passed;
  }
  
  getLastEvaluation() {
    return this.evaluations[this.evaluations.length - 1];
  }
  
  reset() {
    this.evaluations = [];
  }
}

describe('ChallengeEvaluator', () => {
  let challengeEvaluator;
  
  beforeEach(() => {
    challengeEvaluator = new ChallengeEvaluator();
  });

  describe('スコア達成チャレンジ', () => {
    test('should return true when score meets target', () => {
      // Given: スコア3000達成のチャレンジ
      const challenge = {
        id: 'score_3000',
        type: 'score',
        description: '3000点を達成しよう',
        goal: { targetScore: 3000 }
      };

      // When: 5000点のプレイ結果
      const gameResult = {
        score: 5000,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: チャレンジ達成と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(true);
    });

    test('should return false when score does not meet target', () => {
      // Given: スコア3000達成のチャレンジ
      const challenge = {
        id: 'score_3000',
        type: 'score',
        description: '3000点を達成しよう',
        goal: { targetScore: 3000 }
      };

      // When: 1000点のプレイ結果
      const gameResult = {
        score: 1000,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: チャレンジ失敗と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(false);
    });

    test('should return true when score exactly meets target', () => {
      // Given: スコア3000達成のチャレンジ
      const challenge = {
        id: 'score_3000',
        type: 'score',
        description: '3000点を達成しよう',
        goal: { targetScore: 3000 }
      };

      // When: 丁度3000点のプレイ結果
      const gameResult = {
        score: 3000,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: チャレンジ達成と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(true);
    });
  });

  describe('パワーアップなしチャレンジ', () => {
    test('should return true when no power-ups used', () => {
      // Given: パワーアップなしでプレイのチャレンジ
      const challenge = {
        id: 'no_powerups',
        type: 'restriction',
        description: 'パワーアップを使わずにプレイしよう',
        goal: { maxPowerUps: 0 }
      };

      // When: パワーアップを使用しないプレイ結果
      const gameResult = {
        score: 2000,
        duration: 120,
        powerUpsUsed: 0,
        pauseCount: 1
      };

      // Then: チャレンジ達成と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(true);
    });

    test('should return false when power-ups used', () => {
      // Given: パワーアップなしでプレイのチャレンジ
      const challenge = {
        id: 'no_powerups',
        type: 'restriction',
        description: 'パワーアップを使わずにプレイしよう',
        goal: { maxPowerUps: 0 }
      };

      // When: パワーアップを使用したプレイ結果
      const gameResult = {
        score: 2000,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: チャレンジ失敗と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(false);
    });
  });

  describe('時間制限チャレンジ', () => {
    test('should return true when completed within time limit', () => {
      // Given: 60秒以内でクリアのチャレンジ
      const challenge = {
        id: 'time_limit_60',
        type: 'time',
        description: '60秒以内でクリアしよう',
        goal: { maxDuration: 60 }
      };

      // When: 45秒でクリアしたプレイ結果
      const gameResult = {
        score: 2000,
        duration: 45,
        powerUpsUsed: 1,
        pauseCount: 0
      };

      // Then: チャレンジ達成と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(true);
    });

    test('should return false when time limit exceeded', () => {
      // Given: 60秒以内でクリアのチャレンジ
      const challenge = {
        id: 'time_limit_60',
        type: 'time',
        description: '60秒以内でクリアしよう',
        goal: { maxDuration: 60 }
      };

      // When: 75秒でクリアしたプレイ結果
      const gameResult = {
        score: 2000,
        duration: 75,
        powerUpsUsed: 1,
        pauseCount: 0
      };

      // Then: チャレンジ失敗と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(false);
    });
  });

  describe('複合チャレンジ', () => {
    test('should return true when all conditions are met', () => {
      // Given: 3000点をパワーアップなしで達成のチャレンジ
      const challenge = {
        id: 'score_3000_no_powerups',
        type: 'composite',
        description: '3000点をパワーアップなしで達成しよう',
        goal: { 
          targetScore: 3000,
          maxPowerUps: 0
        }
      };

      // When: 条件を満たすプレイ結果
      const gameResult = {
        score: 3500,
        duration: 120,
        powerUpsUsed: 0,
        pauseCount: 1
      };

      // Then: チャレンジ達成と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(true);
    });

    test('should return false when only one condition is met', () => {
      // Given: 3000点をパワーアップなしで達成のチャレンジ
      const challenge = {
        id: 'score_3000_no_powerups',
        type: 'composite',
        description: '3000点をパワーアップなしで達成しよう',
        goal: { 
          targetScore: 3000,
          maxPowerUps: 0
        }
      };

      // When: スコアは達成だがパワーアップを使用したプレイ結果
      const gameResult = {
        score: 3500,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: チャレンジ失敗と判定される
      const result = challengeEvaluator.evaluate(challenge, gameResult);
      expect(result).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    test('should handle invalid challenge type', () => {
      // Given: 無効なチャレンジタイプ
      const challenge = {
        id: 'invalid_challenge',
        type: 'invalid',
        description: '無効なチャレンジ',
        goal: { targetScore: 3000 }
      };

      // When: 正常なプレイ結果
      const gameResult = {
        score: 5000,
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
      };

      // Then: エラーがスローされる
      expect(() => {
        challengeEvaluator.evaluate(challenge, gameResult);
      }).toThrow('Unknown challenge type: invalid');
    });

    test('should handle missing game result data', () => {
      // Given: 正常なチャレンジ
      const challenge = {
        id: 'score_3000',
        type: 'score',
        description: '3000点を達成しよう',
        goal: { targetScore: 3000 }
      };

      // When: 不完全なプレイ結果
      const gameResult = {
        duration: 120,
        powerUpsUsed: 2,
        pauseCount: 1
        // scoreが欠落
      };

      // Then: エラーがスローされる
      expect(() => {
        challengeEvaluator.evaluate(challenge, gameResult);
      }).toThrow('Invalid game result: missing score');
    });
  });
});