// 負荷テスト - パフォーマンス検証
const { test, expect } = require('@playwright/test');

// パフォーマンス測定ユーティリティ
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.memorySnapshots = [];
  }
  
  startMeasure(label) {
    this.measurements.set(label, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    });
  }
  
  endMeasure(label) {
    const measurement = this.measurements.get(label);
    if (!measurement) return null;
    
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    return {
      label,
      duration: endTime - measurement.startTime,
      memoryDelta: endMemory - measurement.startMemory,
      startMemory: measurement.startMemory,
      endMemory: endMemory
    };
  }
  
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    }
    // ブラウザ環境の場合
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }
  
  takeMemorySnapshot(label) {
    this.memorySnapshots.push({
      label,
      timestamp: Date.now(),
      memory: this.getMemoryUsage()
    });
  }
  
  analyzeMemoryGrowth() {
    if (this.memorySnapshots.length < 2) return null;
    
    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];
    const growth = last.memory - first.memory;
    const timeElapsed = last.timestamp - first.timestamp;
    
    return {
      totalGrowth: growth,
      growthRate: growth / timeElapsed * 1000, // bytes per second
      snapshots: this.memorySnapshots.length,
      duration: timeElapsed
    };
  }
}

// モックシステムの負荷テスト用拡張
class LoadTestHarness {
  constructor() {
    this.soundSystem = this.createSoundSystemMock();
    this.challengeGenerator = this.createChallengeGeneratorMock();
    this.websocketManager = this.createWebSocketMock();
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  createSoundSystemMock() {
    return {
      playedSounds: [],
      processSoundEvents: function(event) {
        if (!event) return;
        this.playedSounds.push({
          type: event.type,
          timestamp: Date.now()
        });
      },
      clear: function() {
        this.playedSounds = [];
      }
    };
  }
  
  createChallengeGeneratorMock() {
    return {
      generatedChallenges: [],
      generateWeeklyChallenge: function(date) {
        const challenge = {
          weekNumber: Math.floor((date - new Date('2024-01-01')) / (7 * 24 * 60 * 60 * 1000)),
          type: ['score', 'consecutive_hits', 'time_survival'][Math.floor(Math.random() * 3)],
          target: Math.floor(Math.random() * 1000) + 100,
          difficulty: ['basic', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)],
          timestamp: Date.now()
        };
        this.generatedChallenges.push(challenge);
        return challenge;
      },
      clear: function() {
        this.generatedChallenges = [];
      }
    };
  }
  
  createWebSocketMock() {
    return {
      messages: [],
      connections: 0,
      send: function(message) {
        this.messages.push({
          data: message,
          timestamp: Date.now()
        });
      },
      connect: function() {
        this.connections++;
      },
      disconnect: function() {
        this.connections--;
      },
      clear: function() {
        this.messages = [];
        this.connections = 0;
      }
    };
  }
  
  generateSoundEvents(count) {
    const events = [];
    for (let i = 0; i < count; i++) {
      events.push({
        type: ['ballHit', 'wallHit', 'scoreUp', 'gameOver'][i % 4],
        ballHit: i % 4 === 0,
        wallHit: i % 4 === 1,
        scoreChanged: i % 4 === 2,
        gameOver: i % 4 === 3,
        ballVelocityX: Math.random() * 10,
        ballVelocityY: Math.random() * 10,
        timestamp: Date.now() + i
      });
    }
    return events;
  }
  
  generateWebSocketMessages(count) {
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        type: ['challenge_update', 'score_update', 'game_state'][i % 3],
        data: {
          id: i,
          timestamp: Date.now() + i,
          payload: { random: Math.random() }
        }
      });
    }
    return messages;
  }
}

