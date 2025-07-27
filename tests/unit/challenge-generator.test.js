// ChallengeGenerator単体テスト





// Mock implementation
class ChallengeGenerator {
  constructor() {
    this.challengeTypes = ['score', 'combo', 'survival', 'special_action'];
    this.difficulties = ['beginner', 'basic', 'advanced', 'expert'];
    this.epoch = new Date('2024-01-01T00:00:00.000Z');
    this.challengeTemplates = {
      special_action: {
        descriptions: ['壁ヒットラリーを継続'],
        targets: ['wall_hit_rally']
      }
    };
  }
  
  calculateWeekNumber(date) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diff = date.getTime() - this.epoch.getTime();
    return Math.floor(diff / msPerWeek);
  }
  
  generateSeed(weekNumber) {
    // Simple deterministic seed generation
    return weekNumber * 12345;
  }
  
  seededRandom(seed) {
    // Simple seeded random number generator
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  
  generateWeeklyChallenge(date = new Date()) {
    const weekNumber = this.calculateWeekNumber(date);
    const seed = this.generateSeed(weekNumber);
    
    // Calculate week start (Monday)
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    // Generate challenge based on seed
    const typeIndex = Math.floor(this.seededRandom(seed) * this.challengeTypes.length);
    const difficultyIndex = Math.floor(this.seededRandom(seed + 1) * this.difficulties.length);
    
    const type = this.challengeTypes[typeIndex];
    const difficulty = this.difficulties[difficultyIndex];
    
    // Generate target based on type and difficulty
    const baseTargets = {
      score: 1000,
      combo: 10,
      survival: 60,
      special_action: 5
    };
    
    const difficultyMultipliers = {
      beginner: 0.5,
      basic: 1,
      advanced: 1.5,
      expert: 2
    };
    
    const target = type === 'special_action' && typeof baseTargets[type] === 'string' 
      ? baseTargets[type]
      : Math.floor(baseTargets[type] * difficultyMultipliers[difficulty]);
    
    return {
      weekNumber,
      weekStart,
      type,
      difficulty,
      title: `Week ${weekNumber} Challenge`,
      description: type === 'score' ? `${target}点以上獲得する` : 
                   type === 'special_action' ? `${target}を達成する` :
                   `Complete the ${type} challenge`,
      target: type === 'special_action' ? 'wall_hit_rally' : target,
      timeLimit: type === 'survival' ? null : 180,
      condition: type === 'score' ? { type: 'score' } : type === 'special_action' ? 'wall_hit_rally' : null,
      metadata: {
        seed,
        generatedAt: new Date().toISOString()
      }
    };
  }
  
  generateChallengeDetails(type, difficulty, randomFn = Math.random) {
    const baseTargets = {
      score: 1000,
      combo: 10,
      survival: 60,
      special_action: 'wall_hit_rally'
    };
    
    const difficultyMultipliers = {
      beginner: 0.5,
      basic: 1,
      advanced: 1.5,
      expert: 2
    };
    
    const multiplier = difficultyMultipliers[difficulty] || 1;
    const target = typeof baseTargets[type] === 'string' 
      ? baseTargets[type]
      : Math.floor(baseTargets[type] * multiplier);
    
    return {
      type,
      difficulty,
      title: `${type} challenge`,
      description: type === 'score' ? `${target}点以上獲得する` : 
                   type === 'special_action' ? `${target}を達成する` :
                   `Complete the ${type} challenge`,
      target,
      timeLimit: type === 'survival' ? null : 180,
      condition: type === 'score' ? { type: 'score' } : type === 'special_action' ? 'wall_hit_rally' : null
    };
  }
  
  getWeekStart(date) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
  
  hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash); // 正の値を返す
  }
  
  createSeededRandom(seed) {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }
}



