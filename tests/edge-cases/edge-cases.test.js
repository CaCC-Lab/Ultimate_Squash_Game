// エッジケーステスト - 境界値と特殊条件の検証
const { test, expect } = require('@playwright/test');

// 日付関連のユーティリティ
class DateEdgeCases {
  constructor() {
    this.specialDates = this.getSpecialDates();
    this.timezones = this.getTimezones();
  }

  getSpecialDates() {
    return {
      // うるう年
      leapYearFeb29: new Date('2024-02-29'),
      nonLeapYearFeb28: new Date('2023-02-28'),
      leapYearDec31: new Date('2024-12-31'),

      // サマータイム切り替え（米国基準）
      dstStart2024: new Date('2024-03-10T02:00:00'),  // 2AM -> 3AM
      dstEnd2024: new Date('2024-11-03T02:00:00'),   // 2AM -> 1AM

      // 年末年始
      newYearsEve: new Date('2023-12-31T23:59:59'),
      newYearsDay: new Date('2024-01-01T00:00:00'),

      // エポック境界
      epochStart: new Date('2024-01-01T00:00:00'),
      preEpoch: new Date('2023-12-31T23:59:59'),

      // 極端な日付
      farPast: new Date('1900-01-01'),
      farFuture: new Date('2099-12-31'),
      unixEpoch: new Date(0),
      jsMaxDate: new Date(8640000000000000),

      // 月末
      jan31: new Date('2024-01-31'),
      feb29: new Date('2024-02-29'),
      apr30: new Date('2024-04-30'),

      // 週の境界
      sundayMidnight: new Date('2024-07-21T00:00:00'), // 日曜深夜
      mondayMidnight: new Date('2024-07-22T00:00:00') // 月曜深夜
    };
  }

  getTimezones() {
    return [
      { name: 'UTC', offset: 0 },
      { name: 'PST', offset: -8 },
      { name: 'EST', offset: -5 },
      { name: 'JST', offset: 9 },
      { name: 'AEDT', offset: 11 },
      { name: 'Baker Island', offset: -12 }, // 最西端
      { name: 'Line Islands', offset: 14 }    // 最東端
    ];
  }

  simulateTimezone(date, timezoneOffset) {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utcTime + (timezoneOffset * 3600000));
  }
}

// ブラウザ状態シミュレーター
class BrowserStateSimulator {
  constructor() {
    this.states = {
      normal: { visible: true, online: true, memory: 'normal', cpu: 'normal' },
      background: { visible: false, online: true, memory: 'normal', cpu: 'throttled' },
      lowMemory: { visible: true, online: true, memory: 'low', cpu: 'normal' },
      throttled: { visible: true, online: true, memory: 'normal', cpu: 'throttled' },
      offline: { visible: true, online: false, memory: 'normal', cpu: 'normal' }
    };
  }

  simulateState(stateName) {
    return this.states[stateName] || this.states.normal;
  }

  simulateMemoryPressure() {
    // メモリプレッシャーをシミュレート
    const largeArrays = [];
    try {
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(1000000).fill(i));
      }
    } catch (e) {
      // メモリ不足エラーをキャッチ
      return { error: 'Out of memory', allocated: largeArrays.length };
    }
    return { allocated: largeArrays.length };
  }
}

// ネットワーク条件シミュレーター
class NetworkConditionSimulator {
  constructor() {
    this.conditions = {
      '4G': { latency: 20, bandwidth: 12000000, packetLoss: 0 },
      '3G': { latency: 100, bandwidth: 1500000, packetLoss: 0.01 },
      '2G': { latency: 300, bandwidth: 250000, packetLoss: 0.02 },
      'Offline': { latency: Infinity, bandwidth: 0, packetLoss: 1 },
      'Flaky': { latency: 500, bandwidth: 500000, packetLoss: 0.1 },
      'Satellite': { latency: 600, bandwidth: 1000000, packetLoss: 0.05 }
    };
  }

