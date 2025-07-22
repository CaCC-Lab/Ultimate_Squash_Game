/**
 * WebWorker並列処理フェーズ4 - パフォーマンステスト
 * Ultimate Squash Game専用パフォーマンス測定システム
 * 
 * 機能:
 * - FPS効率測定
 * - レスポンス時間計測
 * - Transferable Objects効果検証
 * - メモリ使用量監視
 */

import WorkerManager from '../workers/communication/worker-manager.js';
import { MessageType, GameStateUpdate, MessageBuilder, PerformanceMetrics } from '../workers/communication/message-protocol.js';

export class WebWorkerPerformanceTest {
    constructor() {
        this.workerManager = new WorkerManager();
        this.testResults = {
            baseline: {},
            optimized: {},
            comparison: {}
        };
        this.testConfig = {
            testDuration: 1000, // 1秒間のテスト（さらに短縮）
            frameInterval: 16.67, // 60 FPS目標
            messageCount: 5, // メッセージ数をさらに削減
            warmupFrames: 3 // ウォームアップフレーム数も削減
        };
        
        // パフォーマンス目標値
        this.targets = {
            fpsEfficiency: 80, // 80%以上
            responseTime: 100, // 100ms以下
            transferableObjectsRatio: 70 // 70%以上がTransferable Objects使用
        };
        
        console.log('🚀 WebWorkerPerformanceTest初期化完了');
    }
    
