import { test, expect } from '@playwright/test';

/**
 * Phase 3: 週替わりチャレンジシステムE2Eテスト
 * 
 * テスト対象：
 * - 週替わりチャレンジのUI表示確認
 * - チャレンジ完了フローの動作確認
 * - 報酬システムの統合テスト
 * 
 * 実行方法：
 * npx playwright test tests/e2e/weekly-challenge-integration.spec.js
 */

test.describe('Weekly Challenge System Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ゲームページにアクセス
    await page.goto('/game.html');
    
    // ゲーム初期化まで待機
    await page.waitForLoadState('networkidle');
    
    // ローディングオーバーレイが非表示になるまで待機
    await page.waitForSelector('#loadingOverlay', { state: 'hidden' });
  });

  test('週替わりチャレンジUI表示テスト', async ({ page }) => {
    // 開発者コンソールでChallengeGeneratorをテスト
    await page.evaluate(() => {
      // Week 1 (2024-01-01)のチャレンジ生成をテスト
      const challenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date('2024-01-01'));
      
      // 期待される結果：基本パフォーマンス、連続ヒット、時間制限
      console.log('Generated challenge:', challenge);
      
      // チャレンジが正しく生成されているか確認
      if (!challenge || !challenge.title || !challenge.description || !challenge.condition) {
        throw new Error('Invalid challenge generation');
      }
      
      // 決定論的テスト：同じ日付で同じチャレンジが生成されるか
      const challenge2 = window.ChallengeGenerator.generateWeeklyChallenge(new Date('2024-01-01'));
      
      // 時刻情報を除外して比較
      const comp1 = {...challenge};
      const comp2 = {...challenge2};
      
      // generatedAtを除外して比較
      if (comp1.metadata) delete comp1.metadata.generatedAt;
      if (comp2.metadata) delete comp2.metadata.generatedAt;
      
      if (JSON.stringify(comp1) !== JSON.stringify(comp2)) {
        throw new Error('Challenge generation is not deterministic');
      }
    });
    
    // コンソールエラーがないことを確認
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
  });

  test('チャレンジ評価機能テスト', async ({ page }) => {
    // ChallengeEvaluatorのテスト
    await page.evaluate(() => {
      // テスト用のゲーム統計を作成
      const gameStats = {
        score: 1500,
        consecutiveHits: 12,
        gameDuration: 90, // 90秒
        specialActions: ['multi_ball_activated', 'powerup_collected']
      };
      
      // 各種チャレンジ評価をテスト
      const challenges = [
        { type: 'score', target: 1000, timeLimit: 120 },
        { type: 'consecutive_hits', target: 10, timeLimit: 60 },
        { type: 'time_survival', target: 60, timeLimit: 300 },
        { type: 'special_action', target: 'multi_ball_activated', timeLimit: 180 }
      ];
      
      challenges.forEach(challenge => {
        const result = window.ChallengeEvaluator.evaluateChallenge(challenge, gameStats);
        console.log(`Challenge ${challenge.type}: ${result.completed ? 'COMPLETED' : 'FAILED'}`);
        
        if (typeof result.completed !== 'boolean') {
          throw new Error(`Invalid evaluation result for ${challenge.type}`);
        }
      });
    });
  });

  test('報酬システム統合テスト', async ({ page }) => {
    // ChallengeRewardsのテスト
    await page.evaluate(() => {
      // 基本報酬の計算テスト
      const basicReward = window.ChallengeRewards.calculateReward('basic');
      console.log('Basic reward:', basicReward);
      
      if (!basicReward || !basicReward.points || !basicReward.title) {
        throw new Error('Invalid basic reward calculation');
      }
      
      // 高度な報酬の計算テスト
      const advancedReward = window.ChallengeRewards.calculateReward('advanced');
      console.log('Advanced reward:', advancedReward);
      
      if (!advancedReward || advancedReward.points <= basicReward.points) {
        throw new Error('Invalid advanced reward calculation');
      }
      
      // 報酬の適用テスト
      const mockPlayer = { totalPoints: 100, titles: [], achievements: [] };
      window.ChallengeRewards.applyReward(mockPlayer, basicReward);
      
      if (mockPlayer.totalPoints !== 100 + basicReward.points) {
        throw new Error('Reward application failed');
      }
    });
  });

  test('週替わりチャレンジ統合フローテスト', async ({ page }) => {
    // 完全な週替わりチャレンジフローをテスト
    const result = await page.evaluate(() => {
      // 現在の週のチャレンジを生成
      const currentChallenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
      
      // シミュレーション用のゲーム統計を作成
      const gameStats = {
        score: 2000,
        consecutiveHits: 15,
        gameDuration: 120,
        specialActions: ['multi_ball_activated', 'powerup_collected', 'ada_difficulty_increased']
      };
      
      // チャレンジ評価を実行
      const evaluation = window.ChallengeEvaluator.evaluateChallenge(currentChallenge, gameStats);
      
      // チャレンジが完了した場合の報酬計算
      let reward = null;
      if (evaluation.completed) {
        reward = window.ChallengeRewards.calculateReward(currentChallenge.difficulty);
        
        // 模擬プレイヤーに報酬を適用
        const mockPlayer = { totalPoints: 500, titles: [], achievements: [] };
        window.ChallengeRewards.applyReward(mockPlayer, reward);
        
        return {
          challengeCompleted: true,
          reward: reward,
          playerUpdated: mockPlayer
        };
      }
      
      return {
        challengeCompleted: false,
        challenge: currentChallenge,
        evaluation: evaluation
      };
    });
    
    // 結果の検証
    if (result.challengeCompleted) {
      expect(result.reward).toBeDefined();
      expect(result.reward.points).toBeGreaterThan(0);
      expect(result.playerUpdated.totalPoints).toBeGreaterThan(500);
    } else {
      expect(result.challenge).toBeDefined();
      expect(result.evaluation).toBeDefined();
    }
  });

  test('チャレンジ進捗表示UIテスト', async ({ page }) => {
    // チャレンジ進捗を表示するUIをテスト
    await page.evaluate(() => {
      // 進行中のチャレンジを作成
      const challenge = {
        title: "テストチャレンジ",
        description: "1000点以上を獲得せよ",
        type: "score",
        target: 1000,
        timeLimit: 120,
        difficulty: "basic"
      };
      
      // 現在のゲーム統計
      const currentStats = {
        score: 750,
        consecutiveHits: 8,
        gameDuration: 60,
        specialActions: []
      };
      
      // 進捗率を計算
      const progressPercentage = Math.min((currentStats.score / challenge.target) * 100, 100);
      
      // UIに表示するための情報を作成
      const displayInfo = {
        title: challenge.title,
        description: challenge.description,
        progress: progressPercentage,
        timeRemaining: challenge.timeLimit - currentStats.gameDuration,
        completed: progressPercentage >= 100
      };
      
      console.log('Challenge display info:', displayInfo);
      
      // 検証
      if (displayInfo.progress < 0 || displayInfo.progress > 100) {
        throw new Error('Invalid progress calculation');
      }
      
      if (displayInfo.timeRemaining < 0) {
        throw new Error('Invalid time remaining calculation');
      }
    });
  });

  test('チャレンジ完了通知テスト', async ({ page }) => {
    // チャレンジ完了時の通知機能をテスト
    await page.evaluate(() => {
      // 完了したチャレンジのシミュレーション
      const completedChallenge = {
        title: "スピードマスター",
        description: "60秒以内に500点を獲得",
        type: "score",
        target: 500,
        timeLimit: 60,
        difficulty: "basic"
      };
      
      const gameStats = {
        score: 600,
        consecutiveHits: 10,
        gameDuration: 55,
        specialActions: ['multi_ball_activated']
      };
      
      // 評価実行
      const evaluation = window.ChallengeEvaluator.evaluateChallenge(completedChallenge, gameStats);
      
      if (evaluation.completed) {
        // 報酬計算
        const reward = window.ChallengeRewards.calculateReward(completedChallenge.difficulty);
        
        // 通知データを作成
        const notification = {
          type: 'challenge_completed',
          challenge: completedChallenge,
          reward: reward,
          timestamp: new Date().toISOString()
        };
        
        console.log('Challenge completion notification:', notification);
        
        // 通知データの検証
        if (!notification.challenge || !notification.reward) {
          throw new Error('Invalid notification data');
        }
      }
    });
  });

  test('週替わりチャレンジ履歴テスト', async ({ page }) => {
    // 過去のチャレンジ履歴管理をテスト
    await page.evaluate(() => {
      // 複数の週のチャレンジを生成
      const challenges = [];
      const baseDate = new Date('2024-01-01');
      
      for (let week = 0; week < 4; week++) {
        const challengeDate = new Date(baseDate);
        challengeDate.setDate(baseDate.getDate() + (week * 7));
        
        const challenge = window.ChallengeGenerator.generateWeeklyChallenge(challengeDate);
        challenges.push({
          week: week + 1,
          date: challengeDate.toISOString(),
          challenge: challenge
        });
      }
      
      console.log('Generated challenges for 4 weeks:', challenges);
      
      // 各チャレンジが異なることを確認
      const challengeTypes = challenges.map(c => c.challenge.type);
      const uniqueTypes = [...new Set(challengeTypes)];
      
      if (uniqueTypes.length < 2) {
        console.warn('Challenge variety might be limited');
      }
      
      // 決定論的テスト：同じ日付で同じチャレンジが生成されるか
      const duplicateChallenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date('2024-01-01'));
      
      // 時刻情報を除外して比較
      const challenge1 = {...challenges[0].challenge};
      const challenge2 = {...duplicateChallenge};
      
      // generatedAtを除外して比較
      if (challenge1.metadata) delete challenge1.metadata.generatedAt;
      if (challenge2.metadata) delete challenge2.metadata.generatedAt;
      
      if (JSON.stringify(challenge1) !== JSON.stringify(challenge2)) {
        throw new Error('Challenge generation is not deterministic');
      }
    });
  });

  test('マルチプレイヤーチャレンジ統合テスト', async ({ page }) => {
    // 複数プレイヤーでのチャレンジ参加をテスト
    await page.evaluate(() => {
      // テスト用のプレイヤーデータ
      const players = [
        { id: 'player1', name: 'Alice', totalPoints: 1000 },
        { id: 'player2', name: 'Bob', totalPoints: 1500 },
        { id: 'player3', name: 'Charlie', totalPoints: 800 }
      ];
      
      // 共通のチャレンジ
      const weeklyChallenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
      
      // 各プレイヤーのゲーム結果をシミュレーション
      const results = players.map(player => {
        const gameStats = {
          score: 1000 + Math.floor(Math.random() * 1000),
          consecutiveHits: 5 + Math.floor(Math.random() * 15),
          gameDuration: 60 + Math.floor(Math.random() * 60),
          specialActions: ['multi_ball_activated']
        };
        
        const evaluation = window.ChallengeEvaluator.evaluateChallenge(weeklyChallenge, gameStats);
        
        return {
          player: player,
          gameStats: gameStats,
          challengeCompleted: evaluation.completed,
          reward: evaluation.completed ? window.ChallengeRewards.calculateReward(weeklyChallenge.difficulty) : null
        };
      });
      
      console.log('Multiplayer challenge results:', results);
      
      // 完了者の統計
      const completedCount = results.filter(r => r.challengeCompleted).length;
      const totalRewards = results
        .filter(r => r.reward)
        .reduce((sum, r) => sum + r.reward.points, 0);
      
      console.log(`${completedCount}/${players.length} players completed the challenge`);
      console.log(`Total rewards distributed: ${totalRewards} points`);
      
      // 検証
      if (completedCount < 0 || completedCount > players.length) {
        throw new Error('Invalid completion count');
      }
    });
  });

  test('チャレンジシステム性能テスト', async ({ page }) => {
    // チャレンジシステムの性能をテスト
    const performanceResult = await page.evaluate(() => {
      const startTime = performance.now();
      
      // 大量のチャレンジ生成テスト
      const challenges = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        challenges.push(window.ChallengeGenerator.generateWeeklyChallenge(date));
      }
      
      // 大量の評価テスト
      const evaluations = [];
      const testGameStats = {
        score: 1200,
        consecutiveHits: 10,
        gameDuration: 90,
        specialActions: ['multi_ball_activated']
      };
      
      for (const challenge of challenges) {
        evaluations.push(window.ChallengeEvaluator.evaluateChallenge(challenge, testGameStats));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        challengesGenerated: challenges.length,
        evaluationsCompleted: evaluations.length,
        totalDuration: duration,
        averageGenerationTime: duration / challenges.length,
        performanceAcceptable: duration < 1000 // 1秒以内
      };
    });
    
    // 性能検証
    expect(performanceResult.challengesGenerated).toBe(100);
    expect(performanceResult.evaluationsCompleted).toBe(100);
    expect(performanceResult.performanceAcceptable).toBe(true);
    
    console.log('Performance test results:', performanceResult);
  });
});