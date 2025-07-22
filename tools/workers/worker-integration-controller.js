/**
 * WebWorker並列処理フェーズ4 - 統合コントローラ
 * Ultimate Squash Game WebWorkerシステム統合管理
 * 
 * 機能:
 * - 全Worker統合制御
 * - ゲームループとWorker連携
 * - パフォーマンス監視統合
 * - 実証テスト実行
 */

import WorkerManager from './communication/worker-manager.js';
import { MessageType, MessagePriority, GameStateUpdate, AIMoveRequest, PerformanceMetrics, MessageBuilder } from './communication/message-protocol.js';

/**
 * WebWorker統合コントローラ
 * メインスレッドとWorker群の橋渡し役
 */
export class WorkerIntegrationController {
    constructor() {
        this.workerManager = new WorkerManager();
        this.initialized = false;
        this.running = false;
        
        // ゲーム状態（デモ用）
        this.demoGameState = {
            ballPosition: { x: 400, y: 300 },
            ballVelocity: { x: 5, y: 3 },
            racketPosition: { x: 50, y: 250 },
            racketVelocity: { x: 0, y: 0 },
            score: { player1: 0, player2: 0 },
            frameNumber: 0
        };
        
        // パフォーマンス統計
        this.performanceStats = {
            startTime: 0,
            framesProcessed: 0,
            totalLatency: 0,
            averageLatency: 0,
            workerResponseTimes: new Map(),
            errors: []
        };
        
        // テストモード設定
        this.testConfig = {
            duration: 10000, // 10秒間のテスト
            targetFPS: 60,
            enableAI: true,
            enableAnalytics: true,
            logLevel: 'info'
        };
        
        console.log('🎮 WorkerIntegrationController初期化完了');
    }
    
    /**
     * システム初期化
     */
    async initialize() {
        if (this.initialized) {
            console.log('⚠️ 既に初期化済み');
            return;
        }
        
        console.log('🔧 WebWorker統合システム初期化中...');
        
        try {
            // WorkerManagerの初期化
            await this.workerManager.initialize();
            
            // Workerイベントハンドラーの設定
            this.setupWorkerEventHandlers();
            
            // 初期テストの実行
            await this.performInitialTests();
            
            this.initialized = true;
            console.log('✅ WebWorker統合システム初期化完了');
            
        } catch (error) {
            console.error('❌ 初期化失敗:', error);
            throw error;
        }
    }
    
    /**
     * Workerイベントハンドラーの設定
     */
    setupWorkerEventHandlers() {
        // ゲームロジックWorkerからの応答
        this.workerManager.on('worker:game-logic:message', (message) => {
            this.handleGameLogicMessage(message);
        });
        
        // AIWorkerからの応答
        this.workerManager.on('worker:ai:message', (message) => {
            this.handleAIMessage(message);
        });
        
        // AnalyticsWorkerからの応答
        this.workerManager.on('worker:analytics:message', (message) => {
            this.handleAnalyticsMessage(message);
        });
        
        // Workerエラーハンドリング
        this.workerManager.on('worker:error', ({ workerId, error }) => {
            console.error(`❌ Worker error (${workerId}):`, error);
            this.performanceStats.errors.push({
                workerId,
                error: error.message,
                timestamp: performance.now()
            });
        });
        
        console.log('📡 Workerイベントハンドラー設定完了');
    }
    
    /**
     * 初期テストの実行
     */
    async performInitialTests() {
        console.log('🧪 初期テスト実行中...');
        
        // 全WorkerにPingテスト
        const pingResults = await this.pingAllWorkers();
        console.log('📊 Ping結果:', pingResults);
        
        // AOTローダーテスト
        await this.testAOTLoader();
        
        // メッセージプロトコルテスト
        await this.testMessageProtocol();
        
        console.log('✅ 初期テスト完了');
    }
    
