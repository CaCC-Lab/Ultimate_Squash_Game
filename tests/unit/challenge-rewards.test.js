import { RewardSystem, Badge, Achievement } from '../../docs/js/challenge-rewards.js';

describe('Badge', () => {
  test('バッジを作成できる', () => {
    const badge = new Badge({
      id: 'first-challenge',
      name: '初めてのチャレンジ',
      description: '初めて週替わりチャレンジをクリア',
      icon: '🏆',
      rarity: 'COMMON'
    });

    expect(badge.id).toBe('first-challenge');
    expect(badge.rarity).toBe('COMMON');
    expect(badge.icon).toBe('🏆');
  });

  test('バッジのレアリティレベルが正しく設定される', () => {
    const commonBadge = new Badge({ rarity: 'COMMON' });
    const rareBadge = new Badge({ rarity: 'RARE' });
    const epicBadge = new Badge({ rarity: 'EPIC' });
    const legendaryBadge = new Badge({ rarity: 'LEGENDARY' });

    expect(commonBadge.getRarityValue()).toBe(1);
    expect(rareBadge.getRarityValue()).toBe(2);
    expect(epicBadge.getRarityValue()).toBe(3);
    expect(legendaryBadge.getRarityValue()).toBe(4);
  });
});

describe('Achievement', () => {
  test('実績を作成できる', () => {
    const achievement = new Achievement({
      id: 'week-1-master',
      challengeId: 'weekly-challenge-1',
      condition: 'COMPLETE',
      earnedAt: new Date('2024-01-05')
    });

    expect(achievement.id).toBe('week-1-master');
    expect(achievement.challengeId).toBe('weekly-challenge-1');
    expect(achievement.earnedAt).toEqual(new Date('2024-01-05'));
  });
});

describe('RewardSystem', () => {
  let rewardSystem;

  beforeEach(() => {
    rewardSystem = new RewardSystem();
    // localStorageのモック
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  describe('チャレンジ完了時の報酬', () => {
    test('初回チャレンジ完了でバッジを獲得できる', () => {
      const result = rewardSystem.processChallengeClear({
        challengeId: 'weekly-challenge-1',
        score: 1000,
        isFirstClear: true
      });

      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].id).toBe('first-challenge');
      expect(result.newAchievements).toHaveLength(1);
    });

    test('高スコアでレアバッジを獲得できる', () => {
      const result = rewardSystem.processChallengeClear({
        challengeId: 'weekly-challenge-1',
        score: 5000,
        isHighScore: true,
        percentile: 1 // トップ1%
      });

      const rareBadge = result.badges.find(b => b.rarity === 'EPIC' || b.rarity === 'LEGENDARY');
      expect(rareBadge).toBeDefined();
    });

    test('連続クリアでストリークバッジを獲得できる', () => {
      // 3週連続クリアをシミュレート
      for (let week = 1; week <= 2; week++) {
        rewardSystem.processChallengeClear({
          challengeId: `weekly-challenge-${week}`,
          score: 1000
        });
      }

      const result = rewardSystem.processChallengeClear({
        challengeId: 'weekly-challenge-3',
        score: 1000
      });

      const streakBadge = result.badges.find(b => b.id.includes('streak'));
      expect(streakBadge).toBeDefined();
    });
  });

  describe('実績の管理', () => {
    test('実績を保存・読み込みできる', () => {
      const achievement = new Achievement({
        id: 'test-achievement',
        challengeId: 'weekly-challenge-1',
        earnedAt: new Date()
      });

      rewardSystem.saveAchievement(achievement);
      expect(Storage.prototype.setItem).toHaveBeenCalled();

      Storage.prototype.getItem.mockReturnValue(JSON.stringify([achievement]));
      const loaded = rewardSystem.loadAchievements();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-achievement');
    });

    test('実績の統計を取得できる', () => {
      const achievements = [
        { id: 'ach1', earnedAt: new Date('2024-01-01'), challengeId: 'weekly-challenge-1', condition: 'COMPLETE' },
        { id: 'ach2', earnedAt: new Date('2024-01-08'), challengeId: 'weekly-challenge-2', condition: 'COMPLETE' },
        { id: 'ach3', earnedAt: new Date('2024-01-15'), challengeId: 'weekly-challenge-3', condition: 'COMPLETE' }
      ];

      // モックを設定してから新しいインスタンスを作成
      Storage.prototype.getItem.mockReturnValue(JSON.stringify(achievements));
      const newRewardSystem = new RewardSystem();
      const stats = newRewardSystem.getAchievementStats();

      expect(stats.totalAchievements).toBe(3);
      expect(stats.weeklyStreak).toBe(3);
      expect(stats.lastAchievementDate).toEqual(new Date('2024-01-15'));
    });
  });

  describe('バッジの条件判定', () => {
    test('パーフェクトクリアバッジの条件を判定できる', () => {
      const isPerfect = rewardSystem.checkPerfectClear({
        missCount: 0,
        powerupsUsed: 0,
        pauseCount: 0
      });

      expect(isPerfect).toBe(true);

      const notPerfect = rewardSystem.checkPerfectClear({
        missCount: 1,
        powerupsUsed: 0,
        pauseCount: 0
      });

      expect(notPerfect).toBe(false);
    });

    test('スピードランバッジの条件を判定できる', () => {
      const isSpeedrun = rewardSystem.checkSpeedrun({
        challengeType: 'SCORE_TARGET',
        targetScore: 1000,
        actualScore: 1000,
        timeElapsed: 45000, // 45秒
        expectedTime: 120000 // 通常2分
      });

      expect(isSpeedrun).toBe(true);
    });
  });

  describe('報酬のプレビュー', () => {
    test('チャレンジの潜在的な報酬を確認できる', () => {
      const preview = rewardSystem.getRewardPreview('weekly-challenge-5');

      expect(preview).toHaveProperty('possibleBadges');
      expect(preview.possibleBadges.length).toBeGreaterThan(0);
      expect(preview).toHaveProperty('conditions');
    });
  });
});