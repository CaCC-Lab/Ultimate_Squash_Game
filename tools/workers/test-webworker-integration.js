/**
 * WebWorker並列処理フェーズ4 - 統合テスト実行スクリプト
 * Ultimate Squash Game WebWorkerシステム実証テスト
 *
 * 機能:
 * - WorkerIntegrationControllerの動作検証
 * - 全Workerの正常動作確認
 * - パフォーマンス測定
 * - エラーハンドリング検証
 */

import WorkerIntegrationController from './worker-integration-controller.js';

/**
 * WebWorker統合テストランナー
 */
class WebWorkerIntegrationTest {
  constructor() {
    this.controller = new WorkerIntegrationController();
    this.testResults = {
      initialization: null,
      pingTests: null,
      gameLoopTest: null,
      performanceMetrics: null,
      errorHandling: null,
      finalReport: null
    };
    this.startTime = 0;
    this.testPassed = false;

    console.log('🧪 WebWorker統合テスト開始準備完了');
  }

  /**
     * 完全なテストスイートの実行
     */
  async runFullTestSuite() {
    console.log('\n🚀 === WebWorker Phase 4 統合テスト実行開始 ===');
    this.startTime = performance.now();

    try {
      // ステップ1: 初期化テスト
      console.log('\n📋 ステップ1: システム初期化テスト');
      await this.testInitialization();

      // ステップ2: 基本通信テスト
      console.log('\n📋 ステップ2: Worker基本通信テスト');
      await this.testBasicCommunication();

      // ステップ3: ゲームループテスト
      console.log('\n📋 ステップ3: ゲームループ動作テスト');
      await this.testGameLoop();

      // ステップ4: パフォーマンステスト
      console.log('\n📋 ステップ4: パフォーマンス測定');
      await this.testPerformance();

      // ステップ5: エラーハンドリングテスト
      console.log('\n📋 ステップ5: エラーハンドリング検証');
      await this.testErrorHandling();

      // 最終レポート生成
      await this.generateFinalTestReport();

      this.testPassed = true;
      console.log('\n✅ 統合テスト完了 - 全テスト成功');

    } catch (error) {
      console.error('\n❌ 統合テスト失敗:', error);
      this.testPassed = false;
      await this.generateErrorReport(error);
    } finally {
      await this.cleanup();
    }

    return this.testPassed;
  }

  /**
     * 初期化テスト
     */
  async testInitialization() {
    const startTime = performance.now();

    try {
      // WorkerIntegrationControllerの初期化
      await this.controller.initialize();

      const initTime = performance.now() - startTime;

      this.testResults.initialization = {
        success: true,
        duration: initTime,
        details: 'システム初期化完了'
      };

      console.log(`✅ 初期化テスト成功 (${initTime.toFixed(1)}ms)`);

    } catch (error) {
      this.testResults.initialization = {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };

      throw new Error(`初期化テスト失敗: ${error.message}`);
    }
  }