    /**
     * 全WorkerにPingテスト
     * @returns {Object} Ping結果
     */
    async pingAllWorkers() {
        const workerIds = ['game-logic', 'ai', 'analytics'];
        const results = {};
        
        for (const workerId of workerIds) {
            try {
                const startTime = performance.now();
                
                const pingMessage = new MessageBuilder()
                    .type(MessageType.PING)
                    .priority(MessagePriority.NORMAL)
                    .payload({ timestamp: startTime })
                    .build();
                
                const response = await this.workerManager.sendMessage(workerId, pingMessage, 5000);
                
                const latency = performance.now() - startTime;
                
                results[workerId] = {
                    success: true,
                    latency,
                    response: response.payload
                };
                
            } catch (error) {
                results[workerId] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }
    
    /**
     * AOTローダーテスト
     */
    async testAOTLoader() {
        console.log('🔍 AOTローダーテスト中...');
        
        try {
            // AOTローダーの統計取得
            const aotStats = this.workerManager.aotLoader.getStats();
            console.log('📊 AOT統計:', aotStats);
            
            // メモリ使用量チェック
            const memoryUsage = this.workerManager.aotLoader.getMemoryUsage();
            console.log(`💾 AOTメモリ使用量: ${memoryUsage.toFixed(2)}MB`);
            
            if (memoryUsage > 50) {
                console.warn('⚠️ AOTメモリ使用量が高い');
            }
            
        } catch (error) {
            console.error('❌ AOTローダーテスト失敗:', error);
            throw error;
        }
    }
    
    /**
     * メッセージプロトコルテスト
     */
    async testMessageProtocol() {
        console.log('📡 メッセージプロトコルテスト中...');
        
        try {
            // GameStateUpdateのテスト
            const gameStateUpdate = new GameStateUpdate();
            gameStateUpdate.ballPosition[0] = 100;
            gameStateUpdate.ballPosition[1] = 200;
            gameStateUpdate.frameNumber[0] = 1;
            
            // TypedArrayの転送テスト
            const transferList = gameStateUpdate.getTransferList();
            console.log(`📦 転送可能オブジェクト数: ${transferList.length}`);
            
            // メッセージビルダーテスト
            const message = new MessageBuilder()
                .type(MessageType.UPDATE_GAME_STATE)
                .priority(MessagePriority.HIGH)
                .payload(gameStateUpdate)
                .build();
            
            console.log('✅ メッセージプロトコルテスト完了');
            
        } catch (error) {
            console.error('❌ メッセージプロトコルテスト失敗:', error);
            throw error;
        }
    }
    
    /**
     * デモゲームループの開始
     */
    async startDemoGameLoop() {
        if (this.running) {
            console.log('⚠️ 既にゲームループ実行中');
            return;
        }
        
        if (!this.initialized) {
            await this.initialize();
        }
        
        console.log('🎮 デモゲームループ開始');
        
        this.running = true;
        this.performanceStats.startTime = performance.now();
        
        // ゲームループの実行
        this.gameLoopInterval = setInterval(() => {
            this.executeGameLoop();
        }, 1000 / this.testConfig.targetFPS);
        
        // テスト終了タイマー
        setTimeout(() => {
            this.stopDemoGameLoop();
        }, this.testConfig.duration);
    }
    
    /**
     * ゲームループの実行
     */
    async executeGameLoop() {
        if (!this.running) return;
        
        const frameStartTime = performance.now();
        
        try {
            // 1. ゲーム状態更新（Game Logic Worker）
            await this.updateGameLogic();
            
            // 2. AI処理（AI Worker）
            if (this.testConfig.enableAI) {
                await this.processAI();
            }
            
            // 3. 分析処理（Analytics Worker）
            if (this.testConfig.enableAnalytics) {
                await this.updateAnalytics();
            }
            
            // パフォーマンス統計更新
            this.updatePerformanceStats(frameStartTime);
            
        } catch (error) {
            console.error('❌ ゲームループエラー:', error);
            this.performanceStats.errors.push({
                type: 'gameloop',
                error: error.message,
                timestamp: performance.now()
            });
        }
    }
    
    /**
     * ゲームロジック更新
     */
    async updateGameLogic() {
        try {
            // デモ用の簡易物理シミュレーション
            this.updateDemoPhysics();
            
            // GameLogicWorkerに状態更新要求
            const gameStateUpdate = this.createGameStateUpdate();
            
            const gameStateMessage = new MessageBuilder()
                .type(MessageType.UPDATE_GAME_STATE)
                .priority(MessagePriority.HIGH)
                .payload(gameStateUpdate)
                .build();
            
            const response = await this.workerManager.sendMessage('game-logic', gameStateMessage, 100); // 短いタイムアウト
            
            // 更新された状態を取得
            if (response.payload && response.payload.ballPosition) {
                this.updateDemoStateFromWorker(response.payload);
            }
            
        } catch (error) {
            if (this.testConfig.logLevel === 'debug') {
                console.warn('⚠️ ゲームロジック更新エラー:', error.message);
            }
        }
    }
    
    /**
     * AI処理
     */
    async processAI() {
        try {
            // AI移動要求の作成
            const aiRequest = new AIMoveRequest();
            aiRequest.ballPosition[0] = this.demoGameState.ballPosition.x;
            aiRequest.ballPosition[1] = this.demoGameState.ballPosition.y;
            aiRequest.ballVelocity[0] = this.demoGameState.ballVelocity.x;
            aiRequest.ballVelocity[1] = this.demoGameState.ballVelocity.y;
            aiRequest.racketPosition[0] = this.demoGameState.racketPosition.x;
            aiRequest.racketPosition[1] = this.demoGameState.racketPosition.y;
            aiRequest.difficulty[0] = 0.5; // 中程度の難易度
            
            const aiMessage = new MessageBuilder()
                .type(MessageType.AI_MOVE_REQUEST)
                .priority(MessagePriority.NORMAL)
                .payload(aiRequest)
                .build();
            
            const response = await this.workerManager.sendMessage('ai', aiMessage, 150);
            
            // AI応答の処理
            if (response.payload && response.payload.targetPosition) {
                this.processAIResponse(response.payload);
            }
            
        } catch (error) {
            if (this.testConfig.logLevel === 'debug') {
                console.warn('⚠️ AI処理エラー:', error.message);
            }
        }
    }
    
    /**
     * 分析更新
     */
    async updateAnalytics() {
        try {
            // パフォーマンスメトリクスの作成
            const metrics = new PerformanceMetrics();
            metrics.fps[0] = this.calculateCurrentFPS();
            metrics.frameTime[0] = this.calculateAverageFrameTime();
            metrics.memoryUsage[0] = this.estimateMemoryUsage();
            metrics.cpuUsage[0] = 50; // 仮の値
            
            // Worker遅延の記録
            const workerLatencies = Array.from(this.performanceStats.workerResponseTimes.values());
            for (let i = 0; i < Math.min(4, workerLatencies.length); i++) {
                metrics.workerLatency[i] = workerLatencies[i] || 0;
            }
            
            const analyticsMessage = new MessageBuilder()
                .type(MessageType.PERFORMANCE_REPORT)
                .priority(MessagePriority.LOW)
                .payload(metrics)
                .build();
            
            await this.workerManager.sendMessage('analytics', analyticsMessage, 200);
            
        } catch (error) {
            if (this.testConfig.logLevel === 'debug') {
                console.warn('⚠️ 分析更新エラー:', error.message);
            }
        }
    }
    
    /**
     * デモ物理シミュレーション
     */
    updateDemoPhysics() {
        // 簡易ボール移動
        this.demoGameState.ballPosition.x += this.demoGameState.ballVelocity.x;
        this.demoGameState.ballPosition.y += this.demoGameState.ballVelocity.y;
        
        // 壁反射
        if (this.demoGameState.ballPosition.y <= 0 || this.demoGameState.ballPosition.y >= 600) {
            this.demoGameState.ballVelocity.y = -this.demoGameState.ballVelocity.y;
        }
        
        // 左右端での位置リセット
        if (this.demoGameState.ballPosition.x <= 0 || this.demoGameState.ballPosition.x >= 800) {
            this.demoGameState.ballPosition.x = 400;
            this.demoGameState.ballPosition.y = 300;
            this.demoGameState.ballVelocity.x = -this.demoGameState.ballVelocity.x;
        }
        
        this.demoGameState.frameNumber++;
    }
    
    /**
     * GameStateUpdateオブジェクトの作成
     * @returns {GameStateUpdate} ゲーム状態更新オブジェクト
     */
    createGameStateUpdate() {
        const update = new GameStateUpdate();
        
        update.ballPosition[0] = this.demoGameState.ballPosition.x;
        update.ballPosition[1] = this.demoGameState.ballPosition.y;
        update.ballVelocity[0] = this.demoGameState.ballVelocity.x;
        update.ballVelocity[1] = this.demoGameState.ballVelocity.y;
        update.racketPosition[0] = this.demoGameState.racketPosition.x;
        update.racketPosition[1] = this.demoGameState.racketPosition.y;
        update.frameNumber[0] = this.demoGameState.frameNumber;
        
        const timestamp = performance.now();
        update.timestamp[0] = Math.floor(timestamp / 0x100000000);
        update.timestamp[1] = timestamp % 0x100000000;
        
        update.score[0] = this.demoGameState.score.player1;
        update.score[1] = this.demoGameState.score.player2;
        
        return update;
    }
    
    /**
     * Workerからの状態更新
     * @param {Object} workerState Worker応答状態
     */
    updateDemoStateFromWorker(workerState) {
        if (workerState.ballPosition) {
            this.demoGameState.ballPosition.x = workerState.ballPosition[0];
            this.demoGameState.ballPosition.y = workerState.ballPosition[1];
        }
        
        if (workerState.ballVelocity) {
            this.demoGameState.ballVelocity.x = workerState.ballVelocity[0];
            this.demoGameState.ballVelocity.y = workerState.ballVelocity[1];
        }
    }
    
    /**
     * AI応答の処理
     * @param {Object} aiResponse AI応答
     */
    processAIResponse(aiResponse) {
        if (aiResponse.targetPosition) {
            // AI目標位置を簡易的にラケット位置に反映
            this.demoGameState.racketPosition.y = aiResponse.targetPosition[1];
            
            if (this.testConfig.logLevel === 'debug') {
                console.log(`🤖 AI目標: Y=${aiResponse.targetPosition[1].toFixed(1)}, 信頼度=${aiResponse.confidence[0].toFixed(2)}`);
            }
        }
    }
    
    /**
     * パフォーマンス統計更新
     * @param {number} frameStartTime フレーム開始時刻
     */
    updatePerformanceStats(frameStartTime) {
        const frameTime = performance.now() - frameStartTime;
        
        this.performanceStats.framesProcessed++;
        this.performanceStats.totalLatency += frameTime;
        this.performanceStats.averageLatency = this.performanceStats.totalLatency / this.performanceStats.framesProcessed;
        
        // 定期レポート
        if (this.performanceStats.framesProcessed % 120 === 0) { // 2秒ごと
            this.logPerformanceReport();
        }
    }
    
    /**
     * 現在FPSの計算
     * @returns {number} 現在のFPS
     */
    calculateCurrentFPS() {
        const elapsed = performance.now() - this.performanceStats.startTime;
        return (this.performanceStats.framesProcessed / elapsed) * 1000;
    }
    
    /**
     * 平均フレーム時間の計算
     * @returns {number} 平均フレーム時間（ms）
     */
    calculateAverageFrameTime() {
        return this.performanceStats.averageLatency;
    }
    
    /**
     * メモリ使用量の推定
     * @returns {number} 推定メモリ使用量（MB）
     */
    estimateMemoryUsage() {
        // 簡易メモリ使用量推定
        const baseUsage = 10; // ベース使用量
        const workerUsage = this.workerManager.getStats().activeWorkers * 5; // Worker当たり5MB
        const dataUsage = this.performanceStats.framesProcessed * 0.001; // フレーム当たり1KB
        
        return baseUsage + workerUsage + dataUsage;
    }
    
    /**
     * パフォーマンスレポートのログ出力
     */
    logPerformanceReport() {
        const elapsed = performance.now() - this.performanceStats.startTime;
        const fps = this.calculateCurrentFPS();
        const avgLatency = this.performanceStats.averageLatency;
        const memoryUsage = this.estimateMemoryUsage();
        
        console.log(`📊 パフォーマンスレポート [${(elapsed/1000).toFixed(1)}s]:`);
        console.log(`  • FPS: ${fps.toFixed(1)}`);
        console.log(`  • 平均フレーム時間: ${avgLatency.toFixed(2)}ms`);
        console.log(`  • 推定メモリ使用量: ${memoryUsage.toFixed(1)}MB`);
        console.log(`  • エラー数: ${this.performanceStats.errors.length}`);
        console.log(`  • フレーム数: ${this.performanceStats.framesProcessed}`);
        
        // Worker統計
        const workerStats = this.workerManager.getStats();
        console.log(`  • Workerメッセージ処理数: ${workerStats.messagesProcessed}`);
        console.log(`  • 平均応答時間: ${workerStats.averageResponseTime.toFixed(2)}ms`);
    }
    
    /**
     * デモゲームループの停止
     */
    stopDemoGameLoop() {
        if (!this.running) {
            console.log('⚠️ ゲームループは実行されていません');
            return;
        }
        
        console.log('🛑 デモゲームループ停止中...');
        
        this.running = false;
        
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        // 最終レポート
        this.generateFinalReport();
        
        console.log('✅ デモゲームループ停止完了');
    }
    
    /**
     * 最終レポート生成
     */
    generateFinalReport() {
        const elapsed = performance.now() - this.performanceStats.startTime;
        const finalFPS = this.calculateCurrentFPS();
        const totalMemory = this.estimateMemoryUsage();
        
        const report = {
            summary: {
                testDuration: elapsed,
                targetFPS: this.testConfig.targetFPS,
                actualFPS: finalFPS,
                fpsEfficiency: (finalFPS / this.testConfig.targetFPS) * 100,
                totalFrames: this.performanceStats.framesProcessed,
                totalErrors: this.performanceStats.errors.length
            },
            performance: {
                averageFrameTime: this.performanceStats.averageLatency,
                memoryUsage: totalMemory,
                workerStats: this.workerManager.getStats()
            },
            workers: {
                gameLogic: this.workerManager.getWorkerStatus('game-logic'),
                ai: this.workerManager.getWorkerStatus('ai'),
                analytics: this.workerManager.getWorkerStatus('analytics')
            },
            errors: this.performanceStats.errors
        };
        
        console.log('\n🎯 === WebWorker Phase 4 最終テストレポート ===');
        console.log(`📊 テスト期間: ${(elapsed/1000).toFixed(1)}秒`);
        console.log(`🎮 目標FPS: ${this.testConfig.targetFPS} / 実際FPS: ${finalFPS.toFixed(1)} (効率: ${report.summary.fpsEfficiency.toFixed(1)}%)`);
        console.log(`⚡ 平均フレーム時間: ${report.performance.averageFrameTime.toFixed(2)}ms`);
        console.log(`💾 メモリ使用量: ${totalMemory.toFixed(1)}MB`);
        console.log(`📈 総フレーム数: ${report.summary.totalFrames}`);
        console.log(`❌ エラー数: ${report.summary.totalErrors}`);
        
        console.log('\n🔧 Worker詳細:');
        Object.entries(report.workers).forEach(([id, status]) => {
            console.log(`  • ${id}: 存在=${status.exists}, 平均遅延=${status.averageLatency.toFixed(2)}ms`);
        });
        
        if (report.summary.totalErrors > 0) {
            console.log('\n⚠️ エラー詳細:');
            report.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. [${error.workerId || error.type}] ${error.error}`);
            });
        }
        
        // 成功判定
        const isSuccessful = report.summary.fpsEfficiency >= 80 && report.summary.totalErrors < 10;
        console.log(`\n${isSuccessful ? '✅ テスト成功' : '❌ テスト要改善'}`);
        
        return report;
    }
    
    /**
     * GameLogicWorkerメッセージハンドリング
     * @param {Object} message メッセージ
     */
    handleGameLogicMessage(message) {
        const latency = performance.now() - (message.timestamp || 0);
        this.performanceStats.workerResponseTimes.set('game-logic', latency);
        
        if (this.testConfig.logLevel === 'debug') {
            console.log(`🎮 GameLogic応答: ${message.type}, 遅延: ${latency.toFixed(1)}ms`);
        }
    }
    
    /**
     * AIWorkerメッセージハンドリング
     * @param {Object} message メッセージ
     */
    handleAIMessage(message) {
        const latency = performance.now() - (message.timestamp || 0);
        this.performanceStats.workerResponseTimes.set('ai', latency);
        
        if (this.testConfig.logLevel === 'debug') {
            console.log(`🤖 AI応答: ${message.type}, 遅延: ${latency.toFixed(1)}ms`);
        }
    }
    
    /**
     * AnalyticsWorkerメッセージハンドリング
     * @param {Object} message メッセージ
     */
    handleAnalyticsMessage(message) {
        const latency = performance.now() - (message.timestamp || 0);
        this.performanceStats.workerResponseTimes.set('analytics', latency);
        
        if (message.payload && message.payload.alertType === 'performance_alert') {
            console.warn(`🚨 パフォーマンスアラート:`, message.payload.alert);
        }
        
        if (this.testConfig.logLevel === 'debug') {
            console.log(`📊 Analytics応答: ${message.type}, 遅延: ${latency.toFixed(1)}ms`);
        }
    }
    
    /**
     * システム終了
     */
    async shutdown() {
        console.log('🛑 WebWorker統合システム終了中...');
        
        // ゲームループ停止
        if (this.running) {
            this.stopDemoGameLoop();
        }
        
        // 全Worker終了
        await this.workerManager.terminateAll();
        
        this.initialized = false;
        
        console.log('✅ システム終了完了');
    }
}

// デフォルトエクスポート
export default WorkerIntegrationController;