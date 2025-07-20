/**
 * WebWorker並列処理フェーズ4 - WorkerManager
 * Ultimate Squash Game専用並列処理管理システム
 * 
 * 機能:
 * - 複数Workerの統合管理
 * - メッセージング統制
 * - AOTバイトコード統合
 * - パフォーマンス監視
 */

import { MessageType, WorkerMessage, WorkerConfig } from './message-protocol.js';
import { AOTLoaderManager } from './aot-loader.js';

export class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.workerConfigs = new Map();
        this.messageQueue = new Map();
        this.responseHandlers = new Map();
        this.aotLoader = new AOTLoaderManager();
        this.initialized = false;
        
        // パフォーマンス統計
        this.stats = {
            messagesProcessed: 0,
            averageResponseTime: 0,
            workerLatency: new Map(),
            activeWorkers: 0
        };
        
        console.log('🚀 WorkerManager初期化完了');
    }
    
    /**
     * WorkerManager初期化
     */
    async initialize() {
        if (this.initialized) {
            console.log('⚠️ WorkerManager already initialized');
            return;
        }
        
        console.log('📊 WorkerManager初期化中...');
        
        try {
            // AOTローダーの初期化
            await this.aotLoader.initialize();
            
            // 標準Workerプールの設定
            await this.setupStandardWorkerPool();
            
            // メッセージハンドラーの設定
            this.setupGlobalMessageHandlers();
            
            this.initialized = true;
            console.log('✅ WorkerManager初期化完了');
            
        } catch (error) {
            console.error('❌ WorkerManager初期化失敗:', error);
            throw error;
        }
    }
    
    /**
     * 標準Workerプールの設定
     */
    async setupStandardWorkerPool() {
        const standardWorkers = [
            {
                id: 'game-logic',
                scriptPath: './workers/game-logic/game-logic-worker.js',
                config: {
                    type: 'module',
                    capabilities: ['physics', 'collision', 'state'],
                    aotModules: ['game_engine', 'physics', 'collision']
                }
            },
            {
                id: 'ai',
                scriptPath: './workers/ai/ai-worker.js',
                config: {
                    type: 'module',
                    capabilities: ['strategy', 'prediction', 'difficulty'],
                    aotModules: ['ai_enhancer', 'strategy', 'prediction']
                }
            },
            {
                id: 'analytics',
                scriptPath: './workers/analytics/analytics-worker.js',
                config: {
                    type: 'module',
                    capabilities: ['metrics', 'performance', 'statistics'],
                    aotModules: ['metrics', 'performance']
                }
            }
        ];
        
        // 並列で標準Workerを作成
        const workerPromises = standardWorkers.map(worker => 
            this.createWorker(worker.id, worker.scriptPath, worker.config)
        );
        
        await Promise.all(workerPromises);
        console.log(`📈 標準Workerプール構築完了: ${standardWorkers.length}個のWorker`);
    }
    
    /**
     * 新しいWorkerを作成
     * @param {string} workerId Worker識別子
     * @param {string} scriptPath Workerスクリプトパス
     * @param {WorkerConfig} config Worker設定
     */
    async createWorker(workerId, scriptPath, config = {}) {
        if (this.workers.has(workerId)) {
            throw new Error(`Worker '${workerId}' は既に存在します`);
        }
        
        console.log(`🔧 Worker作成中: ${workerId}`);
        
        try {
            // Workerインスタンスの作成
            const worker = new Worker(scriptPath, { 
                type: config.type || 'module',
                name: workerId
            });
            
            // Worker設定の保存
            this.workerConfigs.set(workerId, config);
            this.workers.set(workerId, worker);
            
            // メッセージハンドラーの設定
            this.setupWorkerMessageHandler(workerId, worker);
            
            // Workerの初期化
            await this.initializeWorker(workerId, config);
            
            this.stats.activeWorkers++;
            console.log(`✅ Worker作成完了: ${workerId}`);
            
        } catch (error) {
            console.error(`❌ Worker作成失敗 (${workerId}):`, error);
            this.workers.delete(workerId);
            this.workerConfigs.delete(workerId);
            throw error;
        }
    }
    
    /**
     * Workerの初期化
     * @param {string} workerId Worker識別子
     * @param {WorkerConfig} config Worker設定
     */
    async initializeWorker(workerId, config) {
        // AOTモジュールの準備
        const aotModules = await this.aotLoader.getModulesForWorker(workerId, config.aotModules || []);
        
        // 初期化メッセージの送信
        const initMessage = {
            id: this.generateMessageId(),
            type: MessageType.INIT,
            payload: {
                workerId: workerId,
                config: config,
                aotModules: aotModules,
                timestamp: performance.now()
            },
            timestamp: performance.now()
        };
        
        return await this.sendMessage(workerId, initMessage, 30000); // 30秒タイムアウト
    }
    
    /**
     * Workerメッセージハンドラーの設定
     * @param {string} workerId Worker識別子
     * @param {Worker} worker Workerインスタンス
     */
    setupWorkerMessageHandler(workerId, worker) {
        worker.onmessage = (event) => {
            const message = event.data;
            this.handleWorkerMessage(workerId, message);
        };
        
        worker.onerror = (error) => {
            console.error(`❌ Worker error (${workerId}):`, error);
            this.handleWorkerError(workerId, error);
        };
        
        worker.onmessageerror = (error) => {
            console.error(`❌ Worker message error (${workerId}):`, error);
        };
    }
    
    /**
     * Workerメッセージの処理
     * @param {string} workerId Worker識別子
     * @param {WorkerMessage} message 受信メッセージ
     */
    handleWorkerMessage(workerId, message) {
        // 統計更新
        this.updateMessageStats(workerId, message);
        
        // レスポンスハンドラーの確認
        if (message.id && this.responseHandlers.has(message.id)) {
            const handler = this.responseHandlers.get(message.id);
            handler.resolve(message);
            this.responseHandlers.delete(message.id);
            return;
        }
        
        // グローバルメッセージハンドラーの実行
        this.emit(`worker:${workerId}:message`, message);
        this.emit('worker:message', { workerId, message });
    }
    
    /**
     * メッセージ統計の更新
     * @param {string} workerId Worker識別子
     * @param {WorkerMessage} message メッセージ
     */
    updateMessageStats(workerId, message) {
        this.stats.messagesProcessed++;
        
        // レイテンシ計算
        if (message.timestamp) {
            const latency = performance.now() - message.timestamp;
            const currentLatency = this.stats.workerLatency.get(workerId) || [];
            currentLatency.push(latency);
            
            // 最新10件のみ保持
            if (currentLatency.length > 10) {
                currentLatency.shift();
            }
            
            this.stats.workerLatency.set(workerId, currentLatency);
            
            // 平均レスポンス時間の更新
            const totalLatency = Array.from(this.stats.workerLatency.values())
                .flat()
                .reduce((sum, lat) => sum + lat, 0);
            const totalMessages = Array.from(this.stats.workerLatency.values())
                .flat().length;
            
            this.stats.averageResponseTime = totalLatency / totalMessages;
        }
    }
    
    /**
     * メッセージ送信
     * @param {string} workerId Worker識別子
     * @param {WorkerMessage} message 送信メッセージ
     * @param {number} timeout タイムアウト時間（ミリ秒）
     * @returns {Promise<WorkerMessage>} レスポンス
     */
    async sendMessage(workerId, message, timeout = 5000) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            throw new Error(`Worker '${workerId}' が見つかりません`);
        }
        
        // メッセージIDの生成
        if (!message.id) {
            message.id = this.generateMessageId();
        }
        
        return new Promise((resolve, reject) => {
            // タイムアウト設定
            const timeoutId = setTimeout(() => {
                this.responseHandlers.delete(message.id);
                reject(new Error(`Worker '${workerId}' メッセージタイムアウト (${timeout}ms)`));
            }, timeout);
            
            // レスポンスハンドラーの登録
            this.responseHandlers.set(message.id, {
                resolve: (response) => {
                    clearTimeout(timeoutId);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
            
            // メッセージ送信
            try {
                worker.postMessage(message);
            } catch (error) {
                clearTimeout(timeoutId);
                this.responseHandlers.delete(message.id);
                reject(error);
            }
        });
    }
    
    /**
     * 全Workerにブロードキャスト
     * @param {WorkerMessage} message ブロードキャストメッセージ
     * @param {Array} transferList 転送可能オブジェクト
     */
    async broadcast(message, transferList = []) {
        const promises = [];
        
        for (const [workerId, worker] of this.workers) {
            // 各Workerに個別のメッセージIDを割り当て
            const workerMessage = {
                ...message,
                id: this.generateMessageId()
            };
            
            promises.push(
                this.sendMessage(workerId, workerMessage).catch(error => {
                    console.error(`Broadcast failed for worker ${workerId}:`, error);
                    return null; // エラーでも他のWorkerの処理を続行
                })
            );
        }
        
        return await Promise.allSettled(promises);
    }
    
    /**
     * Worker終了
     * @param {string} workerId Worker識別子
     */
    async terminateWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) {
            console.warn(`Worker '${workerId}' は見つかりません`);
            return;
        }
        
        console.log(`🛑 Worker終了中: ${workerId}`);
        
        try {
            // 終了メッセージの送信（タイムアウト短め）
            await this.sendMessage(workerId, {
                type: MessageType.TERMINATE,
                payload: {}
            }, 1000);
        } catch (error) {
            console.warn(`Worker '${workerId}' 正常終了メッセージ送信失敗:`, error);
        }
        
        // Worker強制終了
        worker.terminate();
        
        // 管理データのクリーンアップ
        this.workers.delete(workerId);
        this.workerConfigs.delete(workerId);
        this.stats.workerLatency.delete(workerId);
        this.stats.activeWorkers--;
        
        console.log(`✅ Worker終了完了: ${workerId}`);
    }
    
    /**
     * 全Worker終了
     */
    async terminateAll() {
        console.log('🛑 全Worker終了中...');
        
        const terminationPromises = Array.from(this.workers.keys())
            .map(workerId => this.terminateWorker(workerId));
        
        await Promise.allSettled(terminationPromises);
        
        console.log('✅ 全Worker終了完了');
    }
    
    /**
     * グローバルメッセージハンドラーの設定
     */
    setupGlobalMessageHandlers() {
        this.eventHandlers = new Map();
    }
    
    /**
     * イベントリスナー登録
     * @param {string} event イベント名
     * @param {Function} handler ハンドラー関数
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * イベント発行
     * @param {string} event イベント名
     * @param {...any} args 引数
     */
    emit(event, ...args) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(...args);
            } catch (error) {
                console.error(`Event handler error for '${event}':`, error);
            }
        });
    }
    
    /**
     * Worker状態の取得
     * @param {string} workerId Worker識別子
     * @returns {object} Worker状態
     */
    getWorkerStatus(workerId) {
        const worker = this.workers.get(workerId);
        const config = this.workerConfigs.get(workerId);
        const latency = this.stats.workerLatency.get(workerId) || [];
        
        return {
            exists: !!worker,
            config: config,
            averageLatency: latency.length > 0 
                ? latency.reduce((sum, lat) => sum + lat, 0) / latency.length 
                : 0,
            messageCount: latency.length
        };
    }
    
    /**
     * 全体統計の取得
     * @returns {object} 統計情報
     */
    getStats() {
        return {
            ...this.stats,
            workerLatencyDetails: Object.fromEntries(
                Array.from(this.stats.workerLatency.entries()).map(([id, latencies]) => [
                    id,
                    {
                        average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
                        latest: latencies[latencies.length - 1] || 0,
                        count: latencies.length
                    }
                ])
            )
        };
    }
    
    /**
     * Workerエラーハンドリング
     * @param {string} workerId Worker識別子
     * @param {Error} error エラー
     */
    handleWorkerError(workerId, error) {
        console.error(`Worker '${workerId}' エラー:`, error);
        
        // エラーイベントの発行
        this.emit('worker:error', { workerId, error });
        
        // 必要に応じてWorkerの再起動ロジックを実装
        // this.restartWorker(workerId);
    }
    
    /**
     * メッセージID生成
     * @returns {string} ユニークなメッセージID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// デフォルトエクスポート
export default WorkerManager;