test.describe('Performance Under Load', () => {
  let harness;

  test.beforeEach(() => {
    harness = new LoadTestHarness();
  });

  test('1000回のサウンドイベント処理', async () => {
    const eventCount = 1000;
    const events = harness.generateSoundEvents(eventCount);
    
    harness.performanceMonitor.startMeasure('soundProcessing');
    
    // サウンドイベントを処理
    events.forEach(event => {
      harness.soundSystem.processSoundEvents(event);
    });
    
    const result = harness.performanceMonitor.endMeasure('soundProcessing');
    
    // パフォーマンス基準
    expect(result.duration).toBeLessThan(100); // 100ms以内
    expect(harness.soundSystem.playedSounds).toHaveLength(eventCount);
    
    // 1イベントあたりの処理時間
    const avgProcessingTime = result.duration / eventCount;
    expect(avgProcessingTime).toBeLessThan(0.1); // 0.1ms以内
    
    console.log(`Sound processing performance: ${avgProcessingTime.toFixed(3)}ms per event`);
  });

  test('100個の同時WebSocketメッセージ処理', async () => {
    const messageCount = 100;
    const messages = harness.generateWebSocketMessages(messageCount);
    
    harness.performanceMonitor.startMeasure('websocketProcessing');
    
    // 同時接続をシミュレート
    for (let i = 0; i < 10; i++) {
      harness.websocketManager.connect();
    }
    
    // メッセージを高速で送信
    messages.forEach(msg => {
      harness.websocketManager.send(JSON.stringify(msg));
    });
    
    const result = harness.performanceMonitor.endMeasure('websocketProcessing');
    
    // パフォーマンス基準
    expect(result.duration).toBeLessThan(50); // 50ms以内
    expect(harness.websocketManager.messages).toHaveLength(messageCount);
    expect(harness.websocketManager.connections).toBe(10);
    
    console.log(`WebSocket processing: ${(result.duration / messageCount).toFixed(3)}ms per message`);
  });

  test('長時間実行でのメモリリーク検証', async () => {
    const iterations = 100;
    const eventsPerIteration = 100;
    
    // 初期メモリスナップショット
    harness.performanceMonitor.takeMemorySnapshot('start');
    
    for (let i = 0; i < iterations; i++) {
      // サウンドイベント処理
      const events = harness.generateSoundEvents(eventsPerIteration);
      events.forEach(event => {
        harness.soundSystem.processSoundEvents(event);
      });
      
      // チャレンジ生成
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      harness.challengeGenerator.generateWeeklyChallenge(date);
      
      // WebSocketメッセージ
      const messages = harness.generateWebSocketMessages(10);
      messages.forEach(msg => {
        harness.websocketManager.send(JSON.stringify(msg));
      });
      
      // 定期的にメモリスナップショット
      if (i % 10 === 0) {
        harness.performanceMonitor.takeMemorySnapshot(`iteration_${i}`);
      }
      
      // クリーンアップ（通常のガベージコレクションをシミュレート）
      if (i % 20 === 0) {
        harness.soundSystem.clear();
        harness.challengeGenerator.clear();
        harness.websocketManager.clear();
        
        // 強制的なガベージコレクション（Node.js環境のみ）
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    // 最終メモリスナップショット
    harness.performanceMonitor.takeMemorySnapshot('end');
    
    // メモリ増加の分析
    const memoryAnalysis = harness.performanceMonitor.analyzeMemoryGrowth();
    
    if (memoryAnalysis) {
      // メモリ増加率が許容範囲内か確認
      const growthRateMBPerHour = (memoryAnalysis.growthRate * 3600) / (1024 * 1024);
      expect(growthRateMBPerHour).toBeLessThan(10); // 1時間あたり10MB以下
      
      console.log(`Memory growth rate: ${growthRateMBPerHour.toFixed(2)}MB/hour`);
    }
  });

  test('高頻度チャレンジ生成のパフォーマンス', () => {
    const challengeCount = 1000;
    
    harness.performanceMonitor.startMeasure('challengeGeneration');
    
    for (let i = 0; i < challengeCount; i++) {
      const date = new Date(Date.now() + i * 60 * 1000); // 1分ごとの日付
      harness.challengeGenerator.generateWeeklyChallenge(date);
    }
    
    const result = harness.performanceMonitor.endMeasure('challengeGeneration');
    
    // パフォーマンス基準
    expect(result.duration).toBeLessThan(100); // 100ms以内
    expect(harness.challengeGenerator.generatedChallenges).toHaveLength(challengeCount);
    
    // 決定論的であることを確認（同じ週のチャレンジは同じ）
    const week1Challenges = harness.challengeGenerator.generatedChallenges
      .filter(c => c.weekNumber === harness.challengeGenerator.generatedChallenges[0].weekNumber);
    
    // 同じ週のチャレンジは同じタイプとターゲットを持つはず
    const firstChallenge = week1Challenges[0];
    week1Challenges.forEach(challenge => {
      expect(challenge.type).toBe(firstChallenge.type);
      expect(challenge.difficulty).toBe(firstChallenge.difficulty);
    });
    
    console.log(`Challenge generation: ${(result.duration / challengeCount).toFixed(3)}ms per challenge`);
  });

  test('同時実行ストレステスト', async () => {
    const concurrentOperations = 50;
    const operationsPerType = 20;
    
    harness.performanceMonitor.startMeasure('concurrentStress');
    
    const promises = [];
    
    // 並行してさまざまな操作を実行
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(
        Promise.resolve().then(() => {
          // サウンドイベント
          const events = harness.generateSoundEvents(operationsPerType);
          events.forEach(e => harness.soundSystem.processSoundEvents(e));
          
          // チャレンジ生成
          const date = new Date(Date.now() + i * 1000);
          harness.challengeGenerator.generateWeeklyChallenge(date);
          
          // WebSocketメッセージ
          const messages = harness.generateWebSocketMessages(operationsPerType);
          messages.forEach(m => harness.websocketManager.send(JSON.stringify(m)));
        })
      );
    }
    
    await Promise.all(promises);
    
    const result = harness.performanceMonitor.endMeasure('concurrentStress');
    
    // 並行実行でも妥当な時間内に完了
    expect(result.duration).toBeLessThan(1000); // 1秒以内
    
    // すべての操作が完了していることを確認
    expect(harness.soundSystem.playedSounds.length).toBeGreaterThan(0);
    expect(harness.challengeGenerator.generatedChallenges.length).toBe(concurrentOperations);
    expect(harness.websocketManager.messages.length).toBe(concurrentOperations * operationsPerType);
    
    console.log(`Concurrent stress test completed in ${result.duration.toFixed(2)}ms`);
  });

  test('メモリ効率の検証', () => {
    const testData = {
      smallPayload: { id: 1, value: 'small' },
      mediumPayload: { id: 2, data: new Array(100).fill('medium') },
      largePayload: { id: 3, matrix: new Array(100).fill(new Array(100).fill(0)) }
    };
    
    // 各ペイロードサイズでのメモリ使用量を測定
    ['small', 'medium', 'large'].forEach(size => {
      const payload = testData[`${size}Payload`];
      const count = size === 'large' ? 10 : 100;
      
      harness.performanceMonitor.startMeasure(`memory_${size}`);
      
      for (let i = 0; i < count; i++) {
        harness.websocketManager.send(JSON.stringify(payload));
      }
      
      const result = harness.performanceMonitor.endMeasure(`memory_${size}`);
      
      // メモリ使用量が妥当な範囲内
      const memoryPerMessage = result.memoryDelta / count;
      
      console.log(`Memory usage for ${size} payload: ${(memoryPerMessage / 1024).toFixed(2)}KB per message`);
      
      // サイズに応じた妥当なメモリ使用量
      if (size === 'small') {
        expect(memoryPerMessage).toBeLessThan(1024); // 1KB以下
      } else if (size === 'medium') {
        expect(memoryPerMessage).toBeLessThan(10240); // 10KB以下
      } else {
        expect(memoryPerMessage).toBeLessThan(102400); // 100KB以下
      }
    });
  });
});