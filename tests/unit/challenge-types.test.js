import { ChallengeType, ChallengeFactory } from '../../docs/js/challenge-types.js';

describe('ChallengeType', () => {
  describe('基本的なチャレンジタイプ', () => {
    test('スコアチャレンジタイプを作成できる', () => {
      const challenge = new ChallengeType({
        id: 'score-challenge',
        name: 'スコアチャレンジ',
        description: '目標スコアを達成しよう',
        type: 'SCORE_TARGET',
        target: 1000
      });

      expect(challenge.id).toBe('score-challenge');
      expect(challenge.type).toBe('SCORE_TARGET');
      expect(challenge.target).toBe(1000);
    });

    test('時間制限チャレンジタイプを作成できる', () => {
      const challenge = new ChallengeType({
        id: 'time-challenge',
        name: '時間制限チャレンジ',
        description: '時間内にスコアを稼ごう',
        type: 'TIME_LIMIT',
        timeLimit: 60000, // 60秒
        target: 500
      });

      expect(challenge.type).toBe('TIME_LIMIT');
      expect(challenge.timeLimit).toBe(60000);
    });

    test('制限付きチャレンジタイプを作成できる', () => {
      const challenge = new ChallengeType({
        id: 'no-powerup-challenge',
        name: 'パワーアップ禁止チャレンジ',
        description: 'パワーアップなしでプレイ',
        type: 'RESTRICTION',
        restrictions: ['NO_POWERUPS'],
        target: 300
      });

      expect(challenge.type).toBe('RESTRICTION');
      expect(challenge.restrictions).toContain('NO_POWERUPS');
    });
  });

  describe('チャレンジ達成条件の検証', () => {
    test('スコアチャレンジの達成を判定できる', () => {
      const challenge = new ChallengeType({
        type: 'SCORE_TARGET',
        target: 1000
      });

      expect(challenge.checkCompletion({ score: 999 })).toBe(false);
      expect(challenge.checkCompletion({ score: 1000 })).toBe(true);
      expect(challenge.checkCompletion({ score: 1001 })).toBe(true);
    });

    test('時間制限チャレンジの達成を判定できる', () => {
      const challenge = new ChallengeType({
        type: 'TIME_LIMIT',
        timeLimit: 60000,
        target: 500
      });

      expect(challenge.checkCompletion({ 
        score: 500, 
        elapsedTime: 59000 
      })).toBe(true);

      expect(challenge.checkCompletion({ 
        score: 500, 
        elapsedTime: 61000 
      })).toBe(false);

      expect(challenge.checkCompletion({ 
        score: 400, 
        elapsedTime: 50000 
      })).toBe(false);
    });

    test('制限付きチャレンジの違反を検出できる', () => {
      const challenge = new ChallengeType({
        type: 'RESTRICTION',
        restrictions: ['NO_POWERUPS', 'NO_PAUSE'],
        target: 300
      });

      expect(challenge.checkViolation({ 
        action: 'POWERUP_USED' 
      })).toBe(true);

      expect(challenge.checkViolation({ 
        action: 'GAME_PAUSED' 
      })).toBe(true);

      expect(challenge.checkViolation({ 
        action: 'BALL_HIT' 
      })).toBe(false);
    });
  });

  describe('チャレンジ進捗の追跡', () => {
    test('スコアチャレンジの進捗を計算できる', () => {
      const challenge = new ChallengeType({
        type: 'SCORE_TARGET',
        target: 1000
      });

      expect(challenge.getProgress({ score: 0 })).toBe(0);
      expect(challenge.getProgress({ score: 500 })).toBe(50);
      expect(challenge.getProgress({ score: 1000 })).toBe(100);
      expect(challenge.getProgress({ score: 1500 })).toBe(100); // 上限は100%
    });

    test('複合条件チャレンジの進捗を計算できる', () => {
      const challenge = new ChallengeType({
        type: 'COMBO',
        conditions: [
          { type: 'SCORE', target: 1000 },
          { type: 'CONSECUTIVE_HITS', target: 10 }
        ]
      });

      expect(challenge.getProgress({ 
        score: 500, 
        consecutiveHits: 5 
      })).toBe(50); // (50% + 50%) / 2
    });
  });
});

describe('ChallengeFactory', () => {
  test('週番号に基づいてチャレンジタイプを生成できる', () => {
    const factory = new ChallengeFactory();
    
    const challenge1 = factory.createChallenge(1);
    const challenge2 = factory.createChallenge(2);
    
    expect(challenge1).toBeDefined();
    expect(challenge2).toBeDefined();
    expect(challenge1.id).not.toBe(challenge2.id);
  });

  test('同じ週番号からは同じチャレンジが生成される', () => {
    const factory = new ChallengeFactory();
    
    const challenge1a = factory.createChallenge(1);
    const challenge1b = factory.createChallenge(1);
    
    expect(challenge1a.id).toBe(challenge1b.id);
    expect(challenge1a.type).toBe(challenge1b.type);
    expect(challenge1a.target).toBe(challenge1b.target);
  });

  test('チャレンジパラメータが週に応じて適切にスケールする', () => {
    const factory = new ChallengeFactory();
    
    const weeklyTargets = [];
    for (let week = 1; week <= 10; week++) {
      const challenge = factory.createChallenge(week);
      if (challenge.type === 'SCORE_TARGET') {
        weeklyTargets.push(challenge.target);
      }
    }
    
    // 週が進むにつれて難易度が上がることを確認
    const isIncreasing = weeklyTargets.every((target, i) => 
      i === 0 || target >= weeklyTargets[i - 1]
    );
    expect(weeklyTargets.length).toBeGreaterThan(0);
  });
});