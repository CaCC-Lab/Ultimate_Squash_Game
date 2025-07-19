/**
 * ウィークリーチャレンジ統合システム
 * ゲームエンジンとチャレンジシステムの統合を管理
 */

// デバッグ用のローカルストレージキー
const DEBUG_STORAGE_KEY = 'weekly_challenge_debug';

class WeeklyChallengeIntegration {
    constructor() {
        this.challengeEvaluator = new ChallengeEvaluator();
        this.challengeGenerator = new ChallengeGenerator();
        this.challengeRewards = new ChallengeRewards();
        this.currentChallenge = null;
        this.challengeProgress = {};
        this.gameSession = null;
        this.listeners = [];
        
        // UIコントロール
        this.uiControls = {
            challengeDisplay: null,
            progressBar: null,
            rewardNotification: null,
            challengeButton: null
        };
        
        this.initializeChallenge();
    }
    
    /**
     * 現在のチャレンジを初期化
     */
    initializeChallenge() {
        try {
            const weeklyChallenge = new WeeklyChallenge();
            this.currentChallenge = this.challengeGenerator.generateChallenge(weeklyChallenge.weekNumber);
            
            if (this.currentChallenge) {
                this.challengeProgress = this.loadChallengeProgress();
                this.setupUI();
                this.notifyListeners('challengeInitialized', this.currentChallenge);
            }
        } catch (error) {
            console.error('チャレンジ初期化エラー:', error);
            this.handleError('チャレンジを初期化できませんでした', error);
        }
    }
    
    /**
     * ゲームセッションを開始
     * @param {Object} gameState - ゲーム状態オブジェクト
     */
    startGameSession(gameState) {
        if (!this.currentChallenge) {
            console.warn('アクティブなチャレンジがありません');
            return;
        }
        
        this.gameSession = {
            startTime: Date.now(),
            gameState: gameState,
            sessionStats: {
                score: 0,
                hits: 0,
                duration: 0,
                maxCombo: 0,
                ballSpeed: gameState.ballSpeed || 5,
                paddleSize: gameState.paddleSize || 100
            }
        };
        
        this.notifyListeners('gameSessionStarted', this.gameSession);
        console.log('ゲームセッション開始:', this.currentChallenge.title);
    }
    
    /**
     * ゲーム状態を更新
     * @param {Object} gameState - 更新されたゲーム状態
     */
    updateGameState(gameState) {
        if (!this.gameSession) return;
        
        // セッション統計を更新
        this.gameSession.sessionStats = {
            score: gameState.score || 0,
            hits: gameState.hits || 0,
            duration: Date.now() - this.gameSession.startTime,
            maxCombo: gameState.maxCombo || 0,
            ballSpeed: gameState.ballSpeed || 5,
            paddleSize: gameState.paddleSize || 100
        };
        
        // チャレンジの進捗を評価
        this.evaluateProgress();
        
        // ゲームが終了した場合の処理
        if (gameState.isGameOver) {
            this.endGameSession();
        }
    }
    
    /**
     * チャレンジの進捗を評価
     */
    evaluateProgress() {
        if (!this.gameSession || !this.currentChallenge) return;
        
        const stats = this.gameSession.sessionStats;
        const evaluation = this.challengeEvaluator.evaluateChallenge(
            this.currentChallenge,
            stats
        );
        
        // 進捗が更新された場合
        if (evaluation.completed && !this.challengeProgress.completed) {
            this.onChallengeCompleted(evaluation);
        } else if (evaluation.progress > this.challengeProgress.progress) {
            this.challengeProgress.progress = evaluation.progress;
            this.updateProgressDisplay();
            this.saveChallengeProgress();
        }
    }
    
