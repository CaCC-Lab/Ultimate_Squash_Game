import { ChallengeProgress, ProgressTracker } from '../../docs/js/challenge-progress.js';

describe('ChallengeProgress', () => {
  test('チャレンジ進捗を初期化できる', () => {
    const progress = new ChallengeProgress({
      challengeId: 'weekly-challenge-1',
      startedAt: new Date('2024-01-01T10:00:00'),
      targetScore: 1000
    });

    expect(progress.challengeId).toBe('weekly-challenge-1');
    expect(progress.currentScore).toBe(0);
    expect(progress.isCompleted).toBe(false);
    expect(progress.attempts).toBe(0);
  });

  test('進捗を更新できる', () => {
    const progress = new ChallengeProgress({
      targetScore: 1000
    });

    progress.updateScore(500);
    expect(progress.currentScore).toBe(500);
    expect(progress.getPercentage()).toBe(50);

    progress.updateScore(1000);
    expect(progress.currentScore).toBe(1000);
    expect(progress.isCompleted).toBe(true);
    expect(progress.getPercentage()).toBe(100);
  });

  test('ハイスコアを追跡できる', () => {
    const progress = new ChallengeProgress({
      targetScore: 1000
    });

    progress.recordAttempt({ score: 800, duration: 120000 });
    expect(progress.highScore).toBe(800);
    expect(progress.attempts).toBe(1);

    progress.recordAttempt({ score: 600, duration: 90000 });
    expect(progress.highScore).toBe(800); // ハイスコアは更新されない
    expect(progress.attempts).toBe(2);

    progress.recordAttempt({ score: 1200, duration: 150000 });
    expect(progress.highScore).toBe(1200);
    expect(progress.bestTime).toBe(150000);
  });
});

describe('ProgressTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
    // localStorageのモック
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  describe('チャレンジセッションの管理', () => {
    test('新しいチャレンジセッションを開始できる', () => {
      const session = tracker.startChallenge({
        challengeId: 'weekly-challenge-1',
        challengeType: 'SCORE_TARGET',
        targetScore: 1000
      });

      expect(session.sessionId).toBeDefined();
      expect(session.challengeId).toBe('weekly-challenge-1');
      expect(session.status).toBe('IN_PROGRESS');
      expect(Storage.prototype.setItem).toHaveBeenCalled();
    });

    test('進行中のセッションを取得できる', () => {
      const mockSession = {
        sessionId: 'session-123',
        challengeId: 'weekly-challenge-1',
        status: 'IN_PROGRESS'
      };

      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockSession));
      const session = tracker.getCurrentSession();

      expect(session).toEqual(mockSession);
    });

    test('セッションを終了できる', () => {
      tracker.startChallenge({
        challengeId: 'weekly-challenge-1',
        targetScore: 1000
      });

      const result = tracker.endChallenge({
        finalScore: 1200,
        duration: 120000,
        completed: true
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.finalScore).toBe(1200);
      expect(Storage.prototype.setItem).toHaveBeenCalled();
    });
  });

  describe('リアルタイム進捗更新', () => {
    test('ゲーム中の進捗を更新できる', () => {
      tracker.startChallenge({
        challengeId: 'weekly-challenge-1',
        targetScore: 1000
      });

      tracker.updateProgress({
        currentScore: 300,
        consecutiveHits: 5,
        powerupsCollected: 1
      });

      const progress = tracker.getCurrentProgress();
      expect(progress.currentScore).toBe(300);
      expect(progress.percentage).toBe(30);
      expect(progress.stats.consecutiveHits).toBe(5);
    });

    test('制限違反を検出できる', () => {
      tracker.startChallenge({
        challengeId: 'weekly-challenge-1',
        challengeType: 'RESTRICTION',
        restrictions: ['NO_POWERUPS']
      });

      const violation = tracker.checkViolation('POWERUP_USED');
      expect(violation).toBe(true);

      const session = tracker.getCurrentSession();
      expect(session.status).toBe('FAILED');
      expect(session.failReason).toBe('RESTRICTION_VIOLATED');
    });
  });

  describe('統計とサマリー', () => {
    test('チャレンジ履歴を取得できる', () => {
      const mockHistory = [
        {
          challengeId: 'weekly-challenge-1',
          completed: true,
          score: 1200,
          completedAt: new Date('2024-01-05')
        },
        {
          challengeId: 'weekly-challenge-2',
          completed: false,
          score: 800,
          completedAt: new Date('2024-01-12')
        }
      ];

      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockHistory));
      const history = tracker.getChallengeHistory();

      expect(history).toHaveLength(2);
      expect(history[0].completed).toBe(true);
      expect(history[1].completed).toBe(false);
    });

    test('週間サマリーを生成できる', () => {
      const mockHistory = [
        {
          challengeId: 'weekly-challenge-3',
          attempts: 5,
          highScore: 1500,
          completed: true,
          totalPlayTime: 600000 // 10分
        }
      ];

      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockHistory));
      const summary = tracker.getWeeklySummary(3);

      expect(summary.weekNumber).toBe(3);
      expect(summary.attempts).toBe(5);
      expect(summary.highScore).toBe(1500);
      expect(summary.completed).toBe(true);
      expect(summary.averagePlayTime).toBe(120000); // 2分/試行
    });

    test('全体の統計情報を取得できる', () => {
      const mockHistory = [
        { completed: true, score: 1000 },
        { completed: true, score: 1500 },
        { completed: false, score: 800 }
      ];

      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockHistory));
      const stats = tracker.getOverallStats();

      expect(stats.totalChallenges).toBe(3);
      expect(stats.completedChallenges).toBe(2);
      expect(stats.completionRate).toBe(66.67);
      expect(stats.averageScore).toBe(1100);
    });
  });

  describe('進捗の永続化', () => {
    test('進捗を自動保存できる', () => {
      jest.useFakeTimers();
      
      tracker.startChallenge({
        challengeId: 'weekly-challenge-1',
        targetScore: 1000
      });

      tracker.enableAutoSave(5000); // 5秒ごと

      tracker.updateProgress({ currentScore: 500 });
      
      jest.advanceTimersByTime(5000);
      
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        expect.stringContaining('progress'),
        expect.any(String)
      );

      jest.useRealTimers();
    });

    test('クラッシュ後に進捗を復元できる', () => {
      const mockProgress = {
        sessionId: 'session-123',
        challengeId: 'weekly-challenge-1',
        currentScore: 750,
        timestamp: Date.now() - 60000 // 1分前
      };

      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockProgress));
      const recovered = tracker.recoverSession();

      expect(recovered).toBeDefined();
      expect(recovered.currentScore).toBe(750);
      expect(recovered.wasRecovered).toBe(true);
    });
  });
});