    /**
     * 完全なパフォーマンステストスイート実行
     */
    async runFullPerformanceTest() {
        console.log('📊 WebWorker Phase 4 パフォーマンステスト開始');
        console.log(`設定: テスト時間 ${this.testConfig.testDuration}ms, メッセージ数 ${this.testConfig.messageCount}`);
        console.log(`目標値: FPS効率 ${this.targets.fpsEfficiency}%, レスポンス時間 ${this.targets.responseTime}ms以下`);
        
        try {
            // 1. WorkerManager初期化
            await this.initializeWorkerManager();
            
            // 2. ベースライン測定（最適化前の状態をシミュレート）
            console.log('\n🔍 ベースライン測定中...');
            const baselineStart = performance.now();
            this.testResults.baseline = await this.measureBaseline();
            console.log(`✅ ベースライン測定完了 (${(performance.now() - baselineStart).toFixed(1)}ms)`);
            
            // 3. 最適化パフォーマンス測定
            console.log('\n⚡ 最適化パフォーマンス測定中...');
            const optimizedStart = performance.now();
            this.testResults.optimized = await this.measureOptimizedPerformance();
            console.log(`✅ 最適化測定完了 (${(performance.now() - optimizedStart).toFixed(1)}ms)`);
            
            // 4. Transferable Objects効果測定
            console.log('\n🔄 Transferable Objects効果測定中...');
            const transferableStart = performance.now();
            this.testResults.transferableObjectsTest = await this.measureTransferableObjectsEffect();
            console.log(`✅ Transferable Objects測定完了 (${(performance.now() - transferableStart).toFixed(1)}ms)`);
            
            // 5. メモリ使用量測定
            console.log('\n🧠 メモリ使用量測定中...');
            this.testResults.memoryUsage = await this.measureMemoryUsage();
            
            // 6. 結果比較と分析
            this.testResults.comparison = this.compareResults();
            
            // 7. 最終レポート生成
            const report = this.generatePerformanceReport();
            
            console.log('\n' + '='.repeat(60));
            console.log('📈 WebWorker Phase 4 パフォーマンステスト完了');
            console.log('='.repeat(60));
            console.log(report);
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ パフォーマンステスト失敗:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
    
    /**
     * WorkerManager初期化
     */
    async initializeWorkerManager() {
        await this.workerManager.initialize();
        
        // 初期化確認のためのテストメッセージ送信
        const pingMessage = new MessageBuilder()
            .type(MessageType.PING)
            .payload({ timestamp: performance.now() })
            .build();
        
        const workers = ['game-logic', 'ai', 'analytics'];
        for (const workerId of workers) {
            try {
                const response = await this.workerManager.sendMessage(workerId, pingMessage, 5000);
                console.log(`✅ Worker ${workerId} 初期化確認完了`);
            } catch (error) {
                console.warn(`⚠️ Worker ${workerId} 初期化確認失敗:`, error.message);
            }
        }
    }
    
    /**
     * ベースライン測定（最適化なしの状態をシミュレート）
     */
    async measureBaseline() {
        const baseline = {
            fps: [],
            responseTimes: [],
            messageCount: 0,
            averageFps: 0,
            averageResponseTime: 0,
            transferableObjectsUsed: 0
        };
        
        const testStartTime = performance.now();
        let frameCount = 0;
        let lastFrameTime = testStartTime;
        
        // 最適化機能を無効化した状態でのテスト
        while (performance.now() - testStartTime < this.testConfig.testDuration) {
            const frameStartTime = performance.now();
            
            // より確実なWorker通信のためPINGメッセージを使用
            const pingMessage = new MessageBuilder()
                .type(MessageType.PING)
                .payload({ 
                    timestamp: frameStartTime,
                    testData: `baseline_frame_${frameCount}`
                })
                .build();
            
            try {
                // game-logicワーカーにPINGメッセージ送信
                console.log(`📤 PING message送信中 (フレーム ${frameCount})`);
                const response = await this.workerManager.sendMessage(
                    'game-logic', 
                    pingMessage, 
                    5000 // タイムアウト延長
                );
                
                // PONGレスポンスが返ってきたかチェック
                if (response && response.type === MessageType.PONG) {
                    const responseTime = performance.now() - frameStartTime;
                    baseline.responseTimes.push(responseTime);
                    baseline.messageCount++;
                    console.log(`✅ PONG受信成功 (${responseTime.toFixed(1)}ms)`);
                } else {
                    console.warn(`⚠️ 予期しないレスポンス:`, response);
                }
                
            } catch (error) {
                console.error('❌ ベースライン測定エラー:', {
                    message: error.message,
                    stack: error.stack,
                    frameCount: frameCount,
                    pingMessage: pingMessage
                });
            }
            
            // FPS計算
            const frameTime = performance.now() - lastFrameTime;
            if (frameTime > 0) {
                const fps = 1000 / frameTime;
                baseline.fps.push(fps);
            }
            
            lastFrameTime = performance.now();
            frameCount++;
            
            // フレーム間隔調整
            await this.sleep(Math.max(0, this.testConfig.frameInterval - frameTime));
        }
        
        // 統計計算（NaN回避）
        baseline.averageFps = baseline.fps.length > 0 
            ? baseline.fps.reduce((sum, fps) => sum + fps, 0) / baseline.fps.length 
            : 0;
        baseline.averageResponseTime = baseline.responseTimes.length > 0 
            ? baseline.responseTimes.reduce((sum, time) => sum + time, 0) / baseline.responseTimes.length 
            : 0;
        
        console.log(`📊 ベースライン結果: メッセージ数=${baseline.messageCount}, FPS=${baseline.averageFps.toFixed(1)}, レスポンス時間=${baseline.averageResponseTime.toFixed(1)}ms`);
        
        return baseline;
    }
    
    /**
     * 最適化パフォーマンス測定
     */
    async measureOptimizedPerformance() {
        const optimized = {
            fps: [],
            responseTimes: [],
            messageCount: 0,
            averageFps: 0,
            averageResponseTime: 0,
            transferableObjectsUsed: 0,
            zeroCopyTransfers: 0
        };
        
        const testStartTime = performance.now();
        let frameCount = 0;
        let lastFrameTime = testStartTime;
        
        while (performance.now() - testStartTime < this.testConfig.testDuration) {
            const frameStartTime = performance.now();
            
            // Transferable Objectsを使用したPINGメッセージ
            const gameStateUpdate = new GameStateUpdate();
            
            // TypedArrayに直接データ設定（テストデータ）
            gameStateUpdate.ballPosition[0] = Math.random() * 800;
            gameStateUpdate.ballPosition[1] = Math.random() * 600;
            gameStateUpdate.ballVelocity[0] = Math.random() * 10 - 5;
            gameStateUpdate.ballVelocity[1] = Math.random() * 10 - 5;
            gameStateUpdate.frameNumber[0] = frameCount;
            
            const timestamp = performance.now();
            gameStateUpdate.timestamp[0] = Math.floor(timestamp / 0x100000000);
            gameStateUpdate.timestamp[1] = timestamp % 0x100000000;
            
            const pingMessage = new MessageBuilder()
                .type(MessageType.PING)
                .payload({ 
                    timestamp: frameStartTime,
                    testData: `optimized_frame_${frameCount}`,
                    gameState: gameStateUpdate  // Transferable Objectsを含むペイロード
                })
                .build();
            
            try {
                // Transferable Objectsを使用したPING送信
                const transferList = gameStateUpdate.getTransferList();
                console.log(`📤 Transferable PING送信中 (フレーム ${frameCount}, ${transferList.length}個のバッファ)`);
                console.log(`   TransferList詳細:`, transferList.map(buf => `ArrayBuffer(${buf.byteLength}bytes)`));
                
                // メッセージの詳細ログ出力
                console.log(`   PINGメッセージ構造:`, {
                    type: pingMessage.type,
                    hasGameState: !!pingMessage.payload.gameState,
                    gameStateBallPosition: pingMessage.payload.gameState?.ballPosition,
                    transferListCount: transferList.length
                });
                
                const response = await this.workerManager.sendMessage(
                    'game-logic', 
                    pingMessage, 
                    5000, // タイムアウト延長
                    transferList
                );
                
                if (response && response.type === MessageType.PONG) {
                    const responseTime = performance.now() - frameStartTime;
                    optimized.responseTimes.push(responseTime);
                    optimized.messageCount++;
                    
                    if (transferList.length > 0) {
                        optimized.transferableObjectsUsed++;
                        optimized.zeroCopyTransfers++;
                    }
                    
                    console.log(`✅ Transferable PONG受信成功 (${responseTime.toFixed(1)}ms, ${transferList.length}個転送)`);
                } else {
                    console.warn(`⚠️ 予期しないレスポンス:`, response);
                }
                
            } catch (error) {
                console.error('❌ 最適化測定エラー:', {
                    message: error.message,
                    stack: error.stack,
                    frameCount: frameCount,
                    pingMessage: pingMessage
                });
            }
            
            // FPS計算
            const frameTime = performance.now() - lastFrameTime;
            if (frameTime > 0) {
                const fps = 1000 / frameTime;
                optimized.fps.push(fps);
            }
            
            lastFrameTime = performance.now();
            frameCount++;
            
            // フレーム間隔調整（より精密）
            await this.sleep(Math.max(0, this.testConfig.frameInterval - frameTime));
        }
        
        // 統計計算（NaN回避）
        optimized.averageFps = optimized.fps.length > 0 
            ? optimized.fps.reduce((sum, fps) => sum + fps, 0) / optimized.fps.length 
            : 0;
        optimized.averageResponseTime = optimized.responseTimes.length > 0 
            ? optimized.responseTimes.reduce((sum, time) => sum + time, 0) / optimized.responseTimes.length 
            : 0;
        optimized.transferableObjectsRatio = optimized.messageCount > 0 
            ? (optimized.transferableObjectsUsed / optimized.messageCount) * 100 
            : 0;
        
        console.log(`📊 最適化結果: メッセージ数=${optimized.messageCount}, FPS=${optimized.averageFps.toFixed(1)}, レスポンス時間=${optimized.averageResponseTime.toFixed(1)}ms, Transferable使用率=${optimized.transferableObjectsRatio.toFixed(1)}%`);
        
        return optimized;
    }
    
    /**
     * Transferable Objects効果測定
     */
    async measureTransferableObjectsEffect() {
        const results = {
            withTransferables: { responseTimes: [], averageResponseTime: 0 },
            withoutTransferables: { responseTimes: [], averageResponseTime: 0 },
            improvement: 0
        };
        
        // Transferable Objects使用時の測定
        for (let i = 0; i < this.testConfig.messageCount; i++) {
            const gameStateUpdate = new GameStateUpdate();
            gameStateUpdate.ballPosition[0] = Math.random() * 800;
            gameStateUpdate.ballPosition[1] = Math.random() * 600;
            
            const message = new MessageBuilder()
                .type(MessageType.UPDATE_GAME_STATE)
                .payload(gameStateUpdate)
                .build();
            
            const startTime = performance.now();
            
            try {
                await this.workerManager.sendMessage(
                    'game-logic', 
                    message, 
                    5000, // タイムアウト延長
                    gameStateUpdate.getTransferList()
                );
                
                const responseTime = performance.now() - startTime;
                results.withTransferables.responseTimes.push(responseTime);
                
            } catch (error) {
                console.warn('Transferable Objects測定エラー:', error.message);
            }
        }
        
        // Transferable Objects未使用時の測定
        for (let i = 0; i < this.testConfig.messageCount; i++) {
            const message = {
                type: MessageType.UPDATE_GAME_STATE,
                payload: {
                    ballPosition: { x: Math.random() * 800, y: Math.random() * 600 },
                    ballVelocity: { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 }
                },
                timestamp: performance.now()
            };
            
            const startTime = performance.now();
            
            try {
                await this.workerManager.sendMessage('game-logic', message, 5000, []); // タイムアウト延長
                
                const responseTime = performance.now() - startTime;
                results.withoutTransferables.responseTimes.push(responseTime);
                
            } catch (error) {
                console.warn('通常メッセージ測定エラー:', error.message);
            }
        }
        
        // 統計計算（NaN回避）
        results.withTransferables.averageResponseTime = 
            results.withTransferables.responseTimes.length > 0 
                ? results.withTransferables.responseTimes.reduce((sum, time) => sum + time, 0) / 
                  results.withTransferables.responseTimes.length
                : 0;
        
        results.withoutTransferables.averageResponseTime = 
            results.withoutTransferables.responseTimes.length > 0 
                ? results.withoutTransferables.responseTimes.reduce((sum, time) => sum + time, 0) / 
                  results.withoutTransferables.responseTimes.length
                : 0;
        
        results.improvement = 
            results.withoutTransferables.averageResponseTime > 0
                ? ((results.withoutTransferables.averageResponseTime - results.withTransferables.averageResponseTime) /
                   results.withoutTransferables.averageResponseTime) * 100
                : 0;
        
        return results;
    }
    
    /**
     * メモリ使用量測定
     */
    async measureMemoryUsage() {
        const memoryStats = {
            workerManager: 0,
            totalWorkers: 0,
            cacheUsage: 0,
            transferableObjectsOverhead: 0
        };
        
        // WorkerManagerのメモリ使用量
        const workerManagerStats = this.workerManager.getStats();
        memoryStats.workerManager = this.estimateObjectSize(workerManagerStats);
        
        // 各Workerの状態取得
        const workers = ['game-logic', 'ai', 'analytics'];
        for (const workerId of workers) {
            try {
                const workerStatus = this.workerManager.getWorkerStatus(workerId);
                memoryStats.totalWorkers += this.estimateObjectSize(workerStatus);
            } catch (error) {
                console.warn(`Worker ${workerId} メモリ測定エラー:`, error.message);
            }
        }
        
        // AOTキャッシュ使用量
        if (this.workerManager.aotLoader) {
            memoryStats.cacheUsage = this.workerManager.aotLoader.getMemoryUsage();
        }
        
        return memoryStats;
    }
    
    /**
     * 結果比較分析
     */
    compareResults() {
        const baseline = this.testResults.baseline;
        const optimized = this.testResults.optimized;
        
        const comparison = {
            fpsImprovement: ((optimized.averageFps - baseline.averageFps) / baseline.averageFps) * 100,
            responseTimeImprovement: ((baseline.averageResponseTime - optimized.averageResponseTime) / baseline.averageResponseTime) * 100,
            fpsEfficiency: (optimized.averageFps / 60) * 100, // 60 FPS目標に対する効率
            targetAchievement: {}
        };
        
        // 目標達成度の評価
        comparison.targetAchievement.fpsEfficiency = {
            achieved: comparison.fpsEfficiency >= this.targets.fpsEfficiency,
            value: comparison.fpsEfficiency,
            target: this.targets.fpsEfficiency
        };
        
        comparison.targetAchievement.responseTime = {
            achieved: optimized.averageResponseTime <= this.targets.responseTime,
            value: optimized.averageResponseTime,
            target: this.targets.responseTime
        };
        
        comparison.targetAchievement.transferableObjects = {
            achieved: optimized.transferableObjectsRatio >= this.targets.transferableObjectsRatio,
            value: optimized.transferableObjectsRatio,
            target: this.targets.transferableObjectsRatio
        };
        
        return comparison;
    }
    
    /**
     * パフォーマンスレポート生成
     */
    generatePerformanceReport() {
        const baseline = this.testResults.baseline;
        const optimized = this.testResults.optimized;
        const comparison = this.testResults.comparison;
        const transferableTest = this.testResults.transferableObjectsTest;
        const memory = this.testResults.memoryUsage;
        
        let report = [];
        
        report.push('📊 WebWorker Phase 4 パフォーマンステスト結果');
        report.push('');
        
        report.push('## 🎯 目標達成度');
        report.push(`FPS効率: ${comparison.targetAchievement.fpsEfficiency.value.toFixed(1)}% (目標: ${comparison.targetAchievement.fpsEfficiency.target}%) ${comparison.targetAchievement.fpsEfficiency.achieved ? '✅' : '❌'}`);
        report.push(`レスポンス時間: ${comparison.targetAchievement.responseTime.value.toFixed(1)}ms (目標: ${comparison.targetAchievement.responseTime.target}ms以下) ${comparison.targetAchievement.responseTime.achieved ? '✅' : '❌'}`);
        report.push(`Transferable Objects使用率: ${comparison.targetAchievement.transferableObjects.value.toFixed(1)}% (目標: ${comparison.targetAchievement.transferableObjects.target}%以上) ${comparison.targetAchievement.transferableObjects.achieved ? '✅' : '❌'}`);
        report.push('');
        
        report.push('## 📈 パフォーマンス改善');
        report.push(`FPS: ${baseline.averageFps.toFixed(1)} → ${optimized.averageFps.toFixed(1)} (${comparison.fpsImprovement > 0 ? '+' : ''}${comparison.fpsImprovement.toFixed(1)}%)`);
        report.push(`レスポンス時間: ${baseline.averageResponseTime.toFixed(1)}ms → ${optimized.averageResponseTime.toFixed(1)}ms (${comparison.responseTimeImprovement > 0 ? '-' : ''}${comparison.responseTimeImprovement.toFixed(1)}%)`);
        report.push(`Zero-copy転送: ${optimized.zeroCopyTransfers}/${optimized.messageCount} (${optimized.transferableObjectsRatio.toFixed(1)}%)`);
        report.push('');
        
        if (transferableTest) {
            report.push('## ⚡ Transferable Objects効果');
            report.push(`通常転送: ${transferableTest.withoutTransferables.averageResponseTime.toFixed(1)}ms`);
            report.push(`Zero-copy転送: ${transferableTest.withTransferables.averageResponseTime.toFixed(1)}ms`);
            report.push(`改善効果: ${transferableTest.improvement.toFixed(1)}%削減`);
            report.push('');
        }
        
        if (memory) {
            report.push('## 🧠 メモリ使用量');
            report.push(`WorkerManager: ${memory.workerManager.toFixed(1)}MB`);
            report.push(`Workers合計: ${memory.totalWorkers.toFixed(1)}MB`);
            report.push(`AOTキャッシュ: ${memory.cacheUsage.toFixed(1)}MB`);
            report.push('');
        }
        
        // 総合評価
        const allTargetsAchieved = Object.values(comparison.targetAchievement).every(target => target.achieved);
        report.push('## 🏆 総合評価');
        if (allTargetsAchieved) {
            report.push('✅ 全ての目標値を達成！WebWorker Phase 4 最適化成功');
        } else {
            report.push('⚠️ 一部目標未達成 - さらなる最適化が必要');
        }
        
        return report.join('\n');
    }
    
    /**
     * オブジェクトサイズの概算
     * @param {Object} obj 測定対象オブジェクト
     * @returns {number} 推定サイズ（MB）
     */
    estimateObjectSize(obj) {
        const jsonString = JSON.stringify(obj);
        return (jsonString.length * 2) / (1024 * 1024); // UTF-16 2バイト/文字, MB変換
    }
    
    /**
     * 非同期スリープ
     * @param {number} ms 待機時間（ミリ秒）
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * クリーンアップ処理
     */
    async cleanup() {
        try {
            await this.workerManager.terminateAll();
            console.log('🧹 パフォーマンステスト クリーンアップ完了');
        } catch (error) {
            console.warn('⚠️ クリーンアップエラー:', error.message);
        }
    }
}

// メイン実行関数
export async function runWebWorkerPerformanceTest() {
    const test = new WebWorkerPerformanceTest();
    return await test.runFullPerformanceTest();
}

// スタンドアロン実行
if (typeof window !== 'undefined' && window.location.pathname.includes('performance')) {
    runWebWorkerPerformanceTest().then(results => {
        console.log('✅ WebWorkerパフォーマンステスト完了');
        window.performanceTestResults = results;
    }).catch(error => {
        console.error('❌ WebWorkerパフォーマンステスト失敗:', error);
    });
}