    /**
     * チャレンジ完了時の処理
     * @param {Object} evaluation - チャレンジ評価結果
     */
    onChallengeCompleted(evaluation) {
        this.challengeProgress.completed = true;
        this.challengeProgress.completedAt = Date.now();
        this.challengeProgress.finalScore = evaluation.score;
        
        // 報酬を計算
        const reward = this.challengeRewards.calculateReward(
            this.currentChallenge,
            evaluation.score
        );
        
        this.challengeProgress.reward = reward;
        this.saveChallengeProgress();
        
        // 報酬通知を表示
        this.showRewardNotification(reward);
        
        // リスナーに通知
        this.notifyListeners('challengeCompleted', {
            challenge: this.currentChallenge,
            evaluation: evaluation,
            reward: reward
        });
        
        console.log('チャレンジ完了!', {
            challenge: this.currentChallenge.title,
            score: evaluation.score,
            reward: reward
        });
    }
    
    /**
     * ゲームセッションを終了
     */
    endGameSession() {
        if (!this.gameSession) return;
        
        const finalStats = this.gameSession.sessionStats;
        this.gameSession = null;
        
        this.notifyListeners('gameSessionEnded', finalStats);
        console.log('ゲームセッション終了:', finalStats);
    }
    
    /**
     * UIセットアップ
     */
    setupUI() {
        this.createChallengeDisplay();
        this.createProgressBar();
        this.createRewardNotification();
        this.createChallengeButton();
        this.updateChallengeDisplay();
    }
    
    /**
     * チャレンジ表示UI作成
     */
    createChallengeDisplay() {
        const container = document.createElement('div');
        container.className = 'challenge-display';
        container.innerHTML = `
            <div class="challenge-info">
                <h3 class="challenge-title"></h3>
                <p class="challenge-description"></p>
                <div class="challenge-reward">
                    <span class="reward-points"></span>
                    <span class="reward-badges"></span>
                </div>
            </div>
        `;
        
        // ゲームコンテナに追加
        const gameContainer = document.querySelector('.game-container') || document.body;
        gameContainer.appendChild(container);
        
        this.uiControls.challengeDisplay = container;
    }
    
