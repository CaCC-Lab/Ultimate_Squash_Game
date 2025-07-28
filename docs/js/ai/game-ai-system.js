/**
 * Ultimate Squash Game AI System
 * Web版へのAI機能統合
 */

class GameAISystem {
    constructor() {
        // 設定を取得
        this.config = window.configLoader?.getAIConfig() || {
            commentaryEnabled: true,
            commentaryInterval: 5000,
            cacheExpiry: 30000,
            adaEnabled: true
        };
        
        this.enabled = this.config.commentaryEnabled;
        this.commentaryQueue = [];
        this.commentaryElement = null;
        this.adaSystem = new ADASystem();
        this.initializeUI();
    }
    
    /**
     * AI機能のUI要素を初期化
     */
    initializeUI() {
        // UIHelperが利用可能か確認
        const createEl = window.UIHelper ? 
            (tag, opts) => window.UIHelper.createElement(tag, opts) : 
            this.createElementFallback.bind(this);
        
        // AIコメンタリー表示要素
        const commentaryDiv = createEl('div', {
            id: 'ai-commentary',
            className: 'ai-commentary',
            cssText: `
                position: absolute;
                bottom: 100px;
                left: 20px;
                max-width: 300px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 14px;
                display: none;
                z-index: 1000;
                transition: opacity 0.3s ease;
            `
        });
        document.body.appendChild(commentaryDiv);
        this.commentaryElement = commentaryDiv;
        
        // AI機能トグルボタン
        const toggleButton = createEl('button', {
            id: 'ai-toggle-button',
            className: 'ai-toggle-button',
            innerHTML: '🤖 AI',
            attributes: { 'data-ai-enabled': 'true' },
            cssText: `
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 16px;
                z-index: 1001;
                transition: background 0.3s ease;
            `,
            events: { click: () => this.toggleAI() }
        });
        document.body.appendChild(toggleButton);
        
        // ADA情報パネル
        const adaPanel = createEl('div', {
            id: 'ada-info-panel',
            className: 'ada-info-panel',
            cssText: `
                position: absolute;
                top: 80px;
                right: 20px;
                width: 200px;
                background: rgba(0, 0, 50, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-size: 12px;
                display: none;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `,
            innerHTML: `
                <h4 style="margin: 0 0 10px 0;">ADA System</h4>
                <div id="ada-difficulty">難易度: 1.0x</div>
                <div id="ada-miss-rate">ミス率: 0%</div>
                <div id="ada-evaluation">評価: 0/10</div>
            `
        });
        document.body.appendChild(adaPanel);
    }
    
    /**
     * AI機能の有効/無効を切り替え
     */
    toggleAI() {
        this.enabled = !this.enabled;
        const button = document.getElementById('ai-toggle-button');
        const commentary = document.getElementById('ai-commentary');
        const adaPanel = document.getElementById('ada-info-panel');
        
        if (this.enabled) {
            button.style.background = '#4CAF50';
            button.setAttribute('data-ai-enabled', 'true');
            if (this.commentaryQueue.length > 0) {
                commentary.style.display = 'block';
            }
            adaPanel.style.display = 'block';
        } else {
            button.style.background = '#666';
            button.setAttribute('data-ai-enabled', 'false');
            commentary.style.display = 'none';
            adaPanel.style.display = 'none';
        }
    }
    
    /**
     * ゲームイベントを処理してコメンタリーを生成
     */
    async processGameEvent(eventType, eventData) {
        if (!this.enabled) return;
        
        let commentary = '';
        
        switch (eventType) {
            case 'paddleHit':
                commentary = this.generatePaddleHitCommentary(eventData);
                break;
            case 'miss':
                commentary = this.generateMissCommentary(eventData);
                break;
            case 'score':
                commentary = this.generateScoreCommentary(eventData);
                break;
            case 'wallHit':
                if (Math.random() < 0.1) { // 10%の確率でコメント
                    commentary = 'ボールが壁に反射！';
                }
                break;
        }
        
        if (commentary) {
            this.showCommentary(commentary);
        }
    }
    