  /**
     * 基本通信テスト
     */
  async testBasicCommunication() {
    const startTime = performance.now();

    try {
      // 全WorkerにPingテスト実行
      const pingResults = await this.controller.pingAllWorkers();

      // デバッグ用：ping結果の詳細ログ出力
      console.log('🔍 Ping結果詳細:');
      Object.entries(pingResults).forEach(([workerId, result]) => {
        console.log(`  ${workerId}:`, {
          success: result.success,
          latency: result.latency,
          error: result.error,
          responsePayload: result.response
        });
      });

      // 結果検証
      const allWorkersResponding = Object.values(pingResults).every(result => result.success);

      if (!allWorkersResponding) {
        const failedWorkers = Object.entries(pingResults)
          .filter(([, result]) => !result.success)
          .map(([workerId, result]) => `${workerId}: ${result.error}`)
          .join(', ');
        throw new Error(`一部のWorkerが応答していません: ${failedWorkers}`);
      }

      // 平均レスポンス時間の計算
      const avgLatency = Object.values(pingResults)
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.latency, 0) / 3;

      this.testResults.pingTests = {
        success: true,
        duration: performance.now() - startTime,
        results: pingResults,
        averageLatency: avgLatency,
        details: '全Worker正常応答'
      };

      console.log(`✅ 基本通信テスト成功 - 平均レスポンス: ${avgLatency.toFixed(1)}ms`);

    } catch (error) {
      this.testResults.pingTests = {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };

      throw new Error(`基本通信テスト失敗: ${error.message}`);
    }
  }

  /**
     * ゲームループテスト
     */
  async testGameLoop() {
    const startTime = performance.now();

    try {
      console.log('🎮 5秒間のゲームループテスト開始...');

      // テスト用の短い期間でゲームループを実行
      this.controller.testConfig.duration = 5000; // 5秒間
      this.controller.testConfig.logLevel = 'info';

      // ゲームループ開始
      await this.controller.startDemoGameLoop();

      // 5秒間待機
      await this.sleep(5500);

      // パフォーマンス統計の取得
      const stats = this.controller.performanceStats;
      const expectedFrames = (5000 / (1000 / 60)) * 0.8; // 80%効率での期待フレーム数

      if (stats.framesProcessed < expectedFrames) {
        throw new Error(`フレーム処理数不足: ${stats.framesProcessed} < ${expectedFrames}`);
      }

      this.testResults.gameLoopTest = {
        success: true,
        duration: performance.now() - startTime,
        framesProcessed: stats.framesProcessed,
        averageLatency: stats.averageLatency,
        errors: stats.errors.length,
        details: 'ゲームループ正常動作'
      };

      console.log(`✅ ゲームループテスト成功 - ${stats.framesProcessed}フレーム処理`);

    } catch (error) {
      this.testResults.gameLoopTest = {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };

      throw new Error(`ゲームループテスト失敗: ${error.message}`);
    }
  }

  /**
     * パフォーマンステスト
     */
  async testPerformance() {
    const startTime = performance.now();

    try {
      console.log('⚡ パフォーマンス測定開始...');

      // 高負荷ゲームループテスト（3秒間、90FPS目標）
      this.controller.testConfig.duration = 3000;
      this.controller.testConfig.targetFPS = 90;
      this.controller.testConfig.logLevel = 'debug';

      // パフォーマンス測定前の状態リセット
      this.controller.performanceStats = {
        startTime: 0,
        framesProcessed: 0,
        totalLatency: 0,
        averageLatency: 0,
        workerResponseTimes: new Map(),
        errors: []
      };

      // 高負荷テスト実行
      await this.controller.startDemoGameLoop();
      await this.sleep(3500);

      const finalStats = this.controller.performanceStats;
      const actualFPS = this.controller.calculateCurrentFPS();
      const targetFPS = this.controller.testConfig.targetFPS;
      const fpsEfficiency = (actualFPS / targetFPS) * 100;

      // パフォーマンス判定基準
      const performanceThresholds = {
        minFPSEfficiency: 70, // 70%以上
        maxAverageLatency: 20, // 20ms以下
        maxErrors: 10 // 10個以下
      };

      const performanceIssues = [];

      if (fpsEfficiency < performanceThresholds.minFPSEfficiency) {
        performanceIssues.push(`FPS効率不足: ${fpsEfficiency.toFixed(1)}%`);
      }

      if (finalStats.averageLatency > performanceThresholds.maxAverageLatency) {
        performanceIssues.push(`平均レスポンス時間過大: ${finalStats.averageLatency.toFixed(1)}ms`);
      }

      if (finalStats.errors.length > performanceThresholds.maxErrors) {
        performanceIssues.push(`エラー数過多: ${finalStats.errors.length}個`);
      }

      this.testResults.performanceMetrics = {
        success: performanceIssues.length === 0,
        duration: performance.now() - startTime,
        actualFPS: actualFPS,
        targetFPS: targetFPS,
        fpsEfficiency: fpsEfficiency,
        averageLatency: finalStats.averageLatency,
        totalFrames: finalStats.framesProcessed,
        errorCount: finalStats.errors.length,
        issues: performanceIssues,
        details: performanceIssues.length === 0 ? 'パフォーマンス要件達成' : `問題検出: ${performanceIssues.join(', ')}`
      };

      if (performanceIssues.length > 0) {
        throw new Error(`パフォーマンス要件未達成: ${performanceIssues.join(', ')}`);
      }

      console.log(`✅ パフォーマンステスト成功 - FPS効率: ${fpsEfficiency.toFixed(1)}%`);

    } catch (error) {
      this.testResults.performanceMetrics = {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };

      throw new Error(`パフォーマンステスト失敗: ${error.message}`);
    }
  }

  /**
     * エラーハンドリングテスト
     */
  async testErrorHandling() {
    const startTime = performance.now();

    try {
      console.log('🛡️ エラーハンドリング検証開始...');

      // 意図的にエラーを発生させてハンドリングをテスト
      const errorTests = [];

      // テスト1: 無効なメッセージ送信
      try {
        await this.controller.workerManager.sendMessage('invalid-worker', {
          type: 'INVALID_MESSAGE',
          payload: {}
        }, 1000);
        errorTests.push({ test: 'invalid_worker', handled: false });
      } catch (error) {
        errorTests.push({ test: 'invalid_worker', handled: true, error: error.message });
      }

      // テスト2: タイムアウトテスト
      try {
        await this.controller.workerManager.sendMessage('game-logic', {
          type: 'PING',
          payload: {}
        }, 1); // 極短タイムアウト
        errorTests.push({ test: 'timeout', handled: false });
      } catch (error) {
        errorTests.push({ test: 'timeout', handled: true, error: error.message });
      }

      const handledErrors = errorTests.filter(t => t.handled).length;
      const totalErrors = errorTests.length;

      this.testResults.errorHandling = {
        success: handledErrors === totalErrors,
        duration: performance.now() - startTime,
        tests: errorTests,
        handledCount: handledErrors,
        totalCount: totalErrors,
        details: `${handledErrors}/${totalErrors}のエラーが適切にハンドリングされました`
      };

      if (handledErrors < totalErrors) {
        throw new Error(`エラーハンドリング不完全: ${handledErrors}/${totalErrors}`);
      }

      console.log(`✅ エラーハンドリングテスト成功 - ${handledErrors}/${totalErrors}エラー適切処理`);

    } catch (error) {
      this.testResults.errorHandling = {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };

      throw new Error(`エラーハンドリングテスト失敗: ${error.message}`);
    }
  }

  /**
     * 最終テストレポート生成
     */
  async generateFinalTestReport() {
    const totalDuration = performance.now() - this.startTime;
    const passedTests = Object.values(this.testResults).filter(r => r && r.success).length;
    const totalTests = Object.values(this.testResults).filter(r => r !== null).length;

    this.testResults.finalReport = {
      testSuiteSuccess: this.testPassed,
      totalDuration: totalDuration,
      passedTests: passedTests,
      totalTests: totalTests,
      successRate: (passedTests / totalTests) * 100,
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'Server'
      }
    };

    console.log('\n🎯 === WebWorker Phase 4 統合テスト最終レポート ===');
    console.log(`📊 テスト期間: ${(totalDuration/1000).toFixed(1)}秒`);
    console.log(`🎮 成功率: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`⚡ 初期化: ${this.formatTestResult(this.testResults.initialization)}`);
    console.log(`📡 通信テスト: ${this.formatTestResult(this.testResults.pingTests)}`);
    console.log(`🎮 ゲームループ: ${this.formatTestResult(this.testResults.gameLoopTest)}`);
    console.log(`⚡ パフォーマンス: ${this.formatTestResult(this.testResults.performanceMetrics)}`);
    console.log(`🛡️ エラーハンドリング: ${this.formatTestResult(this.testResults.errorHandling)}`);

    if (this.testResults.performanceMetrics && this.testResults.performanceMetrics.success) {
      console.log('\n📈 パフォーマンス詳細:');
      const metrics = this.testResults.performanceMetrics;
      console.log(`  • 実際FPS: ${metrics.actualFPS.toFixed(1)} / 目標FPS: ${metrics.targetFPS}`);
      console.log(`  • FPS効率: ${metrics.fpsEfficiency.toFixed(1)}%`);
      console.log(`  • 平均レスポンス: ${metrics.averageLatency.toFixed(1)}ms`);
      console.log(`  • 処理フレーム数: ${metrics.totalFrames}`);
    }

    const overallSuccess = passedTests === totalTests;
    console.log(`\n${overallSuccess ? '✅ 統合テスト完全成功' : '⚠️ 一部テスト要改善'}`);
    console.log('🎯 WebWorker Phase 4システム準備完了');
  }

  /**
     * エラーレポート生成
     */
  async generateErrorReport(error) {
    console.log('\n❌ === エラーレポート ===');
    console.log(`💥 メインエラー: ${error.message}`);

    Object.entries(this.testResults).forEach(([testName, result]) => {
      if (result && !result.success) {
        console.log(`  • ${testName}: ${result.error || '失敗'}`);
      }
    });

    console.log('\n🔧 推奨対応:');
    console.log('  1. Worker実装の確認');
    console.log('  2. メッセージプロトコルの検証');
    console.log('  3. AOTローダー設定の確認');
    console.log('  4. ブラウザ対応状況の確認');
  }

  /**
     * テスト結果のフォーマット
     */
  formatTestResult(result) {
    if (!result) return '未実行';
    if (result.success) {
      return `✅ 成功 (${result.duration.toFixed(1)}ms)`;
    } else {
      return `❌ 失敗: ${result.error}`;
    }
  }

  /**
     * スリープユーティリティ
     */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
     * クリーンアップ処理
     */
  async cleanup() {
    console.log('🧹 テスト環境クリーンアップ中...');

    try {
      await this.controller.shutdown();
    } catch (error) {
      console.warn('⚠️ クリーンアップ中にエラー:', error.message);
    }
  }
}

// メイン実行関数
async function runWebWorkerIntegrationTest() {
  const tester = new WebWorkerIntegrationTest();

  try {
    const success = await tester.runFullTestSuite();

    if (success) {
      console.log('\n🎉 WebWorker Phase 4統合テスト - 完全成功！');
      console.log('システムは本格運用可能な状態です。');
    } else {
      console.log('\n🔄 WebWorker Phase 4統合テスト - 要改善');
      console.log('一部問題が検出されました。改善が必要です。');
    }

    return success;

  } catch (error) {
    console.error('\n💥 統合テスト実行エラー:', error);
    return false;
  }
}

// 即座に実行（Node.js環境での使用想定）
if (typeof window === 'undefined') {
  runWebWorkerIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行失敗:', error);
      process.exit(1);
    });
}

// ブラウザ環境でのエクスポート
export { WebWorkerIntegrationTest, runWebWorkerIntegrationTest };
export default WebWorkerIntegrationTest;
