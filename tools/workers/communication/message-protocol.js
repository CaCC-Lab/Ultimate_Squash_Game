/**
 * WebWorker並列処理フェーズ4 - メッセージプロトコル
 * Ultimate Squash Game専用Worker間通信プロトコル
 * 
 * 機能:
 * - 統一メッセージフォーマット
 * - 効率的データ転送
 * - エラーハンドリング
 * - TypedArray最適化
 */

/**
 * メッセージタイプ定義
 */
export const MessageType = {
    // === システム制御 ===
    INIT: 'INIT',
    INIT_COMPLETE: 'INIT_COMPLETE',
    TERMINATE: 'TERMINATE',
    PING: 'PING',
    PONG: 'PONG',
    
    // === ゲーム制御 ===
    START_GAME: 'START_GAME',
    PAUSE_GAME: 'PAUSE_GAME',
    RESUME_GAME: 'RESUME_GAME',
    RESTART_GAME: 'RESTART_GAME',
    
    // === 状態更新 ===
    UPDATE_GAME_STATE: 'UPDATE_GAME_STATE',
    PLAYER_INPUT: 'PLAYER_INPUT',
    BALL_POSITION: 'BALL_POSITION',
    RACKET_POSITION: 'RACKET_POSITION',
    
    // === AI関連 ===
    AI_MOVE_REQUEST: 'AI_MOVE_REQUEST',
    AI_MOVE_RESPONSE: 'AI_MOVE_RESPONSE',
    AI_DIFFICULTY_UPDATE: 'AI_DIFFICULTY_UPDATE',
    AI_STRATEGY_CHANGE: 'AI_STRATEGY_CHANGE',
    
    // === パフォーマンス・分析 ===
    METRICS_UPDATE: 'METRICS_UPDATE',
    PERFORMANCE_REPORT: 'PERFORMANCE_REPORT',
    FRAME_STATS: 'FRAME_STATS',
    MEMORY_USAGE: 'MEMORY_USAGE',
    
    // === AOTバイトコード ===
    LOAD_AOT_MODULE: 'LOAD_AOT_MODULE',
    AOT_MODULE_LOADED: 'AOT_MODULE_LOADED',
    AOT_MODULE_ERROR: 'AOT_MODULE_ERROR',
    
    // === エラー・応答 ===
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
    RESPONSE: 'RESPONSE'
};

/**
 * メッセージ優先度
 */
export const MessagePriority = {
    CRITICAL: 'CRITICAL',  // システム制御
    HIGH: 'HIGH',          // ゲーム状態更新
    NORMAL: 'NORMAL',      // AI処理
    LOW: 'LOW'             // 分析・メトリクス
};

/**
 * 基本メッセージインターフェース
 * @typedef {Object} WorkerMessage
 * @property {string} id - ユニークなメッセージID
 * @property {MessageType} type - メッセージタイプ
 * @property {any} payload - メッセージペイロード
 * @property {number} timestamp - 送信時刻（performance.now()）
 * @property {MessagePriority} priority - メッセージ優先度
 * @property {string} [source] - 送信元Worker ID
 * @property {string} [target] - 送信先Worker ID
 */

/**
 * Worker設定インターフェース
 * @typedef {Object} WorkerConfig
 * @property {string} type - Workerタイプ ('module' | 'classic')
 * @property {Array<string>} capabilities - Worker機能リスト
 * @property {Array<string>} aotModules - 使用するAOTモジュール
 * @property {number} [maxMemory] - 最大メモリ使用量（MB）
 * @property {number} [timeout] - デフォルトタイムアウト（ms）
 */

/**
 * ゲーム状態更新データ（高効率転送用）
 * TypedArrayを使用してメモリ効率とパフォーマンスを最適化
 */
export class GameStateUpdate {
    constructor() {
        // Float32Array: 4バイト × 要素数
        this.ballPosition = new Float32Array(2);     // [x, y]
        this.ballVelocity = new Float32Array(2);     // [vx, vy]
        this.racketPosition = new Float32Array(2);   // [x, y]
        this.racketVelocity = new Float32Array(2);   // [vx, vy]
        
        // Uint32Array: 4バイト × 要素数
        this.frameNumber = new Uint32Array(1);       // フレーム番号
        this.timestamp = new Uint32Array(2);         // 64bit timestamp (high, low)
        
        // Uint16Array: 2バイト × 要素数
        this.score = new Uint16Array(2);             // [player1, player2]
        
        // Uint8Array: 1バイト × 要素数
        this.gameFlags = new Uint8Array(8);          // ゲーム状態フラグ
        
        // 総サイズ: 72バイト（コンパクト設計）
    }
    
    /**
     * ゲーム状態フラグの設定
     * @param {number} flagIndex フラグインデックス
     * @param {boolean} value フラグ値
     */
    setFlag(flagIndex, value) {
        this.gameFlags[flagIndex] = value ? 1 : 0;
    }
    
