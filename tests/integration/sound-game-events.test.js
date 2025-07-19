// SoundSystem + Game Events 統合テスト
const { test, expect } = require('@playwright/test');

// ゲームイベントシミュレーター
class GameEventSimulator {
  constructor(soundSystem) {
    this.soundSystem = soundSystem;
    this.eventLog = [];
    this.score = 0;
    this.consecutiveHits = 0;
    this.gameActive = true;
  }
  
  simulateBallHit(velocityX = 5, velocityY = 3) {
    const event = {
      type: 'ballHit',
      ballHit: true,
      ballVelocityX: velocityX,
      ballVelocityY: velocityY,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.consecutiveHits++;
    this.soundSystem.processSoundEvents(event);
    
    return event;
  }
  
  simulateWallHit() {
    const event = {
      type: 'wallHit',
      wallHit: true,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.soundSystem.processSoundEvents(event);
    
    return event;
  }
  
  simulateScoreChange(newScore) {
    const oldScore = this.score;
    this.score = newScore;
    
    const event = {
      type: 'scoreChanged',
      scoreChanged: true,
      oldScore: oldScore,
      newScore: newScore,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.soundSystem.processSoundEvents(event);
    
    return event;
  }
  
  simulatePowerUpCollected(powerUpType = 'speedBoost') {
    const event = {
      type: 'powerUpCollected',
      powerUpCollected: true,
      powerUpType: powerUpType,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.soundSystem.processSoundEvents(event);
    
    return event;
  }
  
  simulateGameOver() {
    this.gameActive = false;
    
    const event = {
      type: 'gameOver',
      gameOver: true,
      finalScore: this.score,
      timestamp: Date.now()
    };
    
    this.eventLog.push(event);
    this.soundSystem.processSoundEvents(event);
    
    return event;
  }
  
  simulateGameSequence(duration = 5000) {
    const events = [];
    const startTime = Date.now();
    let lastEventTime = startTime;
    
    // ゲームシーケンスのシミュレーション
    while (Date.now() - startTime < duration && this.gameActive) {
      const timeSinceLastEvent = Date.now() - lastEventTime;
      
      // 100-300ms間隔でボールヒット
      if (timeSinceLastEvent > 100 + Math.random() * 200) {
        const velocityX = 3 + Math.random() * 10;
        const velocityY = 2 + Math.random() * 8;
        events.push(this.simulateBallHit(velocityX, velocityY));
        
        // 時々壁にヒット
        if (Math.random() < 0.3) {
          events.push(this.simulateWallHit());
        }
        
        // スコア更新
        if (this.consecutiveHits % 5 === 0) {
          const scoreIncrease = 10 * Math.floor(1 + this.consecutiveHits / 10);
          events.push(this.simulateScoreChange(this.score + scoreIncrease));
        }
        
        // たまにパワーアップ
        if (Math.random() < 0.05) {
          events.push(this.simulatePowerUpCollected());
        }
        
        lastEventTime = Date.now();
      }
      
      // CPUを占有しないように少し待つ
      if (typeof process !== 'undefined' && process.nextTick) {
        process.nextTick(() => {});
      }
    }
    
    // 最後にゲームオーバー
    if (this.gameActive) {
      events.push(this.simulateGameOver());
    }
    
    return events;
  }
}

// MockSoundSystemの拡張版
class MockSoundSystemWithTracking {
  constructor() {
    this.soundEnabled = true;
    this.playedSounds = [];
    this.initialized = true;
  }
  
  get muted() {
    return !this.soundEnabled;
  }
  
  setMuted(muteState) {
    this.soundEnabled = !muteState;
  }
  
  async playSound(soundType, pitch = 1.0) {
    if (!this.soundEnabled) return;
    
    const soundEvent = {
      type: soundType,
      pitch: pitch,
      timestamp: Date.now(),
      muted: this.muted
    };
    
    this.playedSounds.push(soundEvent);
  }
  
  processSoundEvents(frameData) {
    if (!this.soundEnabled || !frameData) return;
    
    if (frameData.ballHit) {
      const speed = Math.sqrt(frameData.ballVelocityX**2 + frameData.ballVelocityY**2);
      const pitch = Math.min(2.0, 1.0 + speed / 10);
      this.playSound('ballHit', pitch);
    }
    
    if (frameData.wallHit) {
      this.playSound('wallHit');
    }
    
    if (frameData.scoreChanged) {
      this.playSound('scoreUp');
    }
    
    if (frameData.powerUpCollected) {
      this.playSound('powerUp');
    }
    
    if (frameData.gameOver) {
      this.playSound('gameOver');
    }
  }
  
  getPlayedSoundsByType(soundType) {
    return this.playedSounds.filter(s => s.type === soundType);
  }
  
  clearPlayedSounds() {
    this.playedSounds = [];
  }
}

test.describe('Sound-Game Integration Tests', () => {
  let soundSystem;
  let gameSimulator;

  test.beforeEach(() => {
    soundSystem = new MockSoundSystemWithTracking();
    gameSimulator = new GameEventSimulator(soundSystem);
  });

  test('ボール衝突時に適切なサウンドが再生される', () => {
    // 低速のボール
    gameSimulator.simulateBallHit(2, 2);
    let ballHitSounds = soundSystem.getPlayedSoundsByType('ballHit');
    expect(ballHitSounds).toHaveLength(1);
    expect(ballHitSounds[0].pitch).toBeCloseTo(1.28, 1); // sqrt(8)/10 + 1
    
    soundSystem.clearPlayedSounds();
    
    // 高速のボール
    gameSimulator.simulateBallHit(8, 6);
    ballHitSounds = soundSystem.getPlayedSoundsByType('ballHit');
    expect(ballHitSounds).toHaveLength(1);
    expect(ballHitSounds[0].pitch).toBeCloseTo(2.0, 1); // 最大値に制限
    
    soundSystem.clearPlayedSounds();
    
    // 中速のボール
    gameSimulator.simulateBallHit(3, 4);
    ballHitSounds = soundSystem.getPlayedSoundsByType('ballHit');
    expect(ballHitSounds).toHaveLength(1);
    expect(ballHitSounds[0].pitch).toBeCloseTo(1.5, 1); // sqrt(25)/10 + 1
  });

  test('壁衝突時に適切なサウンドが再生される', () => {
    gameSimulator.simulateWallHit();
    
    const wallHitSounds = soundSystem.getPlayedSoundsByType('wallHit');
    expect(wallHitSounds).toHaveLength(1);
    expect(wallHitSounds[0].pitch).toBe(1.0); // デフォルトピッチ
  });

  test('スコア変更時に適切なサウンドが再生される', () => {
    gameSimulator.simulateScoreChange(100);
    
    const scoreUpSounds = soundSystem.getPlayedSoundsByType('scoreUp');
    expect(scoreUpSounds).toHaveLength(1);
    expect(scoreUpSounds[0].type).toBe('scoreUp');
  });

  test('パワーアップ取得時に適切なサウンドが再生される', () => {
    gameSimulator.simulatePowerUpCollected('speedBoost');
    
    const powerUpSounds = soundSystem.getPlayedSoundsByType('powerUp');
    expect(powerUpSounds).toHaveLength(1);
    expect(powerUpSounds[0].type).toBe('powerUp');
  });

  test('ゲームオーバー時に適切なサウンドが再生される', () => {
    gameSimulator.score = 500;
    gameSimulator.simulateGameOver();
    
    const gameOverSounds = soundSystem.getPlayedSoundsByType('gameOver');
    expect(gameOverSounds).toHaveLength(1);
    expect(gameOverSounds[0].type).toBe('gameOver');
  });

  test('ミュート中はすべてのイベントで音が再生されない', () => {
    soundSystem.setMuted(true);
    
    // 様々なイベントを発生させる
    gameSimulator.simulateBallHit(5, 5);
    gameSimulator.simulateWallHit();
    gameSimulator.simulateScoreChange(100);
    gameSimulator.simulatePowerUpCollected();
    gameSimulator.simulateGameOver();
    
    // 音が再生されていないことを確認
    expect(soundSystem.playedSounds).toHaveLength(0);
  });

  test('ミュート解除後は音が再生される', () => {
    // 最初はミュート
    soundSystem.setMuted(true);
    gameSimulator.simulateBallHit(3, 3);
    expect(soundSystem.playedSounds).toHaveLength(0);
    
    // ミュート解除
    soundSystem.setMuted(false);
    gameSimulator.simulateBallHit(3, 3);
    expect(soundSystem.playedSounds).toHaveLength(1);
  });

  test('複数の同時イベントが正しく処理される', () => {
    // 複数のイベントを含むフレームデータ
    const complexFrameData = {
      ballHit: true,
      ballVelocityX: 5,
      ballVelocityY: 5,
      wallHit: true,
      scoreChanged: true,
      timestamp: Date.now()
    };
    
    soundSystem.processSoundEvents(complexFrameData);
    
    // 各イベントに対応する音が再生される
    expect(soundSystem.playedSounds).toHaveLength(3);
    expect(soundSystem.getPlayedSoundsByType('ballHit')).toHaveLength(1);
    expect(soundSystem.getPlayedSoundsByType('wallHit')).toHaveLength(1);
    expect(soundSystem.getPlayedSoundsByType('scoreUp')).toHaveLength(1);
  });

  test('ゲームシーケンス全体でサウンドが適切に再生される', async () => {
    // 2秒間のゲームシミュレーション
    const events = gameSimulator.simulateGameSequence(2000);
    
    // イベントが生成されたことを確認
    expect(events.length).toBeGreaterThan(5);
    
    // 各種サウンドが再生されたことを確認
    expect(soundSystem.getPlayedSoundsByType('ballHit').length).toBeGreaterThan(0);
    expect(soundSystem.getPlayedSoundsByType('gameOver')).toHaveLength(1);
    
    // スコアが更新されていればscoreUpサウンドも
    const scoreEvents = events.filter(e => e.type === 'scoreChanged');
    expect(soundSystem.getPlayedSoundsByType('scoreUp')).toHaveLength(scoreEvents.length);
  });

  test('サウンドイベントのタイミングが正確', async () => {
    const startTime = Date.now();
    const timers = [];
    
    // 一定間隔でイベントを発生
    const intervals = [100, 200, 300];
    intervals.forEach((interval, index) => {
      const timer = setTimeout(() => {
        gameSimulator.simulateBallHit(3 + index, 3 + index);
      }, interval);
      timers.push(timer);
    });
    
    // すべてのイベントが処理されるまで待つ
    await new Promise(resolve => {
      setTimeout(() => {
        const ballHitSounds = soundSystem.getPlayedSoundsByType('ballHit');
        expect(ballHitSounds).toHaveLength(3);
        
        // タイムスタンプが適切に記録されている
        for (let i = 1; i < ballHitSounds.length; i++) {
          const timeDiff = ballHitSounds[i].timestamp - ballHitSounds[i-1].timestamp;
          expect(timeDiff).toBeGreaterThanOrEqual(90); // 多少の誤差を許容
          expect(timeDiff).toBeLessThanOrEqual(110);
        }
        
        // タイマーをクリーンアップ
        timers.forEach(timer => clearTimeout(timer));
        resolve();
      }, 400);
    });
  });

  test('無効なイベントデータでもクラッシュしない', () => {
    // 様々な無効なデータでテスト
    const invalidEvents = [
      null,
      undefined,
      {},
      { ballHit: true }, // velocityがない
      { ballVelocityX: 5 }, // ballHitフラグがない
      { ballHit: 'yes', ballVelocityX: 'fast', ballVelocityY: 'slow' }, // 型が違う
      { gameOver: 1 }, // boolean以外
      { scoreChanged: true, newScore: 'hundred' } // 数値以外のスコア
    ];
    
    invalidEvents.forEach(invalidEvent => {
      expect(() => {
        soundSystem.processSoundEvents(invalidEvent);
      }).not.toThrow();
    });
    
    // 有効なイベントは引き続き処理される
    gameSimulator.simulateBallHit(5, 5);
    expect(soundSystem.playedSounds.length).toBeGreaterThan(0);
  });

  test('高頻度イベントでもパフォーマンスが維持される', () => {
    const startTime = Date.now();
    const eventCount = 1000;
    
    // 1000個のイベントを高速で処理
    for (let i = 0; i < eventCount; i++) {
      gameSimulator.simulateBallHit(
        Math.random() * 10,
        Math.random() * 10
      );
    }
    
    const processingTime = Date.now() - startTime;
    
    // 処理時間が妥当な範囲内
    expect(processingTime).toBeLessThan(1000); // 1秒以内
    
    // すべてのイベントが処理された
    expect(soundSystem.playedSounds).toHaveLength(eventCount);
    
    // ピッチ計算が正しく行われている
    soundSystem.playedSounds.forEach(sound => {
      expect(sound.pitch).toBeGreaterThanOrEqual(1.0);
      expect(sound.pitch).toBeLessThanOrEqual(2.0);
    });
  });
});