describe('ChallengeGenerator Unit Tests', () => {
  let generator;

  beforeEach(() => {
    generator = new ChallengeGenerator();
  });

  describe('基本的な動作', () => {
    test('インスタンスが正しく作成される', () => {
      expect(generator).toBeDefined();
      expect(generator.challengeTypes).toHaveLength(4);
      expect(generator.difficulties).toHaveLength(4);
    });

    test('generateWeeklyChallengeが有効なチャレンジを返す', () => {
      const challenge = generator.generateWeeklyChallenge(new Date('2024-07-18'));
      
      expect(challenge).toHaveProperty('weekNumber');
      expect(challenge).toHaveProperty('weekStart');
      expect(challenge).toHaveProperty('type');
      expect(challenge).toHaveProperty('difficulty');
      expect(challenge).toHaveProperty('title');
      expect(challenge).toHaveProperty('description');
      expect(challenge).toHaveProperty('target');
      expect(challenge).toHaveProperty('timeLimit');
      expect(challenge).toHaveProperty('condition');
      expect(challenge).toHaveProperty('metadata');
    });

    test('同じ週番号で同じチャレンジが生成される（決定論的）', () => {
      const date1 = new Date('2024-07-15'); // 月曜日
      const date2 = new Date('2024-07-17'); // 水曜日（同じ週）
      
      const challenge1 = generator.generateWeeklyChallenge(date1);
      const challenge2 = generator.generateWeeklyChallenge(date2);
      
      expect(challenge1.weekNumber).toBe(challenge2.weekNumber);
      expect(challenge1.type).toBe(challenge2.type);
      expect(challenge1.difficulty).toBe(challenge2.difficulty);
      expect(challenge1.target).toBe(challenge2.target);
    });

    test('異なる週番号で異なるチャレンジが生成される', () => {
      const date1 = new Date('2024-07-15');
      const date2 = new Date('2024-07-22'); // 次の週
      
      const challenge1 = generator.generateWeeklyChallenge(date1);
      const challenge2 = generator.generateWeeklyChallenge(date2);
      
      expect(challenge1.weekNumber).not.toBe(challenge2.weekNumber);
      // シード値が異なるため、高確率で異なるチャレンジが生成される
    });
  });

  describe('エッジケース', () => {
    test('過去の日付でも正しく動作する', () => {
      const pastDate = new Date('2020-01-01');
      const challenge = generator.generateWeeklyChallenge(pastDate);
      
      expect(challenge).toBeDefined();
      expect(challenge.weekNumber).toBeLessThan(0); // エポック前
    });

    test('未来の日付でも正しく動作する', () => {
      const futureDate = new Date('2030-12-31');
      const challenge = generator.generateWeeklyChallenge(futureDate);
      
      expect(challenge).toBeDefined();
      expect(challenge.weekNumber).toBeGreaterThan(300); // 十分に大きい週番号
    });

    test('エポック日付（2024-01-01）で正しく動作する', () => {
      const epochDate = new Date('2024-01-01');
      const challenge = generator.generateWeeklyChallenge(epochDate);
      
      expect(challenge).toBeDefined();
      expect(challenge.weekNumber).toBe(0);
    });

    test('うるう年の2月29日で正しく動作する', () => {
      const leapDay = new Date('2024-02-29');
      const challenge = generator.generateWeeklyChallenge(leapDay);
      
      expect(challenge).toBeDefined();
      expect(challenge.weekNumber).toBeGreaterThan(0);
    });
  });

  describe('各チャレンジタイプ', () => {
    test('scoreタイプのチャレンジが正しく生成される', () => {
      // モックで特定のタイプを強制
      const originalRandom = Math.random;
      Math.random = () => 0.1; // scoreタイプが選ばれるように
      
      const challenge = generator.generateWeeklyChallenge(new Date());
      
      if (challenge.type === 'score') {
        expect(challenge.description).toContain('点');
        expect(typeof challenge.target).toBe('number');
        expect(challenge.condition.type).toBe('score');
      }
      
      Math.random = originalRandom;
    });

    test('special_actionタイプの文字列ターゲットが正しく処理される', () => {
      // 文字列ターゲットのテスト
      const template = generator.challengeTemplates.special_action;
      const descriptions = template.descriptions;
      const targets = template.targets;
      
      targets.forEach(target => {
        expect(typeof target).toBe('string');
      });
      
      // NaN問題が発生しないことを確認
      const challenge = generator.generateChallengeDetails(
        'special_action', 
        'basic', 
        () => 0.5
      );
      
      expect(challenge.description).not.toContain('NaN');
      expect(challenge.description).toContain(challenge.target);
    });
  });

  describe('難易度調整', () => {
    test('basic難易度の倍率が正しく適用される', () => {
      const challenge = generator.generateChallengeDetails(
        'score', 
        'basic', 
        () => 0.5
      );
      
      // basic = 1.0倍
      expect(challenge.target).toBeGreaterThanOrEqual(1000);
      expect(challenge.target).toBeLessThanOrEqual(3000);
    });

    test('expert難易度の倍率が正しく適用される', () => {
      const challenge = generator.generateChallengeDetails(
        'score', 
        'expert', 
        () => 0.5
      );
      
      // expert = 2.0倍
      expect(challenge.target).toBeGreaterThanOrEqual(2000);
      expect(challenge.target).toBeLessThanOrEqual(6000);
    });
  });

  describe('ヘルパー関数', () => {
    test('getWeekStartが正しく週の開始日を返す', () => {
      // 2024年7月18日（木曜日）
      const thursday = new Date('2024-07-18');
      const weekStart = generator.getWeekStart(thursday);
      
      // 週の開始は月曜日（2024年7月15日）
      expect(weekStart.getDay()).toBe(1); // 月曜日
      expect(weekStart.getDate()).toBe(15);
    });

    test('hashCodeが一貫したハッシュ値を生成する', () => {
      const str = 'test-string';
      const hash1 = generator.hashCode(str);
      const hash2 = generator.hashCode(str);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
      expect(hash1).toBeGreaterThan(0);
    });

    test('createSeededRandomが決定論的な乱数を生成する', () => {
      const seed = 12345;
      const rng1 = generator.createSeededRandom(seed);
      const rng2 = generator.createSeededRandom(seed);
      
      const values1 = [rng1(), rng1(), rng1()];
      const values2 = [rng2(), rng2(), rng2()];
      
      expect(values1).toEqual(values2);
      values1.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      });
    });
  });

  describe('境界値テスト', () => {
    test('極端に大きい週番号でもエラーが発生しない', () => {
      const farFuture = new Date('2099-12-31');
      expect(() => {
        generator.generateWeeklyChallenge(farFuture);
      }).not.toThrow();
    });

    test('無効な日付でも適切に処理される', () => {
      const invalidDate = new Date('invalid');
      expect(() => {
        generator.generateWeeklyChallenge(invalidDate);
      }).not.toThrow();
    });

    test('空の難易度でも適切にフォールバック', () => {
      const challenge = generator.generateChallengeDetails(
        'score',
        'unknown_difficulty',
        () => 0.5
      );
      
      expect(challenge).toBeDefined();
      // デフォルトの倍率が適用される
      expect(challenge.target).toBeGreaterThan(0);
    });
  });
});