    /**
     * ゲーム状態フラグの取得
     * @param {number} flagIndex フラグインデックス
     * @returns {boolean} フラグ値
     */
    getFlag(flagIndex) {
        return this.gameFlags[flagIndex] === 1;
    }
    
    /**
     * 転送可能オブジェクトリストの取得
     * @returns {Array<ArrayBuffer>} 転送可能なバッファ一覧
     */
    getTransferList() {
        return [
            this.ballPosition.buffer,
            this.ballVelocity.buffer,
            this.racketPosition.buffer,
            this.racketVelocity.buffer,
            this.frameNumber.buffer,
            this.timestamp.buffer,
            this.score.buffer,
            this.gameFlags.buffer
        ];
    }
    
    /**
     * JSONシリアライゼーション
     * @returns {Object} シリアライズされたデータ
     */
    toJSON() {
        return {
            ballPosition: Array.from(this.ballPosition),
            ballVelocity: Array.from(this.ballVelocity),
            racketPosition: Array.from(this.racketPosition),
            racketVelocity: Array.from(this.racketVelocity),
            frameNumber: this.frameNumber[0],
            timestamp: this.timestamp[0] * 0x100000000 + this.timestamp[1],
            score: Array.from(this.score),
            gameFlags: Array.from(this.gameFlags)
        };
    }
    
    /**
     * JSONデシリアライゼーション
     * @param {Object} data デシリアライズするデータ
     */
    fromJSON(data) {
        this.ballPosition.set(data.ballPosition);
        this.ballVelocity.set(data.ballVelocity);
        this.racketPosition.set(data.racketPosition);
        this.racketVelocity.set(data.racketVelocity);
        this.frameNumber[0] = data.frameNumber;
        
        // 64bit timestampの分割
        const timestamp = data.timestamp;
        this.timestamp[0] = Math.floor(timestamp / 0x100000000);
        this.timestamp[1] = timestamp % 0x100000000;
        
        this.score.set(data.score);
        this.gameFlags.set(data.gameFlags);
    }
}

/**
 * AI移動要求データ
 */
export class AIMoveRequest {
    constructor() {
        this.ballPosition = new Float32Array(2);
        this.ballVelocity = new Float32Array(2);
        this.racketPosition = new Float32Array(2);
        this.difficulty = new Uint8Array(1);
        this.timestamp = new Uint32Array(2);
    }
    
    getTransferList() {
        return [
            this.ballPosition.buffer,
            this.ballVelocity.buffer,
            this.racketPosition.buffer,
            this.difficulty.buffer,
            this.timestamp.buffer
        ];
    }
}

/**
 * AI移動応答データ
 */
export class AIMoveResponse {
    constructor() {
        this.targetPosition = new Float32Array(2);   // 目標位置
        this.confidence = new Float32Array(1);       // 判断信頼度
        this.strategy = new Uint8Array(1);           // 使用戦略ID
        this.timestamp = new Uint32Array(2);
    }
    
    getTransferList() {
        return [
            this.targetPosition.buffer,
            this.confidence.buffer,
            this.strategy.buffer,
            this.timestamp.buffer
        ];
    }
}

/**
 * パフォーマンスメトリクス
 */
export class PerformanceMetrics {
    constructor() {
        this.fps = new Float32Array(1);
        this.frameTime = new Float32Array(1);        // ms
        this.memoryUsage = new Float32Array(1);      // MB
        this.cpuUsage = new Float32Array(1);         // %
        this.workerLatency = new Float32Array(4);    // [game, ai, analytics, avg]
        this.timestamp = new Uint32Array(2);
    }
    
    getTransferList() {
        return [
            this.fps.buffer,
            this.frameTime.buffer,
            this.memoryUsage.buffer,
            this.cpuUsage.buffer,
            this.workerLatency.buffer,
            this.timestamp.buffer
        ];
    }
}

/**
 * メッセージビルダークラス
 * 効率的なメッセージ作成を支援
 */
export class MessageBuilder {
    constructor() {
        this.message = {
            id: null,
            type: null,
            payload: null,
            timestamp: performance.now(),
            priority: MessagePriority.NORMAL
        };
    }
    
    /**
     * メッセージIDの設定
     * @param {string} id メッセージID
     * @returns {MessageBuilder} チェーン用
     */
    id(id) {
        this.message.id = id;
        return this;
    }
    
    /**
     * メッセージタイプの設定
     * @param {MessageType} type メッセージタイプ
     * @returns {MessageBuilder} チェーン用
     */
    type(type) {
        this.message.type = type;
        return this;
    }
    
    /**
     * ペイロードの設定
     * @param {any} payload ペイロード
     * @returns {MessageBuilder} チェーン用
     */
    payload(payload) {
        this.message.payload = payload;
        return this;
    }
    
