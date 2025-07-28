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

import { MessageType } from './message-protocol.js';
import { AOTLoaderManager } from './aot-loader.js';

export class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.workerConfigs = new Map();
    this.messageQueue = new Map();
    this.responseHandlers = new Map();
    this.aotLoader = new AOTLoaderManager();
    this.initialized = false;

    // イベントハンドラーマップを初期化（安全性確保）
    this.eventHandlers = new Map();

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
        scriptPath: '/tools/workers/game-logic/game-logic-worker.js',
        config: {
          type: 'module',
          capabilities: ['physics', 'collision', 'state'],
          aotModules: ['game_engine', 'physics', 'collision']
        }
      },
      {
        id: 'ai',
        scriptPath: '/tools/workers/ai/ai-worker.js',
        config: {
          type: 'module',
          capabilities: ['strategy', 'prediction', 'difficulty'],
          aotModules: ['ai_enhancer', 'strategy', 'prediction']
        }
      },
      {
        id: 'analytics',
        scriptPath: '/tools/workers/analytics/analytics-worker.js',
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
     * @param {Object} config Worker設定
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
     * Workerの初期化（最適化版: 遅延ロード対応）
     * @param {string} workerId Worker識別子
     * @param {Object} config Worker設定
     */
  async initializeWorker(workerId, config) {
    // AOTモジュールのメタデータのみ準備（実際のバイナリは遅延ロード）
    const aotModuleMetadata = this.prepareAOTModuleMetadata(config.aotModules || []);

    // 初期化メッセージの送信（軽量化）
    const initMessage = {
      id: this.generateMessageId(),
      type: MessageType.INIT,
      payload: {
        workerId: workerId,
        config: config,
        aotModuleMetadata: aotModuleMetadata, // バイナリではなくメタデータのみ
        timestamp: performance.now()
      },
      timestamp: performance.now()
    };

    const result = await this.sendMessage(workerId, initMessage, 60000); // 60秒タイムアウト

    // 初期化成功後、必要なAOTモジュールを遅延ロード
    if (result && result.type === MessageType.INIT_COMPLETE) {
      this.scheduleAOTModulePreload(workerId, config.aotModules || []);
    }

    return result;
  }

  /**
     * AOTモジュールメタデータの準備（軽量）
     * @param {Array} aotModules AOTモジュール名リスト
     * @returns {Object} メタデータオブジェクト
     */
  prepareAOTModuleMetadata(aotModules) {
    const metadata = {};

    for (const moduleName of aotModules) {
      const actualName = this.aotLoader.moduleMapping[moduleName] || moduleName;
      metadata[moduleName] = {
        actualName: actualName,
        available: this.aotLoader.moduleCache.has(moduleName),
        loadOnDemand: true
      };
    }

    return metadata;
  }

  /**
     * AOTモジュールの遅延プリロード（バックグラウンド）
     * @param {string} workerId Worker識別子
     * @param {Array} aotModules AOTモジュール名リスト
     */
  scheduleAOTModulePreload(workerId, aotModules) {
    // バックグラウンドでAOTモジュールをプリロード
    setTimeout(async () => {
      try {
        console.log(`📦 Workerバックグラウンドプリロード開始: ${workerId}`);

        for (const moduleName of aotModules) {
          const moduleData = await this.aotLoader.loadModule(moduleName);

          // Workerにモジュールを送信（Transferable Objects使用）
          const moduleMessage = {
            type: MessageType.LOAD_AOT_MODULE,
            payload: {
              moduleName: moduleName,
              moduleData: moduleData
            }
          };

          await this.sendMessage(workerId, moduleMessage, 10000);
        }

        console.log(`✅ Workerバックグラウンドプリロード完了: ${workerId}`);

      } catch (error) {
        console.warn(`⚠️ Workerバックグラウンドプリロード失敗 (${workerId}):`, error);
      }
    }, 100); // 100ms後に開始（初期化完了後）
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
     * @param {Object} message 受信メッセージ
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
     * メッセージ統計の更新（最適化版）
     * @param {string} workerId Worker識別子
     * @param {WorkerMessage} message メッセージ
     */
  updateMessageStats(workerId, message) {
    this.stats.messagesProcessed++;

    // レイテンシ計算（最適化）
    if (message.timestamp) {
      const latency = performance.now() - message.timestamp;
      const currentLatency = this.stats.workerLatency.get(workerId) || [];
      currentLatency.push(latency);

      // 最新10件のみ保持
      if (currentLatency.length > 10) {
        currentLatency.shift();
      }

      this.stats.workerLatency.set(workerId, currentLatency);

      // 平均レスポンス時間の更新（効率化: 毎回全配列を計算しない）
      if (this.stats.messagesProcessed % 5 === 0) { // 5メッセージごとに更新
        const totalLatency = Array.from(this.stats.workerLatency.values())
          .flat()
          .reduce((sum, lat) => sum + lat, 0);
        const totalMessages = Array.from(this.stats.workerLatency.values())
          .flat().length;

        this.stats.averageResponseTime = totalLatency / totalMessages;
      }
    }
  }

  /**
     * メッセージのTransferable Objects最適化
     * @param {Object} message 送信メッセージ
     * @returns {Object} 最適化されたメッセージとtransferableリスト
     */
  optimizeMessageForTransfer(message) {
    const transferables = [];
    const optimizedMessage = this.deepCloneWithTransferables(message, transferables);

    return {
      message: optimizedMessage,
      transferables: transferables
    };
  }

  /**
     * Transferable Objects検出付きディープクローン
     * @param {*} obj クローン対象オブジェクト
     * @param {Array} transferables Transferable Objects リスト
     * @returns {*} クローンされたオブジェクト
     */
  deepCloneWithTransferables(obj, transferables) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Transferable Objectsの検出
    if (obj instanceof ArrayBuffer ||
            obj instanceof MessagePort ||
            obj instanceof ImageBitmap ||
            (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas)) {
      transferables.push(obj);
      return obj;
    }

    // TypedArrayの検出
    if (ArrayBuffer.isView(obj)) {
      // TypedArrayの場合、そのバッファを転送リストに追加
      if (obj.buffer && transferables.indexOf(obj.buffer) === -1) {
        transferables.push(obj.buffer);
      }
      return obj;
    }

    // 配列の処理
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneWithTransferables(item, transferables));
    }

    // オブジェクトの処理
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepCloneWithTransferables(obj[key], transferables);
      }
    }

    return cloned;
  }

  /**
     * メッセージ送信（Transferable Objects最適化対応）
     * @param {string} workerId Worker識別子
     * @param {Object} message 送信メッセージ
     * @param {number} timeout タイムアウト時間（ミリ秒）
     * @param {Array} transferList 転送可能オブジェクト
     * @returns {Promise<Object>} レスポンス
     */
  async sendMessage(workerId, message, timeout = 5000, transferList = []) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker '${workerId}' が見つかりません`);
    }

    // メッセージIDの生成
    if (!message.id) {
      message.id = this.generateMessageId();
    }

    // 大きなデータの自動Transferable Object変換（重複回避）
    const optimizedMessage = this.optimizeMessageForTransfer(message);

    // 重複するArrayBufferを除去
    const existingBuffers = new Set(transferList);
    const uniqueTransferables = optimizedMessage.transferables.filter(buffer => !existingBuffers.has(buffer));
    const finalTransferList = [...transferList, ...uniqueTransferables];

    // デバッグログ: Transferable Objects処理状況
    console.log(`🔍 WorkerManager sendMessage to ${workerId}:`);
    console.log(`   入力transferList: ${transferList.length}個`);
    console.log(`   自動検出transferables: ${optimizedMessage.transferables.length}個`);
    console.log(`   最終transferList: ${finalTransferList.length}個`);
    if (finalTransferList.length > 0) {
      console.log('   詳細:', finalTransferList.map(buf => `ArrayBuffer(${buf.byteLength}bytes)`));
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

      // メッセージ送信（Transferable Objects使用）
      try {
        if (finalTransferList.length > 0) {
          worker.postMessage(optimizedMessage.message, finalTransferList);
          console.log(`⚡ Zero-copy transfer: ${finalTransferList.length} objects to ${workerId}`);
        } else {
          worker.postMessage(optimizedMessage.message);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        this.responseHandlers.delete(message.id);
        reject(error);
      }
    });
  }

  /**
     * 全Workerにブロードキャスト（最適化版）
     * @param {Object} message ブロードキャストメッセージ
     * @param {Array} transferList 転送可能オブジェクト
     * @param {boolean} shareTransferables Transferable Objectsを共有するか（falseで各Workerに複製）
     */
  async broadcast(message, transferList = [], shareTransferables = false) {
    const promises = [];
    const workerCount = this.workers.size;

    // Transferable Objectsを複製が必要かどうか判定
    const needsCloning = !shareTransferables && transferList.length > 0;

    for (const [workerId, worker] of this.workers) {
      // 各Workerに個別のメッセージIDを割り当て
      const workerMessage = {
        ...message,
        id: this.generateMessageId()
      };

      // Transferable Objectsの処理
      let workerTransferList = transferList;
      if (needsCloning && transferList.length > 0) {
        // 最後のWorker以外は複製作成
        const isLastWorker = promises.length === workerCount - 1;
        workerTransferList = isLastWorker ? transferList : this.cloneTransferables(transferList);
      }

      promises.push(
        this.sendMessage(workerId, workerMessage, 5000, workerTransferList).catch(error => {
          console.error(`Broadcast failed for worker ${workerId}:`, error);
          return null; // エラーでも他のWorkerの処理を続行
        })
      );
    }

    const results = await Promise.allSettled(promises);

    // 成功/失敗の統計
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;

    console.log(`📡 Broadcast完了: ${successful}成功, ${failed}失敗`);

    return results;
  }

  /**
     * Transferable Objectsの複製（必要に応じて）
     * @param {Array} transferList 転送可能オブジェクトリスト
     * @returns {Array} 複製されたtransferableリスト
     */
  cloneTransferables(transferList) {
    return transferList.map(obj => {
      if (obj instanceof ArrayBuffer) {
        return obj.slice(); // ArrayBufferを複製
      } else if (ArrayBuffer.isView(obj)) {
        // TypedArrayの場合、新しいArrayBufferで複製
        const newBuffer = obj.buffer.slice();
        const ctor = obj.constructor;
        return new ctor(newBuffer, obj.byteOffset, obj.length);
      }
      // その他のTransferable Objectsは複製不可能なのでそのまま返す
      return obj;
    });
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
    // eventHandlers Map が初期化されていない場合の安全性チェック
    if (!this.eventHandlers) {
      console.warn(`⚠️ eventHandlers not initialized, cannot register event '${event}'`);
      return;
    }

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
    // eventHandlers Map が初期化されていない場合の安全性チェック
    if (!this.eventHandlers) {
      console.warn(`⚠️ eventHandlers not initialized, skipping event '${event}'`);
      return;
    }

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