    /**
     * createElementのフォールバック実装
     */
    createElementFallback(tag, options) {
        const element = document.createElement(tag);
        if (options.id) element.id = options.id;
        if (options.className) element.className = options.className;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.cssText) element.style.cssText = options.cssText;
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        }
        return element;
    }
    
    /**
     * パドルヒット時のコメンタリー生成
     */
    generatePaddleHitCommentary(data) {
        const comments = [
            'ナイスヒット！',
            '素晴らしい反応！',
            '見事なラケットワーク！',
            'いいぞ、その調子！',
            '完璧なタイミング！'
        ];
        return comments[Math.floor(Math.random() * comments.length)];
    }
    
    /**
     * ミス時のコメンタリー生成
     */
    generateMissCommentary(data) {
        const comments = [
            '惜しい！',
            '次は取れる！',
            'ドンマイ！',
            '集中して！',
            'もう一度チャレンジ！'
        ];
        return comments[Math.floor(Math.random() * comments.length)];
    }
    
    /**
     * スコア更新時のコメンタリー生成
     */
    generateScoreCommentary(data) {
        const score = data.score || 0;
        
        if (score === 100) {
            return '100点突破！素晴らしい！';
        } else if (score === 500) {
            return '500点達成！プロ級の腕前！';
        } else if (score === 1000) {
            return '1000点！伝説的なプレイ！';
        } else if (score % 250 === 0) {
            return `${score}点！調子がいいね！`;
        }
        
        return '';
    }
    
    /**
     * コメンタリーを表示
     */
    showCommentary(text) {
        if (!this.enabled || !this.commentaryElement) return;
        
        this.commentaryElement.textContent = text;
        this.commentaryElement.style.display = 'block';
        this.commentaryElement.style.opacity = '1';
        
        // 設定可能な間隔でフェードアウト
        setTimeout(() => {
            this.commentaryElement.style.opacity = '0';
            setTimeout(() => {
                this.commentaryElement.style.display = 'none';
            }, 300);
        }, this.config.commentaryInterval * 0.6 || 3000);
    }
}

/**
 * ADA (AI Dynamic Adjustment) System
 */
class ADASystem {
    constructor() {
        this.enabled = true;
        this.currentDifficulty = 1.0;
        this.missRate = 0;
        this.hitCount = 0;
        this.missCount = 0;
        this.evaluationCount = 0;
        this.evaluationWindow = 10;
    }
    
    /**
     * ヒット/ミスを記録して難易度を調整
     */
    recordEvent(isHit) {
        if (!this.enabled) return;
        
        if (isHit) {
            this.hitCount++;
        } else {
            this.missCount++;
        }
        
        this.evaluationCount = this.hitCount + this.missCount;
        
        // 評価ウィンドウに達したら難易度調整
        if (this.evaluationCount >= this.evaluationWindow) {
            this.adjustDifficulty();
        }
        
        this.updateDisplay();
    }
    
    /**
     * 難易度を調整
     */
    adjustDifficulty() {
        const totalAttempts = this.hitCount + this.missCount;
        this.missRate = this.missCount / totalAttempts;
        
        if (this.missRate > 0.3) {
            // ミス率30%以上: 速度を20%減少
            this.currentDifficulty *= 0.8;
            console.log(`ADA: 難易度を下げました（ミス率: ${(this.missRate * 100).toFixed(1)}%）`);
        } else if (this.missRate < 0.1) {
            // ミス率10%未満: 速度を15%増加
            this.currentDifficulty *= 1.15;
            console.log(`ADA: 難易度を上げました（ミス率: ${(this.missRate * 100).toFixed(1)}%）`);
        }
        
        // 難易度を0.5〜2.0の範囲に制限
        this.currentDifficulty = Math.max(0.5, Math.min(2.0, this.currentDifficulty));
        
        // カウンターリセット
        this.hitCount = 0;
        this.missCount = 0;
        this.evaluationCount = 0;
    }
    
    /**
     * ADA情報の表示を更新
     */
    updateDisplay() {
        const difficultyEl = document.getElementById('ada-difficulty');
        const missRateEl = document.getElementById('ada-miss-rate');
        const evaluationEl = document.getElementById('ada-evaluation');
        
        if (difficultyEl) {
            difficultyEl.textContent = `難易度: ${this.currentDifficulty.toFixed(1)}x`;
        }
        
        if (missRateEl) {
            const rate = (this.missRate * 100).toFixed(1);
            missRateEl.textContent = `ミス率: ${rate}%`;
        }
        
        if (evaluationEl) {
            evaluationEl.textContent = `評価: ${this.evaluationCount}/${this.evaluationWindow}`;
        }
    }
}

// グローバル変数の初期定義（初期化前でもエラーにならないように）
window.gameAI = null;
window.aiManager = null;
window.aiCommentary = null;
window.gameADA = null;

// GameAISystemのインスタンス作成をDOMロード後に実行
function initializeGameAI() {
    window.gameAI = new GameAISystem();
    window.aiManager = window.gameAI;
    window.aiCommentary = window.gameAI;
    window.gameADA = window.gameAI.adaSystem;
    
    // ゲームイベントリスナーの設定
    window.addEventListener('game:paddleHit', (event) => {
        window.gameAI.processGameEvent('paddleHit', event.detail);
        window.gameADA.recordEvent(true);
    });

    window.addEventListener('game:miss', (event) => {
        window.gameAI.processGameEvent('miss', event.detail);
        window.gameADA.recordEvent(false);
    });

    window.addEventListener('game:score', (event) => {
        window.gameAI.processGameEvent('score', event.detail);
    });

    window.addEventListener('game:wallHit', (event) => {
        window.gameAI.processGameEvent('wallHit', event.detail);
    });
    
    // ADAパネルを表示
    if (window.gameAI.enabled) {
        const panel = document.getElementById('ada-info-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
}

// 初期化時にDOMロード状態を確認
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGameAI);
} else {
    // 既にDOMが読み込まれている場合は即座に初期化
    initializeGameAI();
}