    /**
     * プログレスバー作成
     */
    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'challenge-progress';
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">0%</div>
        `;
        
        this.uiControls.challengeDisplay.appendChild(progressBar);
        this.uiControls.progressBar = progressBar;
    }
    
    /**
     * 報酬通知UI作成
     */
    createRewardNotification() {
        const notification = document.createElement('div');
        notification.className = 'reward-notification hidden';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>チャレンジ完了！</h4>
                <div class="reward-details">
                    <div class="points-earned"></div>
                    <div class="badges-earned"></div>
                </div>
                <button class="close-notification">OK</button>
            </div>
        `;
        
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.add('hidden');
        });
        
        document.body.appendChild(notification);
        this.uiControls.rewardNotification = notification;
    }
    
    /**
     * チャレンジボタン作成
     */
    createChallengeButton() {
        const button = document.createElement('button');
        button.className = 'challenge-button';
        button.textContent = 'チャレンジを表示';
        button.addEventListener('click', () => {
            this.toggleChallengeDisplay();
        });
        
        const gameContainer = document.querySelector('.game-container') || document.body;
        gameContainer.appendChild(button);
        
        this.uiControls.challengeButton = button;
    }
    
    /**
     * チャレンジ表示の切り替え
     */
    toggleChallengeDisplay() {
        if (this.uiControls.challengeDisplay) {
            this.uiControls.challengeDisplay.classList.toggle('hidden');
        }
    }
    
    /**
     * チャレンジ表示を更新
     */
    updateChallengeDisplay() {
        if (!this.currentChallenge || !this.uiControls.challengeDisplay) return;
        
        const display = this.uiControls.challengeDisplay;
        display.querySelector('.challenge-title').textContent = this.currentChallenge.title;
        display.querySelector('.challenge-description').textContent = this.currentChallenge.description;
        display.querySelector('.reward-points').textContent = `${this.currentChallenge.reward.points}pt`;
        display.querySelector('.reward-badges').textContent = this.currentChallenge.reward.badges.join(', ');
        
        this.updateProgressDisplay();
    }
    
    /**
     * プログレス表示を更新
     */
    updateProgressDisplay() {
        if (!this.uiControls.progressBar) return;
        
        const progress = Math.min(100, Math.max(0, this.challengeProgress.progress || 0));
        const progressFill = this.uiControls.progressBar.querySelector('.progress-fill');
        const progressText = this.uiControls.progressBar.querySelector('.progress-text');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        
        if (this.challengeProgress.completed) {
            this.uiControls.progressBar.classList.add('completed');
        }
    }
    
    /**
     * 報酬通知を表示
     * @param {Object} reward - 報酬オブジェクト
     */
    showRewardNotification(reward) {
        if (!this.uiControls.rewardNotification) return;
        
        const notification = this.uiControls.rewardNotification;
        notification.querySelector('.points-earned').textContent = `${reward.points}ポイント獲得！`;
        notification.querySelector('.badges-earned').textContent = reward.badges.length > 0 ? 
            `バッジ獲得: ${reward.badges.join(', ')}` : '';
        
        notification.classList.remove('hidden');
        
        // 3秒後に自動で閉じる
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * チャレンジ進捗を保存
     */
    saveChallengeProgress() {
        const storageKey = `challenge_progress_${this.currentChallenge.id}`;
        localStorage.setItem(storageKey, JSON.stringify(this.challengeProgress));
    }
    
    /**
     * チャレンジ進捗を読み込み
     */
    loadChallengeProgress() {
        if (!this.currentChallenge) return { progress: 0, completed: false };
        
        const storageKey = `challenge_progress_${this.currentChallenge.id}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('進捗データの読み込みエラー:', error);
            }
        }
        
        return { progress: 0, completed: false };
    }
    
    /**
     * イベントリスナーを追加
     * @param {Function} listener - リスナー関数
     */
    addListener(listener) {
        this.listeners.push(listener);
    }
    
    /**
     * イベントリスナーを削除
     * @param {Function} listener - リスナー関数
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * リスナーに通知
     * @param {string} event - イベント名
     * @param {any} data - データ
     */
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('リスナー通知エラー:', error);
            }
        });
    }
    
    /**
     * エラーハンドリング
     * @param {string} message - エラーメッセージ
     * @param {Error} error - エラーオブジェクト
     */
    handleError(message, error) {
        console.error(message, error);
        this.notifyListeners('error', { message, error });
    }
    
    /**
     * 現在のチャレンジ情報を取得
     */
    getCurrentChallenge() {
        return this.currentChallenge;
    }
    
    /**
     * チャレンジ統計を取得
     */
    getChallengeStats() {
        return {
            current: this.currentChallenge,
            progress: this.challengeProgress,
            session: this.gameSession
        };
    }
}

// デバッグ用ヘルパー
class WeeklyChallengeDebug {
    static enableDebugMode() {
        localStorage.setItem(DEBUG_STORAGE_KEY, 'true');
        console.log('ウィークリーチャレンジ デバッグモード有効');
    }
    
    static disableDebugMode() {
        localStorage.removeItem(DEBUG_STORAGE_KEY);
        console.log('ウィークリーチャレンジ デバッグモード無効');
    }
    
    static isDebugMode() {
        return localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
    }
    
    static simulateChallengeCompletion(integration) {
        if (!integration.currentChallenge) {
            console.error('アクティブなチャレンジがありません');
            return;
        }
        
        // 模擬ゲーム統計を作成
        const mockStats = {
            score: 1000,
            hits: 50,
            duration: 120000, // 2分
            maxCombo: 10,
            ballSpeed: 5,
            paddleSize: 100
        };
        
        integration.gameSession = {
            startTime: Date.now() - 120000,
            sessionStats: mockStats
        };
        
        integration.evaluateProgress();
        console.log('チャレンジ完了をシミュレート');
    }
}

// グローバルに公開
window.WeeklyChallengeIntegration = WeeklyChallengeIntegration;
window.WeeklyChallengeDebug = WeeklyChallengeDebug;