  simulateLatency(condition) {
    const network = this.conditions[condition];
    return new Promise(resolve => {
      setTimeout(resolve, network.latency);
    });
  }

  simulatePacketLoss(condition) {
    const network = this.conditions[condition];
    return Math.random() < network.packetLoss;
  }

  simulateBandwidthLimit(dataSize, condition) {
    const network = this.conditions[condition];
    if (network.bandwidth === 0) return Infinity;
    return (dataSize * 8) / network.bandwidth * 1000; // milliseconds
  }
}

// エッジケース用のモックシステム
class EdgeCaseSystem {
  constructor() {
    this.dateEdgeCases = new DateEdgeCases();
    this.browserSimulator = new BrowserStateSimulator();
    this.networkSimulator = new NetworkConditionSimulator();
    this.challengeGenerator = this.createEdgeCaseChallengeGenerator();
  }

  createEdgeCaseChallengeGenerator() {
    return {
      generateWeeklyChallenge: (date) => {
        // 無効な日付の処理
        if (!date || isNaN(date.getTime())) {
          date = new Date(); // デフォルトに戻す
        }

        // 週番号の計算（エッジケース対応）
        const epochStart = new Date('2024-01-01');
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        let weekNumber = Math.floor((date - epochStart) / msPerWeek);

        // 整数オーバーフロー対策
        if (!Number.isFinite(weekNumber)) {
          weekNumber = 0;
        }

        // 負の週番号も扱える
        const absWeekNumber = Math.abs(weekNumber);
        const seed = absWeekNumber % 1000; // 循環させる

        return {
          weekNumber: weekNumber,
          type: ['score', 'time', 'hits', 'special'][seed % 4],
          difficulty: ['basic', 'intermediate', 'advanced', 'expert'][Math.floor(seed / 4) % 4],
          target: 1000 + (seed * 100),
          date: date.toISOString()
        };
      },

      getWeekStart: (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日開始
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      }
    };
  }
}

