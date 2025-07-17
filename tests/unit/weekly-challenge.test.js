import { WeeklyChallenge, calculateWeekNumber } from '../../docs/js/weekly-challenge.js';

describe('WeeklyChallenge', () => {
  describe('基本機能', () => {
    test('インスタンスを作成できる', () => {
      const challenge = new WeeklyChallenge();
      expect(challenge).toBeDefined();
      expect(challenge).toBeInstanceOf(WeeklyChallenge);
    });
  });

  // 1. 週番号の計算に関するテスト
  describe('週番号の計算 (Week Number Calculation)', () => {
    const epoch = new Date('2024-01-01T00:00:00.000Z'); // 起算日（月曜日）

    test('起算日当日は「1週目」として計算される', () => {
      const date = new Date('2024-01-01T10:00:00.000Z');
      expect(calculateWeekNumber(date, epoch)).toBe(1);
    });

    test('1週目の最終日（日曜日）は「1週目」として計算される', () => {
      const date = new Date('2024-01-07T23:59:59.999Z');
      expect(calculateWeekNumber(date, epoch)).toBe(1);
    });

    test('2週目の初日（月曜日）は「2週目」として計算される', () => {
      const date = new Date('2024-01-08T00:00:00.000Z');
      expect(calculateWeekNumber(date, epoch)).toBe(2);
    });

    test('起算日より前の日付は「0」を返す', () => {
      const date = new Date('2023-12-31T23:59:59.999Z');
      expect(calculateWeekNumber(date, epoch)).toBe(0);
    });
  });

  // 2. シード値の生成に関するテスト
  describe('シード値の生成 (Seed Generation)', () => {
    test('同じ週番号からは常に同じシード値が生成される（再現性）', () => {
      const challenge1 = new WeeklyChallenge(new Date('2024-01-01'));
      const challenge2 = new WeeklyChallenge(new Date('2024-01-02'));
      expect(challenge1.getSeed()).toBe(challenge2.getSeed());
    });

    test('異なる週番号からは異なるシード値が生成される', () => {
      const challengeWeek1 = new WeeklyChallenge(new Date('2024-01-01'));
      const challengeWeek2 = new WeeklyChallenge(new Date('2024-01-08'));
      expect(challengeWeek1.getSeed()).not.toBe(challengeWeek2.getSeed());
    });

    test('起算日前の週（週番号0）ではシード値が0である', () => {
      const challenge = new WeeklyChallenge(new Date('2023-12-31'));
      expect(challenge.getSeed()).toBe(0);
    });
  });

  // 3. レベルパラメータの生成に関するテスト
  describe('レベルパラメータの生成 (Level Parameter Generation)', () => {
    test('同じシード値（同じ週）からは常に同じパラメータが生成される', () => {
      const challenge1 = new WeeklyChallenge(new Date('2024-01-10')); // 2週目
      const challenge2 = new WeeklyChallenge(new Date('2024-01-12')); // 2週目
      const params1 = challenge1.getLevelParameters();
      const params2 = challenge2.getLevelParameters();
      expect(params1).toEqual(params2);
    });

    test('異なるシード値（異なる週）からは異なるパラメータが生成される', () => {
      const challengeWeek1 = new WeeklyChallenge(new Date('2024-01-01'));
      const challengeWeek2 = new WeeklyChallenge(new Date('2024-01-08'));
      const params1 = challengeWeek1.getLevelParameters();
      const params2 = challengeWeek2.getLevelParameters();
      expect(params1).not.toEqual(params2);
    });

    test('生成されるパラメータが妥当な範囲内であること', () => {
      const challenge = new WeeklyChallenge(new Date('2024-01-15')); // 3週目
      const params = challenge.getLevelParameters();
      expect(params.ballSpeed).toBeGreaterThanOrEqual(5);
      expect(params.ballSpeed).toBeLessThanOrEqual(10);
      expect(params.paddleSize).toBeGreaterThanOrEqual(50);
      expect(params.paddleSize).toBeLessThanOrEqual(100);
    });
  });

  // 4. チャレンジの識別情報に関するテスト
  describe('チャレンジの識別情報 (Challenge Identification)', () => {
    test('特定の週に対する正しいID、開始日、終了日が生成される', () => {
      // 3週目: 2024-01-15 ~ 2024-01-21
      const dateInWeek3 = new Date('2024-01-16T12:00:00.000Z');
      const challenge = new WeeklyChallenge(dateInWeek3);
      const info = challenge.getChallengeInfo();

      const expectedStartDate = new Date('2024-01-15T00:00:00.000Z');
      const expectedEndDate = new Date('2024-01-21T00:00:00.000Z');

      expect(info.id).toBe('weekly-challenge-3');
      expect(info.startDate).toEqual(expectedStartDate);
      expect(info.endDate).toEqual(expectedEndDate);
    });

    test('1週目の情報が正しく生成される', () => {
      const dateInWeek1 = new Date('2024-01-01T00:00:00.000Z');
      const challenge = new WeeklyChallenge(dateInWeek1);
      const info = challenge.getChallengeInfo();

      const expectedStartDate = new Date('2024-01-01T00:00:00.000Z');
      const expectedEndDate = new Date('2024-01-07T00:00:00.000Z');

      expect(info.id).toBe('weekly-challenge-1');
      expect(info.startDate).toEqual(expectedStartDate);
      expect(info.endDate).toEqual(expectedEndDate);
    });
    
    test('起算日より前の日付ではnullを返す', () => {
      const invalidDate = new Date('2023-12-31');
      const challenge = new WeeklyChallenge(invalidDate);
      const info = challenge.getChallengeInfo();
      expect(info).toBeNull();
    });
  });
});