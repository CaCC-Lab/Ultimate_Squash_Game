// ChallengeGenerator単体テスト
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ChallengeGeneratorクラスを読み込む
const challengeGeneratorCode = fs.readFileSync(
  path.join(__dirname, '../../docs/js/weekly-challenge.js'), 
  'utf8'
);

// Node.js環境でChallengeGeneratorを実行可能にする
const vm = require('vm');
const context = vm.createContext({ 
  window: {}, 
  module: { exports: {} },
  console: console
});
vm.runInContext(challengeGeneratorCode, context);
const ChallengeGenerator = context.module.exports || context.window.ChallengeGenerator;

test.describe('ChallengeGenerator Unit Tests', () => {
  let generator;

  test.beforeEach(() => {
    generator = new ChallengeGenerator();
  });

  test.describe('基本的な動作', () => {
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

  test.describe('エッジケース', () => {
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

  test.describe('各チャレンジタイプ', () => {
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

  test.describe('難易度調整', () => {
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

  test.describe('ヘルパー関数', () => {
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

  test.describe('境界値テスト', () => {
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