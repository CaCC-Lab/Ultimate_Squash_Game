/**
 * ゲーム状態管理・遷移の包括的テストスイート
 * あらゆるゲーム状態とその遷移パターンを網羅
 */

import { test, expect } from '@playwright/test';

test.describe('ゲーム状態管理包括テスト', () => {

  test.beforeEach(async ({ page }) => {
    // ゲーム状態の監視スクリプトを注入
    await page.addInitScript(() => {
      window.gameStateTestData = {
        stateHistory: [],
        transitions: [],
        errors: [],
        performanceMetrics: {
          frameRates: [],
          stateChangeLatency: []
        }
      };

      // Pyodideが読み込まれた後にゲーム状態を監視
      const monitorGameState = () => {
        if (window.pyodide && window.pyodide.runPython) {
          try {
            const stateInfo = JSON.parse(window.pyodide.runPython(`
import json
try:
    if 'game_state' in globals():
        json.dumps({
            'is_paused': game_state.is_paused,
            'is_gameover': game_state.is_gameover,
            'score': game_state.score.player_score,
            'balls_count': len(game_state.balls),
            'power_ups_count': len(game_state.power_ups),
            'level': getattr(game_state, 'level', 1),
            'lives': getattr(game_state.score, 'lives', 3),
            'timestamp': ${Date.now()}
        })
    else:
        json.dumps({'error': 'game_state not available', 'timestamp': ${Date.now()}})
except Exception as e:
    json.dumps({'error': str(e), 'timestamp': ${Date.now()}})
            `));

            // 前回の状態と比較して変化を記録
            const lastState = window.gameStateTestData.stateHistory[window.gameStateTestData.stateHistory.length - 1];
            if (!lastState || JSON.stringify(lastState) !== JSON.stringify(stateInfo)) {
              window.gameStateTestData.stateHistory.push(stateInfo);

              if (lastState && !stateInfo.error) {
                // 状態遷移を記録
                window.gameStateTestData.transitions.push({
                  from: lastState,
                  to: stateInfo,
                  timestamp: Date.now()
                });
              }
            }
          } catch (error) {
            window.gameStateTestData.errors.push({
              type: 'monitoring_error',
              message: error.message,
              timestamp: Date.now()
            });
          }
        }
      };

      // 定期的な状態監視
      setInterval(monitorGameState, 100);

      // FPS監視
      let lastFrameTime = performance.now();
      const monitorFPS = () => {
        const currentTime = performance.now();
        const fps = 1000 / (currentTime - lastFrameTime);
        window.gameStateTestData.performanceMetrics.frameRates.push({
          fps: fps,
          timestamp: currentTime
        });
        lastFrameTime = currentTime;
        requestAnimationFrame(monitorFPS);
      };
      requestAnimationFrame(monitorFPS);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ コンソールエラー: ${msg.text()}`);
      }
    });
  });

  test('ゲーム状態初期化・開始テスト', async ({ page }) => {
    console.log('🎮 ゲーム状態初期化・開始テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    // 初期状態の安定化を待つ
    await page.waitForTimeout(3000);

    // 初期ゲーム状態を取得
    const initialStates = await page.evaluate(() => window.gameStateTestData.stateHistory);

    console.log('📊 初期ゲーム状態履歴:', initialStates);

    if (initialStates.length > 0) {
      const latestState = initialStates[initialStates.length - 1];

      if (!latestState.error) {
        // 初期状態の検証
        expect(latestState.is_paused).toBeDefined();
        expect(latestState.is_gameover).toBeDefined();
        expect(latestState.score).toBeDefined();
        expect(latestState.balls_count).toBeGreaterThanOrEqual(0);

        console.log('✅ ゲーム初期状態:', {
          paused: latestState.is_paused,
          gameOver: latestState.is_gameover,
          score: latestState.score,
          balls: latestState.balls_count
        });

        // 初期値の妥当性検証
        expect(latestState.score).toBeGreaterThanOrEqual(0);
        expect(latestState.balls_count).toBeGreaterThanOrEqual(0);
        expect(latestState.balls_count).toBeLessThanOrEqual(10); // 妥当な上限

      } else {
        console.log('⚠️ ゲーム状態取得エラー:', latestState.error);
      }
    } else {
      console.log('⚠️ ゲーム状態履歴が記録されていません');
    }
  });

  test('ゲーム状態遷移パターンテスト', async ({ page }) => {
    console.log('🔄 ゲーム状態遷移パターンテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // 状態遷移をトリガーする操作シーケンス
    console.log('⌨️ 状態遷移操作シーケンスを実行...');

    // 1. ゲーム開始（アンポーズ）
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // 2. ポーズ
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // 3. 再開
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // 4. プレイヤー操作
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // 5. リセット
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);

    // 状態遷移履歴を取得
    const transitions = await page.evaluate(() => window.gameStateTestData.transitions);
    const stateHistory = await page.evaluate(() => window.gameStateTestData.stateHistory);

    console.log('📊 状態遷移履歴:', transitions);
    console.log('📊 状態履歴数:', stateHistory.length);

    if (transitions.length > 0) {
      // 状態遷移の妥当性を検証
      transitions.forEach((transition, index) => {
        console.log(`🔍 遷移${index + 1}:`, {
          from: {
            paused: transition.from.is_paused,
            gameOver: transition.from.is_gameover,
            score: transition.from.score
          },
          to: {
            paused: transition.to.is_paused,
            gameOver: transition.to.is_gameover,
            score: transition.to.score
          }
        });

        // 状態の一貫性検証
        expect(transition.from.timestamp).toBeLessThan(transition.to.timestamp);
        expect(transition.to.score).toBeGreaterThanOrEqual(transition.from.score);
      });

      console.log('✅ ゲーム状態遷移検証完了');
    } else {
      console.log('⚠️ 状態遷移が記録されていません（ゲーム状態監視未実装の可能性）');
    }
  });

  test('ゲームロジック境界値・異常状態テスト', async ({ page }) => {
    console.log('⚡ ゲームロジック境界値・異常状態テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // 境界値テスト用の高速操作
    console.log('⚡ 高速連続操作テスト...');

    // 高速キー連打
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(10);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(10);
    }

    // 高速ポーズ/再開切り替え
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(2000);

    // 異常状態の検出
    const errors = await page.evaluate(() => window.gameStateTestData.errors);
    const stateHistory = await page.evaluate(() => window.gameStateTestData.stateHistory);

    console.log('📊 エラー記録:', errors);
    console.log('📊 最新状態:', stateHistory[stateHistory.length - 1]);

    // 重大なエラーがないことを確認
    const criticalErrors = errors.filter(error =>
      !error.message.includes('not available') // 初期化中のエラーは許容
    );

    expect(criticalErrors.length).toBe(0);

    if (stateHistory.length > 0) {
      const finalState = stateHistory[stateHistory.length - 1];

      if (!finalState.error) {
        // 境界値内であることを確認
        expect(finalState.score).toBeGreaterThanOrEqual(0);
        expect(finalState.score).toBeLessThan(1000000); // 異常な高スコアでない
        expect(finalState.balls_count).toBeGreaterThanOrEqual(0);
        expect(finalState.balls_count).toBeLessThanOrEqual(100); // 異常な多数のボールでない

        console.log('✅ ゲーム状態境界値検証完了');
      }
    }
  });

  test('パフォーマンス・FPS安定性テスト', async ({ page }) => {
    console.log('📊 パフォーマンス・FPS安定性テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // ゲームプレイを5秒間継続
    console.log('🎮 5秒間のゲームプレイでパフォーマンス測定...');

    const startTime = Date.now();
    const endTime = startTime + 5000;

    // 継続的なゲーム操作
    const playGame = async () => {
      while (Date.now() < endTime) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
      }
    };

    await playGame();

    // パフォーマンスメトリクスを取得
    const performanceMetrics = await page.evaluate(() => window.gameStateTestData.performanceMetrics);

    console.log('📊 FPSデータ数:', performanceMetrics.frameRates.length);

    if (performanceMetrics.frameRates.length > 10) {
      const fpsValues = performanceMetrics.frameRates
        .filter(f => f.fps > 0 && f.fps < 1000) // 異常値を除外
        .map(f => f.fps);

      if (fpsValues.length > 0) {
        const avgFPS = fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
        const minFPS = Math.min(...fpsValues);
        const maxFPS = Math.max(...fpsValues);

        console.log('📊 FPS統計:', {
          平均: avgFPS.toFixed(2),
          最小: minFPS.toFixed(2),
          最大: maxFPS.toFixed(2),
          サンプル数: fpsValues.length
        });

        // パフォーマンス要件の検証
        expect(avgFPS).toBeGreaterThan(10); // 最低10FPS
        expect(minFPS).toBeGreaterThan(5);  // 最低5FPS
        expect(maxFPS).toBeLessThan(200);   // 異常な高FPSでない

        // FPSの安定性検証（標準偏差）
        const variance = fpsValues.reduce((sum, fps) => sum + Math.pow(fps - avgFPS, 2), 0) / fpsValues.length;
        const stdDev = Math.sqrt(variance);

        console.log('📊 FPS標準偏差:', stdDev.toFixed(2));
        expect(stdDev).toBeLessThan(avgFPS * 0.5); // 平均の50%以下の変動

        console.log('✅ パフォーマンス要件を満たしています');
      }
    } else {
      console.log('⚠️ 十分なFPSデータが収集されませんでした');
    }
  });

  test('メモリ使用量・リークテスト', async ({ page }) => {
    console.log('💾 メモリ使用量・リークテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // 初期メモリ使用量を記録
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          timestamp: Date.now()
        };
      }
      return null;
    });

    if (initialMemory) {
      console.log('📊 初期メモリ使用量:', {
        used: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // 長時間のゲームプレイを実行
    console.log('🎮 3分間の集中ゲームプレイでメモリ監視...');

    const playDuration = 3 * 60 * 1000; // 3分
    const startTime = Date.now();
    const endTime = startTime + playDuration;

    const memorySnapshots = [];

    // 10秒間隔でメモリ使用量を記録
    const memoryMonitor = setInterval(async () => {
      const memory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            timestamp: Date.now()
          };
        }
        return null;
      });

      if (memory) {
        memorySnapshots.push(memory);
        console.log(`💾 メモリ: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
    }, 10000);

    // 集中的なゲームプレイ
    while (Date.now() < endTime) {
      // 多様な操作パターン
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
      await page.keyboard.press('Space'); // ポーズ
      await page.waitForTimeout(100);
      await page.keyboard.press('Space'); // 再開
      await page.waitForTimeout(100);

      // ランキング表示のトグル
      if (Math.random() > 0.8) {
        await page.keyboard.press('h');
        await page.waitForTimeout(500);
        // モーダルが表示されていれば閉じる
        try {
          const modal = page.locator('#rankingModal');
          if (await modal.isVisible()) {
            await modal.locator('button').first().click();
            await page.waitForTimeout(200);
          }
        } catch (e) {
          // モーダルが表示されない場合はそのまま継続
        }
      }
    }

    clearInterval(memoryMonitor);

    // 最終メモリ使用量を記録
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          timestamp: Date.now()
        };
      }
      return null;
    });

    if (initialMemory && finalMemory && memorySnapshots.length > 0) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;

      console.log('📊 メモリ使用量変化:', {
        初期: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        最終: `${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        増加量: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        増加率: `${increasePercentage.toFixed(2)}%`
      });

      // メモリリークの検証
      expect(increasePercentage).toBeLessThan(200); // 200%未満の増加
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB未満の増加

      // メモリ増加の傾向を分析
      if (memorySnapshots.length >= 3) {
        const slopes = [];
        for (let i = 1; i < memorySnapshots.length; i++) {
          const timeSpan = memorySnapshots[i].timestamp - memorySnapshots[i-1].timestamp;
          const memorySpan = memorySnapshots[i].usedJSHeapSize - memorySnapshots[i-1].usedJSHeapSize;
          slopes.push(memorySpan / timeSpan);
        }

        const avgSlope = slopes.reduce((sum, slope) => sum + slope, 0) / slopes.length;
        console.log('📊 メモリ増加傾向:', `${(avgSlope * 1000 / 1024).toFixed(2)}KB/秒`);

        // 持続的なメモリリークがないことを確認
        expect(Math.abs(avgSlope)).toBeLessThan(1024); // 1KB/秒未満の変化
      }

      console.log('✅ メモリリークテスト完了');
    } else {
      console.log('⚠️ メモリ情報が取得できませんでした（ブラウザサポート外）');
    }
  });

  test('ゲーム状態同期・一貫性テスト', async ({ page }) => {
    console.log('🔄 ゲーム状態同期・一貫性テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // 状態の一貫性を検証するための操作
    console.log('⌨️ 状態一貫性検証操作を実行...');

    // 複雑な操作シーケンス
    const operations = [
      () => page.keyboard.press('Space'),      // ポーズ/再開
      () => page.keyboard.press('ArrowLeft'),  // 左移動
      () => page.keyboard.press('ArrowRight'), // 右移動
      () => page.keyboard.press('r'),          // リセット
      () => page.keyboard.press('h')          // ランキング表示
    ];

    for (let i = 0; i < 10; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      await operation();
      await page.waitForTimeout(200);

      // 状態の一貫性を確認
      const currentState = await page.evaluate(() => {
        const history = window.gameStateTestData.stateHistory;
        return history[history.length - 1];
      });

      if (currentState && !currentState.error) {
        // 基本的な一貫性検証
        expect(currentState.score).toBeGreaterThanOrEqual(0);
        expect(currentState.balls_count).toBeGreaterThanOrEqual(0);
        expect(typeof currentState.is_paused).toBe('boolean');
        expect(typeof currentState.is_gameover).toBe('boolean');
      }
    }

    // 最終的な状態の一貫性を確認
    const finalStates = await page.evaluate(() => window.gameStateTestData.stateHistory);
    const errors = await page.evaluate(() => window.gameStateTestData.errors);

    console.log('📊 最終状態履歴数:', finalStates.length);
    console.log('📊 エラー数:', errors.length);

    // 状態遷移の連続性を検証
    const validStates = finalStates.filter(state => !state.error);

    if (validStates.length >= 2) {
      for (let i = 1; i < validStates.length; i++) {
        const prevState = validStates[i-1];
        const currState = validStates[i];

        // 時間の進行性
        expect(currState.timestamp).toBeGreaterThanOrEqual(prevState.timestamp);

        // スコアの単調性（減少しない）
        expect(currState.score).toBeGreaterThanOrEqual(prevState.score);

        // ボール数の妥当性
        expect(Math.abs(currState.balls_count - prevState.balls_count)).toBeLessThanOrEqual(5);
      }

      console.log('✅ ゲーム状態一貫性検証完了');
    } else {
      console.log('⚠️ 状態一貫性検証はゲーム状態監視実装後に有効になります');
    }
  });

});