    /**
     * 優先度の設定
     * @param {MessagePriority} priority 優先度
     * @returns {MessageBuilder} チェーン用
     */
    priority(priority) {
        this.message.priority = priority;
        return this;
    }
    
    /**
     * 送信元の設定
     * @param {string} source 送信元ID
     * @returns {MessageBuilder} チェーン用
     */
    source(source) {
        this.message.source = source;
        return this;
    }
    
    /**
     * 送信先の設定
     * @param {string} target 送信先ID
     * @returns {MessageBuilder} チェーン用
     */
    target(target) {
        this.message.target = target;
        return this;
    }
    
    /**
     * メッセージの構築
     * @returns {WorkerMessage} 構築されたメッセージ
     */
    build() {
        if (!this.message.id) {
            this.message.id = this.generateMessageId();
        }
        
        return { ...this.message };
    }
    
    /**
     * ゲーム状態更新メッセージの作成
     * @param {GameStateUpdate} gameState ゲーム状態
     * @returns {Object} メッセージと転送リスト
     */
    static createGameStateUpdate(gameState) {
        const message = new MessageBuilder()
            .type(MessageType.UPDATE_GAME_STATE)
            .priority(MessagePriority.HIGH)
            .payload(gameState)
            .build();
            
        return {
            message,
            transferList: gameState.getTransferList()
        };
    }
    
    /**
     * AI移動要求メッセージの作成
     * @param {AIMoveRequest} request AI移動要求
     * @returns {Object} メッセージと転送リスト
     */
    static createAIMoveRequest(request) {
        const message = new MessageBuilder()
            .type(MessageType.AI_MOVE_REQUEST)
            .priority(MessagePriority.NORMAL)
            .payload(request)
            .build();
            
        return {
            message,
            transferList: request.getTransferList()
        };
    }
    
    /**
     * パフォーマンスメトリクスメッセージの作成
     * @param {PerformanceMetrics} metrics パフォーマンスメトリクス
     * @returns {Object} メッセージと転送リスト
     */
    static createPerformanceReport(metrics) {
        const message = new MessageBuilder()
            .type(MessageType.PERFORMANCE_REPORT)
            .priority(MessagePriority.LOW)
            .payload(metrics)
            .build();
            
        return {
            message,
            transferList: metrics.getTransferList()
        };
    }
    
    /**
     * メッセージID生成
     * @returns {string} ユニークなメッセージID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * メッセージバリデーター
 */
export class MessageValidator {
    /**
     * メッセージの基本検証
     * @param {WorkerMessage} message 検証するメッセージ
     * @returns {boolean} 検証結果
     */
    static validateMessage(message) {
        if (!message || typeof message !== 'object') {
            return false;
        }
        
        // 必須フィールドの確認
        const requiredFields = ['id', 'type', 'timestamp'];
        for (const field of requiredFields) {
            if (!(field in message)) {
                console.error(`メッセージに必須フィールド '${field}' がありません`);
                return false;
            }
        }
        
        // メッセージタイプの確認
        if (!Object.values(MessageType).includes(message.type)) {
            console.error(`未知のメッセージタイプ: ${message.type}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * ペイロードの型チェック
     * @param {MessageType} type メッセージタイプ
     * @param {any} payload ペイロード
     * @returns {boolean} 検証結果
     */
    static validatePayload(type, payload) {
        switch (type) {
            case MessageType.UPDATE_GAME_STATE:
                return payload instanceof GameStateUpdate;
                
            case MessageType.AI_MOVE_REQUEST:
                return payload instanceof AIMoveRequest;
                
            case MessageType.AI_MOVE_RESPONSE:
                return payload instanceof AIMoveResponse;
                
            case MessageType.PERFORMANCE_REPORT:
                return payload instanceof PerformanceMetrics;
                
            default:
                return true; // その他の型は制限なし
        }
    }
}

/**
 * ゲーム状態フラグ定数
 */
export const GameFlags = {
    PAUSED: 0,
    GAME_OVER: 1,
    BALL_HIT_RACKET: 2,
    BALL_HIT_WALL: 3,
    SCORE_CHANGED: 4,
    LEVEL_UP: 5,
    AI_ACTIVE: 6,
    SOUND_ENABLED: 7
};

/**
 * AI戦略定数
 */
export const AIStrategy = {
    DEFENSIVE: 0,
    AGGRESSIVE: 1,
    PREDICTIVE: 2,
    ADAPTIVE: 3,
    RANDOM: 4
};

// デフォルトエクスポート
export default {
    MessageType,
    MessagePriority,
    GameStateUpdate,
    AIMoveRequest,
    AIMoveResponse,
    PerformanceMetrics,
    MessageBuilder,
    MessageValidator,
    GameFlags,
    AIStrategy
};