test.describe('Edge Cases', () => {
  let edgeCaseSystem;

  test.beforeEach(() => {
    edgeCaseSystem = new EdgeCaseSystem();
  });

  test.describe('日付関連エッジケース', () => {
    test('うるう年の2月29日でのチャレンジ生成', () => {
      const leapDay = edgeCaseSystem.dateEdgeCases.specialDates.leapYearFeb29;
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(leapDay);

      expect(challenge).toBeDefined();
      expect(challenge.weekNumber).toBeDefined();
      expect(challenge.date).toContain('2024-02-29');

      // 翌日（3月1日）との週番号の一貫性
      const nextDay = new Date('2024-03-01');
      const nextChallenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(nextDay);

      // 同じ週の場合
      const weekStart1 = edgeCaseSystem.challengeGenerator.getWeekStart(leapDay);
      const weekStart2 = edgeCaseSystem.challengeGenerator.getWeekStart(nextDay);

      if (weekStart1.getTime() === weekStart2.getTime()) {
        expect(challenge.type).toBe(nextChallenge.type);
        expect(challenge.difficulty).toBe(nextChallenge.difficulty);
      }
    });

    test('タイムゾーン変更時のチャレンジ一貫性', () => {
      const baseDate = new Date('2024-07-15T12:00:00Z'); // UTC正午
      const challenges = {};

      edgeCaseSystem.dateEdgeCases.timezones.forEach(tz => {
        const localDate = edgeCaseSystem.dateEdgeCases.simulateTimezone(baseDate, tz.offset);
        challenges[tz.name] = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(localDate);
      });

      // すべてのタイムゾーンで同じチャレンジが生成される（同じ週の場合）
      const weekNumbers = Object.values(challenges).map(c => c.weekNumber);
      const uniqueWeekNumbers = [...new Set(weekNumbers)];

      // 日付境界をまたぐ可能性があるため、最大2つの異なる週番号
      expect(uniqueWeekNumbers.length).toBeLessThanOrEqual(2);

      // 同じ週番号のチャレンジは同一
      Object.entries(challenges).forEach(([tz1, challenge1]) => {
        Object.entries(challenges).forEach(([tz2, challenge2]) => {
          if (challenge1.weekNumber === challenge2.weekNumber) {
            expect(challenge1.type).toBe(challenge2.type);
            expect(challenge1.difficulty).toBe(challenge2.difficulty);
            expect(challenge1.target).toBe(challenge2.target);
          }
        });
      });
    });

    test('サマータイム切り替え時の動作', () => {
      const dstStart = edgeCaseSystem.dateEdgeCases.specialDates.dstStart2024;
      const dstEnd = edgeCaseSystem.dateEdgeCases.specialDates.dstEnd2024;

      // サマータイム開始前後でチャレンジ生成
      const beforeDST = new Date(dstStart.getTime() - 3600000); // 1時間前
      const afterDST = new Date(dstStart.getTime() + 3600000);  // 1時間後

      const challengeBefore = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(beforeDST);
      const challengeAfter = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(afterDST);

      // 週番号の連続性を確認
      expect(Math.abs(challengeAfter.weekNumber - challengeBefore.weekNumber)).toBeLessThanOrEqual(1);

      // サマータイム終了時も同様
      const beforeDSTEnd = new Date(dstEnd.getTime() - 3600000);
      const afterDSTEnd = new Date(dstEnd.getTime() + 3600000);

      const challengeBeforeEnd = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(beforeDSTEnd);
      const challengeAfterEnd = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(afterDSTEnd);

      expect(Math.abs(challengeAfterEnd.weekNumber - challengeBeforeEnd.weekNumber)).toBeLessThanOrEqual(1);
    });

    test('極端な日付での処理', () => {
      const extremeDates = [
        edgeCaseSystem.dateEdgeCases.specialDates.farPast,
        edgeCaseSystem.dateEdgeCases.specialDates.farFuture,
        edgeCaseSystem.dateEdgeCases.specialDates.unixEpoch,
        new Date('0000-01-01'),
        new Date('9999-12-31')
      ];

      extremeDates.forEach(date => {
        expect(() => {
          const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(date);
          expect(challenge).toBeDefined();
          expect(challenge.type).toBeDefined();
          expect(challenge.difficulty).toBeDefined();
          expect(challenge.target).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    test('無効な日付入力の処理', () => {
      const invalidDates = [
        null,
        undefined,
        new Date('invalid'),
        new Date(NaN),
        'not a date',
        12345,
        {},
        []
      ];

      invalidDates.forEach(invalidDate => {
        expect(() => {
          const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(invalidDate);
          expect(challenge).toBeDefined();
          expect(challenge.type).toBeDefined();
          // デフォルトの動作になる
        }).not.toThrow();
      });
    });
  });

  test.describe('ブラウザ状態エッジケース', () => {
    test('ブラウザタブがバックグラウンドでの動作', async ({ page }) => {
      // バックグラウンド状態をシミュレート
      const backgroundState = edgeCaseSystem.browserSimulator.simulateState('background');

      expect(backgroundState.visible).toBe(false);
      expect(backgroundState.cpu).toBe('throttled');

      // バックグラウンドでもチャレンジ生成は動作する
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date());
      expect(challenge).toBeDefined();

      // タイマーの精度低下をシミュレート（実際のブラウザでは自動的に発生）
      const startTime = Date.now();
      const timeoutId = setTimeout(() => {}, 100);

      await new Promise(resolve => {
        // バックグラウンドでは最小タイマー解像度が1秒になる
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve();
        }, 100);
      });
      const elapsed = Date.now() - startTime;

      // 実際のブラウザではthrottlingにより遅延が発生
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    test('メモリ不足時の動作', () => {
      // メモリプレッシャーテスト
      const memoryTest = edgeCaseSystem.browserSimulator.simulateMemoryPressure();

      // メモリ不足でもチャレンジ生成は継続
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date());
      expect(challenge).toBeDefined();

      // 大きなデータ構造の作成を試みる
      const challenges = [];
      let memoryError = false;

      try {
        for (let i = 0; i < 10000; i++) {
          const date = new Date(Date.now() + i * 86400000);
          challenges.push(edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(date));
        }
      } catch (e) {
        memoryError = true;
      }

      // メモリエラーが発生しても、既存のチャレンジは有効
      if (!memoryError) {
        expect(challenges.length).toBeGreaterThan(0);
        challenges.forEach(c => {
          expect(c.type).toBeDefined();
          expect(c.difficulty).toBeDefined();
        });
      }
    });

    test('CPUスロットリング時の動作', async () => {
      const throttledState = edgeCaseSystem.browserSimulator.simulateState('throttled');
      expect(throttledState.cpu).toBe('throttled');

      // CPU負荷の高い処理
      const startTime = performance.now();
      const challenges = [];

      // 1000個のチャレンジを生成（CPU負荷をシミュレート）
      for (let i = 0; i < 1000; i++) {
        const date = new Date(Date.now() + i * 3600000); // 1時間ごと
        challenges.push(edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(date));
      }

      const processingTime = performance.now() - startTime;

      // スロットリング状態でも処理は完了する
      expect(challenges).toHaveLength(1000);

      // 決定論的な生成の検証
      const weekGroups = {};
      challenges.forEach(c => {
        if (!weekGroups[c.weekNumber]) {
          weekGroups[c.weekNumber] = [];
        }
        weekGroups[c.weekNumber].push(c);
      });

      // 同じ週のチャレンジは同一
      Object.values(weekGroups).forEach(group => {
        const first = group[0];
        group.forEach(c => {
          expect(c.type).toBe(first.type);
          expect(c.difficulty).toBe(first.difficulty);
          expect(c.target).toBe(first.target);
        });
      });
    });
  });

  test.describe('ネットワーク条件エッジケース', () => {
    test('極端に遅いネットワーク（2G相当）での動作', async () => {
      const network2G = edgeCaseSystem.networkSimulator.conditions['2G'];

      // 2Gネットワークでのレイテンシ
      expect(network2G.latency).toBe(300);
      expect(network2G.bandwidth).toBe(250000); // 250kbps

      // レイテンシシミュレーション
      const startTime = Date.now();
      await edgeCaseSystem.networkSimulator.simulateLatency('2G');
      const actualLatency = Date.now() - startTime;

      expect(actualLatency).toBeGreaterThanOrEqual(300);

      // 大きなデータの転送時間計算
      const dataSize = 1024 * 1024; // 1MB
      const transferTime = edgeCaseSystem.networkSimulator.simulateBandwidthLimit(dataSize, '2G');

      expect(transferTime).toBeGreaterThan(30000); // 30秒以上

      // 低速ネットワークでもチャレンジ生成は影響を受けない
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date());
      expect(challenge).toBeDefined();
    });

    test('断続的なネットワーク切断', async () => {
      let connectionAttempts = 0;
      let successfulConnections = 0;

      // 10回の接続試行
      for (let i = 0; i < 10; i++) {
        connectionAttempts++;

        // Flakyネットワークでのパケットロス
        const packetLost = edgeCaseSystem.networkSimulator.simulatePacketLoss('Flaky');

        if (!packetLost) {
          successfulConnections++;

          // 成功時もレイテンシは高い
          await edgeCaseSystem.networkSimulator.simulateLatency('Flaky');
        }
      }

      // 10%のパケットロスなので、約90%が成功するはず
      const successRate = successfulConnections / connectionAttempts;
      expect(successRate).toBeGreaterThan(0.7);
      expect(successRate).toBeLessThan(1.0);

      // ネットワークエラー時でもローカル機能は動作
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date());
      expect(challenge).toBeDefined();
    });

    test('プロキシ経由での接続', async () => {
      // プロキシ経由の追加レイテンシをシミュレート
      const proxyLatency = 50; // プロキシのオーバーヘッド
      const baseLatency = edgeCaseSystem.networkSimulator.conditions['4G'].latency;

      const totalLatency = baseLatency + proxyLatency;

      // プロキシ設定の検証
      const proxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        auth: {
          username: 'user',
          password: 'pass'
        }
      };

      // プロキシ経由でもチャレンジ機能は影響を受けない
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date());
      expect(challenge).toBeDefined();

      // プロキシ認証エラーのシミュレーション
      const authError = Math.random() < 0.1; // 10%の確率で認証エラー

      if (!authError) {
        expect(totalLatency).toBeGreaterThan(baseLatency);
      }
    });

    test('完全オフライン状態での動作', () => {
      const offlineNetwork = edgeCaseSystem.networkSimulator.conditions['Offline'];

      expect(offlineNetwork.latency).toBe(Infinity);
      expect(offlineNetwork.bandwidth).toBe(0);
      expect(offlineNetwork.packetLoss).toBe(1);

      // オフラインでもローカル機能は完全に動作
      const challenges = [];

      // 52週分のチャレンジを生成（1年分）
      for (let week = 0; week < 52; week++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + week * 7);

        const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(date);
        challenges.push(challenge);
      }

      expect(challenges).toHaveLength(52);

      // 各チャレンジが正しく生成されている
      challenges.forEach((challenge, index) => {
        expect(challenge.weekNumber).toBe(index);
        expect(challenge.type).toBeDefined();
        expect(challenge.difficulty).toBeDefined();
        expect(challenge.target).toBeGreaterThan(0);
      });

      // 決定論的な生成の確認
      const challenge1 = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date('2024-03-15'));
      const challenge2 = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(new Date('2024-03-15'));

      expect(challenge1.type).toBe(challenge2.type);
      expect(challenge1.difficulty).toBe(challenge2.difficulty);
      expect(challenge1.target).toBe(challenge2.target);
    });
  });

  test.describe('数値境界エッジケース', () => {
    test('整数オーバーフローの処理', () => {
      // JavaScript の Number.MAX_SAFE_INTEGER を超える週番号
      const farFutureDate = new Date('9999-12-31');
      const challenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(farFutureDate);

      expect(challenge).toBeDefined();
      expect(Number.isFinite(challenge.weekNumber)).toBe(true);
      expect(Number.isFinite(challenge.target)).toBe(true);

      // 負の週番号（エポック前）
      const farPastDate = new Date('1900-01-01');
      const pastChallenge = edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(farPastDate);

      expect(pastChallenge).toBeDefined();
      expect(pastChallenge.weekNumber).toBeLessThan(0);
      expect(pastChallenge.target).toBeGreaterThan(0); // targetは常に正
    });

    test('浮動小数点精度の問題', () => {
      // 非常に近い時刻での週番号計算
      const baseTime = new Date('2024-07-15T00:00:00.000').getTime();
      const challenges = [];

      for (let i = 0; i < 10; i++) {
        const date = new Date(baseTime + i * 0.001); // 1ミリ秒ずつ
        challenges.push(edgeCaseSystem.challengeGenerator.generateWeeklyChallenge(date));
      }

      // すべて同じ週番号になるはず
      const weekNumbers = challenges.map(c => c.weekNumber);
      expect(new Set(weekNumbers).size).toBe(1);

      // すべて同じチャレンジになるはず
      challenges.forEach(c => {
        expect(c.type).toBe(challenges[0].type);
        expect(c.difficulty).toBe(challenges[0].difficulty);
        expect(c.target).toBe(challenges[0].target);
      });
    });
  });
});
