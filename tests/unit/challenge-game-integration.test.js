import { ChallengeGameMode, ChallengeManager } from '../../docs/js/challenge-game-integration.js';
import { GameEngine } from '../../docs/js/game-engine.js';

// GameEngineのモック
jest.mock('../../docs/js/game-engine.js');

describe('ChallengeGameMode', () => {
  let gameMode;
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      setGameSpeed: jest.fn(),
      setPaddleSize: jest.fn(),
      enablePowerups: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      start: jest.fn(),
      pause: jest.fn(),
      reset: jest.fn(),
      getScore: jest.fn(() => 0),
      getElapsedTime: jest.fn(() => 0)
    };

    GameEngine.mockImplementation(() => mockGameEngine);
  });

  test('チャレンジモードでゲームを初期化できる', () => {
    gameMode = new ChallengeGameMode({
      challengeId: 'weekly-challenge-1',
      challengeType: 'SCORE_TARGET',
      parameters: {
        ballSpeed: 8,
        paddleSize: 75,
        targetScore: 1000
      }
    });

    expect(gameMode.challengeId).toBe('weekly-challenge-1');
    expect(gameMode.isActive).toBe(false);
    expect(gameMode.parameters.ballSpeed).toBe(8);
  });

  test('チャレンジパラメータをゲームエンジンに適用できる', () => {
    gameMode = new ChallengeGameMode({
      parameters: {
        ballSpeed: 10,
        paddleSize: 60,
        powerupsEnabled: false
      }
    });

    gameMode.applyParameters(mockGameEngine);

    expect(mockGameEngine.setGameSpeed).toHaveBeenCalledWith(10);
    expect(mockGameEngine.setPaddleSize).toHaveBeenCalledWith(60);
    expect(mockGameEngine.enablePowerups).toHaveBeenCalledWith(false);
  });

  test('制限付きチャレンジの制約を適用できる', () => {
    gameMode = new ChallengeGameMode({
      challengeType: 'RESTRICTION',
      restrictions: ['NO_POWERUPS', 'NO_PAUSE'],
      parameters: { targetScore: 500 }
    });

    gameMode.applyRestrictions(mockGameEngine);

    expect(mockGameEngine.enablePowerups).toHaveBeenCalledWith(false);
    expect(mockGameEngine.on).toHaveBeenCalledWith('pause', expect.any(Function));
  });

  test('チャレンジの開始と終了を管理できる', () => {
    gameMode = new ChallengeGameMode({
      challengeType: 'TIME_LIMIT',
      parameters: {
        timeLimit: 60000,
        targetScore: 500
      }
    });

    const onStart = jest.fn();
    const onEnd = jest.fn();
    
    gameMode.on('challenge:start', onStart);
    gameMode.on('challenge:end', onEnd);

    gameMode.start(mockGameEngine);
    expect(gameMode.isActive).toBe(true);
    expect(onStart).toHaveBeenCalled();
    expect(mockGameEngine.start).toHaveBeenCalled();

    gameMode.end({ completed: true, score: 600 });
    expect(gameMode.isActive).toBe(false);
    expect(onEnd).toHaveBeenCalledWith({
      completed: true,
      score: 600
    });
  });
});

