// レスポンスタイムテスト - パフォーマンス基準検証
const { test, expect } = require('@playwright/test');

// 高精度タイマー
class PrecisionTimer {
  constructor() {
    this.marks = new Map();
  }

  mark(label) {
    if (typeof process !== 'undefined' && process.hrtime) {
      this.marks.set(label, process.hrtime.bigint());
    } else {
      this.marks.set(label, performance.now());
    }
  }

  measure(startLabel, endLabel) {
    const start = this.marks.get(startLabel);
    const end = this.marks.get(endLabel);

    if (!start || !end) return null;

    if (typeof process !== 'undefined' && process.hrtime) {
      // Node.js環境：nanosecond精度
      return Number(end - start) / 1000000; // nanoseconds to milliseconds
    } else {
      // ブラウザ環境：millisecond精度
      return end - start;
    }
  }

  async measureAsync(label, asyncFn) {
    this.mark(`${label}_start`);
    const result = await asyncFn();
    this.mark(`${label}_end`);
    const duration = this.measure(`${label}_start`, `${label}_end`);
    return { result, duration };
  }
}

// レスポンスタイム測定用のモック実装
class ResponseTimeTestSystem {
  constructor() {
    this.timer = new PrecisionTimer();
    this.challengeGenerator = this.createOptimizedChallengeGenerator();
    this.soundSystem = this.createOptimizedSoundSystem();
    this.websocketManager = this.createOptimizedWebSocket();
  }

  createOptimizedChallengeGenerator() {
    // キャッシュ付きチャレンジジェネレーター
    const cache = new Map();

    return {
      generateWeeklyChallenge: function(date) {
        const weekNumber = Math.floor((date - new Date('2024-01-01')) / (7 * 24 * 60 * 60 * 1000));

        // キャッシュチェック
        if (cache.has(weekNumber)) {
          return cache.get(weekNumber);
        }

        // 疑似乱数生成（シード付き）
        const seed = weekNumber * 2654435761;
        const random = () => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
        };

        const challenge = {
          weekNumber,
          type: ['score', 'consecutive_hits', 'time_survival', 'special_action'][Math.floor(random() * 4)],
          difficulty: ['basic', 'intermediate', 'advanced', 'expert'][Math.floor(random() * 4)],
          target: Math.floor(random() * 3000) + 1000,
          timeLimit: 300,
          title: `Week ${weekNumber} Challenge`,
          description: `Complete the challenge for week ${weekNumber}`
        };

        cache.set(weekNumber, challenge);
        return challenge;
      },

      clearCache: function() {
        cache.clear();
      }
    };
  }

  createOptimizedSoundSystem() {
    // 最適化されたサウンドシステム
    return {
      audioContext: {
        currentTime: 0,
        state: 'running',
        createOscillator: () => ({
          start: () => {},
          stop: () => {},
          connect: () => {},
          frequency: { setValueAtTime: () => {} }
        }),
        createGain: () => ({
          connect: () => {},
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
        })
      },

      playSound: async function(soundType, pitch = 1.0) {
        // 最小限の処理時間をシミュレート
        return new Promise(resolve => {
          // Web Audio APIの非同期処理をシミュレート
          setImmediate ? setImmediate(resolve) : setTimeout(resolve, 0);
        });
      },

      processSoundEvents: function(frameData) {
        if (!frameData) return;

        // 最適化された条件チェック
        const promises = [];

        if (frameData.ballHit) {
          promises.push(this.playSound('ballHit', 1.0 + Math.sqrt(frameData.ballVelocityX**2 + frameData.ballVelocityY**2) / 10));
        }
        if (frameData.scoreChanged) {
          promises.push(this.playSound('scoreUp'));
        }
        if (frameData.gameOver) {
          promises.push(this.playSound('gameOver'));
        }

        return Promise.all(promises);
      }
    };
  }

  createOptimizedWebSocket() {
    // 最適化されたWebSocketマネージャー
    const messageQueue = [];
    const subscribers = new Set();

    return {
      send: async function(message) {
        messageQueue.push({
          data: message,
          timestamp: Date.now()
        });

        // 非同期でサブスクライバーに通知
        return new Promise(resolve => {
          setImmediate ? setImmediate(() => {
            subscribers.forEach(callback => callback(message));
            resolve();
          }) : setTimeout(() => {
            subscribers.forEach(callback => callback(message));
            resolve();
          }, 0);
        });
      },

      subscribe: function(callback) {
        subscribers.add(callback);
      },

      getLatency: function() {
        // ローカル接続のレイテンシをシミュレート
        return Math.random() * 5 + 1; // 1-6ms
      },

      ping: async function() {
        const start = Date.now();
        await this.send(JSON.stringify({ type: 'ping' }));
        return Date.now() - start;
      }
    };
  }
}