describe('ChallengeManager', () => {
  let manager;
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      on: jest.fn(),
      emit: jest.fn(),
      getScore: jest.fn(() => 0),
      getElapsedTime: jest.fn(() => 0),
      getMissCount: jest.fn(() => 0),
      getPowerupsUsed: jest.fn(() => 0)
    };

    manager = new ChallengeManager(mockGameEngine);
  });

  describe('チャレンジのライフサイクル管理', () => {
    test('週替わりチャレンジをロードして開始できる', async () => {
      const mockChallenge = {
        id: 'weekly-challenge-1',
        type: 'SCORE_TARGET',
        parameters: {
          targetScore: 1000,
          ballSpeed: 7
        }
      };

      manager.loadWeeklyChallenge = jest.fn().mockResolvedValue(mockChallenge);
      
      await manager.startWeeklyChallenge();

      expect(manager.currentChallenge).toBeDefined();
      expect(manager.currentChallenge.id).toBe('weekly-challenge-1');
      expect(manager.isChallengeModeActive()).toBe(true);
    });

    test('チャレンジ中のゲームイベントを処理できる', () => {
      manager.startChallenge({
        id: 'test-challenge',
        type: 'SCORE_TARGET',
        parameters: { targetScore: 1000 }
      });

      // スコア更新イベント
      mockGameEngine.getScore.mockReturnValue(500);
      manager.handleGameEvent('score:update', { score: 500 });
      
      expect(manager.getProgress().currentScore).toBe(500);
      expect(manager.getProgress().percentage).toBe(50);

      // 目標達成
      mockGameEngine.getScore.mockReturnValue(1000);
      manager.handleGameEvent('score:update', { score: 1000 });
      
      expect(manager.isCompleted()).toBe(true);
    });

    test('時間制限チャレンジで時間切れを検出できる', () => {
      jest.useFakeTimers();

      manager.startChallenge({
        id: 'time-challenge',
        type: 'TIME_LIMIT',
        parameters: {
          timeLimit: 60000,
          targetScore: 500
        }
      });

      const onTimeout = jest.fn();
      manager.on('challenge:timeout', onTimeout);

      jest.advanceTimersByTime(61000);

      expect(onTimeout).toHaveBeenCalled();
      expect(manager.isActive()).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('制限違反の検出', () => {
    test('パワーアップ使用制限の違反を検出できる', () => {
      manager.startChallenge({
        type: 'RESTRICTION',
        restrictions: ['NO_POWERUPS'],
        parameters: { targetScore: 300 }
      });

      const onViolation = jest.fn();
      manager.on('challenge:violation', onViolation);

      manager.handleGameEvent('powerup:collected', {});

      expect(onViolation).toHaveBeenCalledWith({
        restriction: 'NO_POWERUPS',
        action: 'powerup:collected'
      });
      expect(manager.isFailed()).toBe(true);
    });

    test('一時停止制限の違反を検出できる', () => {
      manager.startChallenge({
        type: 'RESTRICTION',
        restrictions: ['NO_PAUSE'],
        parameters: { targetScore: 300 }
      });

      manager.handleGameEvent('game:paused', {});

      expect(manager.getFailureReason()).toBe('PAUSE_NOT_ALLOWED');
    });
  });

  describe('チャレンジ完了時の処理', () => {
    test('チャレンジ完了時に結果を生成できる', async () => {
      manager.startChallenge({
        id: 'weekly-challenge-1',
        type: 'SCORE_TARGET',
        parameters: { targetScore: 1000 }
      });

      mockGameEngine.getScore.mockReturnValue(1200);
      mockGameEngine.getElapsedTime.mockReturnValue(120000);
      mockGameEngine.getMissCount.mockReturnValue(2);
      mockGameEngine.getPowerupsUsed.mockReturnValue(3);

      const result = await manager.completeChallenge();

      expect(result).toMatchObject({
        challengeId: 'weekly-challenge-1',
        completed: true,
        score: 1200,
        duration: 120000,
        stats: {
          missCount: 2,
          powerupsUsed: 3
        }
      });
    });

    test('チャレンジ結果をAPIに送信できる', async () => {
      manager.api = {
        submitChallengeScore: jest.fn().mockResolvedValue({
          success: true,
          rank: 5
        })
      };

      manager.startChallenge({
        id: 'weekly-challenge-1',
        type: 'SCORE_TARGET',
        parameters: { targetScore: 1000 }
      });

      mockGameEngine.getScore.mockReturnValue(1500);
      
      const submission = await manager.submitResult();

      expect(manager.api.submitChallengeScore).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeId: 'weekly-challenge-1',
          score: 1500
        })
      );
      expect(submission.rank).toBe(5);
    });
  });

  describe('UI連携', () => {
    test('進捗更新をUIに通知できる', () => {
      const onProgressUpdate = jest.fn();
      manager.on('progress:update', onProgressUpdate);

      manager.startChallenge({
        type: 'SCORE_TARGET',
        parameters: { targetScore: 1000 }
      });

      mockGameEngine.getScore.mockReturnValue(750);
      manager.updateProgress();

      expect(onProgressUpdate).toHaveBeenCalledWith({
        currentScore: 750,
        targetScore: 1000,
        percentage: 75,
        remainingTime: null
      });
    });

    test('チャレンジ状態の変化をUIに通知できる', () => {
      const onStateChange = jest.fn();
      manager.on('state:change', onStateChange);

      manager.startChallenge({
        type: 'SCORE_TARGET',
        parameters: { targetScore: 100 }
      });

      expect(onStateChange).toHaveBeenCalledWith({
        state: 'ACTIVE',
        challengeType: 'SCORE_TARGET'
      });

      mockGameEngine.getScore.mockReturnValue(100);
      manager.checkCompletion();

      expect(onStateChange).toHaveBeenCalledWith({
        state: 'COMPLETED',
        challengeType: 'SCORE_TARGET'
      });
    });
  });
});