test.describe('Response Time Tests', () => {
  let system;

  test.beforeEach(() => {
    system = new ResponseTimeTestSystem();
  });

  test('チャレンジ生成が100ms以内', async () => {
    const iterations = 100;
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const date = new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000);

      const { duration } = await system.timer.measureAsync('challenge', async () => {
        return system.challengeGenerator.generateWeeklyChallenge(date);
      });

      durations.push(duration);
    }

    // 統計分析
    const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
    const maxDuration = Math.max(...durations);
    const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

    console.log(`Challenge generation - Avg: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms, P95: ${p95Duration.toFixed(2)}ms`);

    // パフォーマンス基準
    expect(avgDuration).toBeLessThan(10); // 平均10ms以内
    expect(p95Duration).toBeLessThan(50); // 95パーセンタイル50ms以内
    expect(maxDuration).toBeLessThan(100); // 最大100ms以内
  });

  test('サウンド再生遅延が50ms以内', async () => {
    const soundTypes = ['ballHit', 'scoreUp', 'gameOver', 'powerUp'];
    const measurements = [];

    for (const soundType of soundTypes) {
      for (let i = 0; i < 20; i++) {
        const { duration } = await system.timer.measureAsync(`sound_${soundType}`, async () => {
          await system.soundSystem.playSound(soundType, 1.0 + Math.random());
        });

        measurements.push({ soundType, duration });
      }
    }

    // サウンドタイプ別の分析
    soundTypes.forEach(type => {
      const typeMeasurements = measurements
        .filter(m => m.soundType === type)
        .map(m => m.duration);

      const avg = typeMeasurements.reduce((a, b) => a + b) / typeMeasurements.length;
      const max = Math.max(...typeMeasurements);

      console.log(`Sound ${type} - Avg: ${avg.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);

      // パフォーマンス基準
      expect(avg).toBeLessThan(10); // 平均10ms以内
      expect(max).toBeLessThan(50); // 最大50ms以内
    });
  });

  test('WebSocketメッセージ往復が200ms以内', async () => {
    const messageCount = 50;
    const roundTripTimes = [];

    // メッセージ受信のサブスクライバーを設定
    let receivedMessages = 0;
    system.websocketManager.subscribe(() => {
      receivedMessages++;
    });

    for (let i = 0; i < messageCount; i++) {
      const message = {
        type: 'test',
        id: i,
        timestamp: Date.now(),
        payload: { data: 'test data' }
      };

      const { duration } = await system.timer.measureAsync('roundtrip', async () => {
        await system.websocketManager.send(JSON.stringify(message));
      });

      roundTripTimes.push(duration);
    }

    // レイテンシシミュレーション
    const simulatedLatencies = [];
    for (let i = 0; i < 100; i++) {
      simulatedLatencies.push(system.websocketManager.getLatency());
    }

    // 統計分析
    const avgRoundTrip = roundTripTimes.reduce((a, b) => a + b) / roundTripTimes.length;
    const maxRoundTrip = Math.max(...roundTripTimes);
    const avgLatency = simulatedLatencies.reduce((a, b) => a + b) / simulatedLatencies.length;

    console.log(`WebSocket - Avg RTT: ${avgRoundTrip.toFixed(2)}ms, Max RTT: ${maxRoundTrip.toFixed(2)}ms, Avg Latency: ${avgLatency.toFixed(2)}ms`);

    // パフォーマンス基準
    expect(avgRoundTrip).toBeLessThan(50); // 平均50ms以内
    expect(maxRoundTrip).toBeLessThan(200); // 最大200ms以内
    expect(receivedMessages).toBe(messageCount); // すべてのメッセージが受信された
  });

  test('複合イベント処理の総合レスポンスタイム', async () => {
    const complexEvent = {
      ballHit: true,
      ballVelocityX: 5,
      ballVelocityY: 5,
      scoreChanged: true,
      oldScore: 100,
      newScore: 110,
      timestamp: Date.now()
    };

    const iterations = 50;
    const processingTimes = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await system.timer.measureAsync('complex', async () => {
        // サウンド処理
        await system.soundSystem.processSoundEvents(complexEvent);

        // WebSocketメッセージ送信
        await system.websocketManager.send(JSON.stringify({
          type: 'game_update',
          event: complexEvent
        }));

        // チャレンジ進捗チェック（週番号の計算のみ）
        const currentWeek = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));

        return { processed: true, week: currentWeek };
      });

      processingTimes.push(duration);
    }

    // 統計分析
    const avgTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
    const maxTime = Math.max(...processingTimes);
    const minTime = Math.min(...processingTimes);

    console.log(`Complex event - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

    // パフォーマンス基準
    expect(avgTime).toBeLessThan(30); // 平均30ms以内
    expect(maxTime).toBeLessThan(100); // 最大100ms以内
  });

  test('初期化時間の測定', async () => {
    const initTimes = {
      soundSystem: [],
      challengeGenerator: [],
      websocketManager: [],
      total: []
    };

    for (let i = 0; i < 20; i++) {
      const { duration: totalDuration } = await system.timer.measureAsync('init_total', async () => {
        // サウンドシステム初期化
        const { duration: soundDuration } = await system.timer.measureAsync('init_sound', async () => {
          return system.createOptimizedSoundSystem();
        });
        initTimes.soundSystem.push(soundDuration);

        // チャレンジジェネレーター初期化
        const { duration: challengeDuration } = await system.timer.measureAsync('init_challenge', async () => {
          return system.createOptimizedChallengeGenerator();
        });
        initTimes.challengeGenerator.push(challengeDuration);

        // WebSocket初期化
        const { duration: wsDuration } = await system.timer.measureAsync('init_websocket', async () => {
          return system.createOptimizedWebSocket();
        });
        initTimes.websocketManager.push(wsDuration);
      });

      initTimes.total.push(totalDuration);
    }

    // 各コンポーネントの初期化時間分析
    Object.entries(initTimes).forEach(([component, times]) => {
      const avg = times.reduce((a, b) => a + b) / times.length;
      const max = Math.max(...times);

      console.log(`Init ${component} - Avg: ${avg.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);

      // パフォーマンス基準
      if (component === 'total') {
        expect(avg).toBeLessThan(50); // 総初期化時間50ms以内
        expect(max).toBeLessThan(100); // 最大100ms以内
      } else {
        expect(avg).toBeLessThan(20); // 各コンポーネント20ms以内
        expect(max).toBeLessThan(50); // 最大50ms以内
      }
    });
  });

  test('キャッシュ効果の検証', async () => {
    // キャッシュなしの測定
    system.challengeGenerator.clearCache();
    const noCacheTimes = [];

    for (let i = 0; i < 50; i++) {
      const date = new Date('2024-01-01');
      const { duration } = await system.timer.measureAsync('no_cache', async () => {
        return system.challengeGenerator.generateWeeklyChallenge(date);
      });
      noCacheTimes.push(duration);
      system.challengeGenerator.clearCache();
    }

    // キャッシュありの測定
    const withCacheTimes = [];
    const date = new Date('2024-01-01');

    // 最初の生成（キャッシュミス）
    await system.challengeGenerator.generateWeeklyChallenge(date);

    // 同じ週のチャレンジを繰り返し取得（キャッシュヒット）
    for (let i = 0; i < 50; i++) {
      const { duration } = await system.timer.measureAsync('with_cache', async () => {
        return system.challengeGenerator.generateWeeklyChallenge(date);
      });
      withCacheTimes.push(duration);
    }

    // 統計分析
    const avgNoCache = noCacheTimes.reduce((a, b) => a + b) / noCacheTimes.length;
    const avgWithCache = withCacheTimes.reduce((a, b) => a + b) / withCacheTimes.length;
    const speedup = avgNoCache / avgWithCache;

    console.log(`Cache effect - No cache: ${avgNoCache.toFixed(2)}ms, With cache: ${avgWithCache.toFixed(2)}ms, Speedup: ${speedup.toFixed(1)}x`);

    // キャッシュによる高速化を確認
    expect(avgWithCache).toBeLessThan(avgNoCache * 0.1); // 10倍以上高速
    expect(avgWithCache).toBeLessThan(1); // キャッシュヒット時は1ms以内
  });
});
