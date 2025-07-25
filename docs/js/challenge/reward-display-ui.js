/**
 * チャレンジ完了時の報酬表示UI
 * 
 * アニメーション付きの3段階表示システム
 * 1. サマリー表示
 * 2. 詳細ブレークダウン
 * 3. 次のアクション提案
 */

class RewardDisplayUI {
    constructor() {
        this.container = null;
        this.currentStage = 0;
        this.rewardData = null;
        this.animationQueue = [];
        this.particleSystem = null;
        this.soundEnabled = true;
        
        // ステージ定義
        this.stages = [
            { name: 'summary', duration: 3000 },
            { name: 'breakdown', duration: 5000 },
            { name: 'action', duration: 3000 }
        ];
        
        // アニメーション設定
        this.animations = {
            fadeIn: 300,
            slideIn: 500,
            bounce: 800,
            shine: 1000,
            particleBurst: 1500
        };
    }
    
    /**
     * 報酬表示を開始
     * @param {Object} rewardData - 報酬データ
     * @param {Object} challengeData - チャレンジデータ
     * @param {Object} gameStats - ゲーム統計
     */
    async show(rewardData, challengeData, gameStats) {
        this.rewardData = rewardData;
        this.challengeData = challengeData;
        this.gameStats = gameStats;
        
        // UIコンテナを作成
        this.createContainer();
        
        // パーティクルシステムを初期化
        this.initParticleSystem();
        
        // サウンドを再生
        this.playSound('reward_show');
        
        // ステージを順番に表示
        await this.showStage('summary');
        await this.delay(this.stages[0].duration);
        
        await this.showStage('breakdown');
        await this.delay(this.stages[1].duration);
        
        await this.showStage('action');
        
        // 自動で閉じるか、ユーザーの操作を待つ
        this.setupInteractions();
    }
    
    /**
     * UIコンテナを作成
     */
    createContainer() {
        // 既存のコンテナがあれば削除
        this.destroy();
        
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'reward-overlay';
        overlay.id = 'reward-display-overlay';
        
        // メインコンテナ
        const container = document.createElement('div');
        container.className = 'reward-container';
        container.id = 'reward-display-container';
        
        // キャンバス（パーティクル用）
        const canvas = document.createElement('canvas');
        canvas.className = 'reward-particle-canvas';
        canvas.id = 'reward-particle-canvas';
        
        overlay.appendChild(canvas);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        this.container = container;
        this.canvas = canvas;
        
        // キャンバスサイズ設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * キャンバスのリサイズ
     */
    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }
    
    /**
     * ステージを表示
     * @param {string} stageName - ステージ名
     */
    async showStage(stageName) {
        // コンテンツをクリア
        this.container.innerHTML = '';
        
        switch (stageName) {
            case 'summary':
                await this.showSummaryStage();
                break;
            case 'breakdown':
                await this.showBreakdownStage();
                break;
            case 'action':
                await this.showActionStage();
                break;
        }
    }
    
    /**
     * サマリーステージを表示
     */
    async showSummaryStage() {
        const content = document.createElement('div');
        content.className = 'reward-stage reward-summary animate-fade-in';
        
        // チャレンジタイトル
        const title = document.createElement('h2');
        title.className = 'reward-title animate-slide-down';
        title.textContent = 'チャレンジ完了！';
        
        // チャレンジ名
        const challengeName = document.createElement('h3');
        challengeName.className = 'reward-challenge-name';
        challengeName.textContent = this.challengeData.name || 'ウィークリーチャレンジ';
        
        // メイン報酬表示
        const mainReward = document.createElement('div');
        mainReward.className = 'reward-main animate-scale-up';
        mainReward.innerHTML = `
            <div class="reward-points-large">
                <span class="points-number">${this.animateNumber(0, this.rewardData.totalPoints)}</span>
                <span class="points-label">ポイント獲得！</span>
            </div>
        `;
        
        // 称号獲得（もしあれば）
        if (this.rewardData.titles && this.rewardData.titles.length > 0) {
            const titleEarned = document.createElement('div');
            titleEarned.className = 'reward-title-earned animate-shine';
            titleEarned.innerHTML = `
                <span class="title-icon">🏆</span>
                <span class="title-text">${this.rewardData.titles[0]}</span>
            `;
            mainReward.appendChild(titleEarned);
        }
        
        content.appendChild(title);
        content.appendChild(challengeName);
        content.appendChild(mainReward);
        
        this.container.appendChild(content);
        
        // パーティクル効果
        this.burstParticles('celebration');
        
        // サウンド
        this.playSound('points_earned');
    }
    
    /**
     * ブレークダウンステージを表示
     */
    async showBreakdownStage() {
        const content = document.createElement('div');
        content.className = 'reward-stage reward-breakdown animate-fade-in';
        
        // タイトル
        const title = document.createElement('h3');
        title.className = 'breakdown-title';
        title.textContent = '獲得報酬の内訳';
        
        // ポイント内訳
        const breakdown = document.createElement('div');
        breakdown.className = 'points-breakdown';
        
        const items = [
            { 
                label: '基本報酬', 
                points: this.rewardData.summary.basePoints,
                icon: '⭐',
                delay: 0
            },
            { 
                label: 'ボーナス報酬', 
                points: this.rewardData.summary.bonusPoints,
                icon: '🎯',
                delay: 200
            },
            { 
                label: '実績報酬', 
                points: this.rewardData.summary.achievementPoints,
                icon: '🏅',
                delay: 400
            }
        ];
        
        // 連続クリア報酬があれば追加
        if (this.rewardData.summary.streakPoints > 0) {
            items.push({
                label: '連続クリア報酬',
                points: this.rewardData.summary.streakPoints,
                icon: '🔥',
                delay: 600
            });
        }
        
        // ランキング報酬があれば追加
        if (this.rewardData.summary.rankingPoints > 0) {
            items.push({
                label: 'ランキング報酬',
                points: this.rewardData.summary.rankingPoints,
                icon: '👑',
                delay: 800
            });
        }
        
        // 各アイテムを順番にアニメーション表示
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'breakdown-item animate-slide-in';
            itemEl.style.animationDelay = `${item.delay}ms`;
            itemEl.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="item-label">${item.label}</span>
                <span class="item-points">+${item.points}</span>
            `;
            breakdown.appendChild(itemEl);
        });
        
        // 合計
        const total = document.createElement('div');
        total.className = 'breakdown-total animate-slide-in';
        total.style.animationDelay = '1000ms';
        total.innerHTML = `
            <span class="total-label">合計</span>
            <span class="total-points">${this.rewardData.totalPoints}</span>
        `;
        
        // 実績バッジ表示（もしあれば）
        if (this.rewardData.achievements && this.rewardData.achievements.length > 0) {
            const achievementsSection = document.createElement('div');
            achievementsSection.className = 'achievements-earned animate-fade-in';
            achievementsSection.style.animationDelay = '1200ms';
            
            const achievementTitle = document.createElement('h4');
            achievementTitle.textContent = '獲得した実績';
            achievementsSection.appendChild(achievementTitle);
            
            const achievementsList = document.createElement('div');
            achievementsList.className = 'achievements-list';
            
            this.rewardData.achievements.forEach((achievement, index) => {
                const badge = document.createElement('div');
                badge.className = 'achievement-badge animate-bounce-in';
                badge.style.animationDelay = `${1400 + index * 100}ms`;
                badge.innerHTML = `
                    <div class="badge-icon">🏅</div>
                    <div class="badge-name">${achievement.title}</div>
                    <div class="badge-description">${achievement.description}</div>
                `;
                achievementsList.appendChild(badge);
            });
            
            achievementsSection.appendChild(achievementsList);
            content.appendChild(achievementsSection);
        }
        
        content.appendChild(title);
        content.appendChild(breakdown);
        content.appendChild(total);
        
        this.container.appendChild(content);
        
        // サウンド
        this.playSound('breakdown_show');
    }
    
    /**
     * アクションステージを表示
     */
    async showActionStage() {
        const content = document.createElement('div');
        content.className = 'reward-stage reward-action animate-fade-in';
        
        // おめでとうメッセージ
        const congratsMessage = document.createElement('div');
        congratsMessage.className = 'congrats-message animate-pulse';
        congratsMessage.innerHTML = `
            <h3>素晴らしいプレイでした！</h3>
            <p>現在の総ポイント: <strong>${this.getTotalPoints()}</strong></p>
        `;
        
        // 次のアクション
        const actions = document.createElement('div');
        actions.className = 'reward-actions';
        
        // 次のチャレンジボタン
        const nextChallengeBtn = document.createElement('button');
        nextChallengeBtn.className = 'reward-button primary animate-slide-up';
        nextChallengeBtn.textContent = '次のチャレンジへ';
        nextChallengeBtn.onclick = () => this.onNextChallenge();
        
        // リプレイボタン
        const replayBtn = document.createElement('button');
        replayBtn.className = 'reward-button secondary animate-slide-up';
        replayBtn.style.animationDelay = '100ms';
        replayBtn.textContent = 'もう一度挑戦';
        replayBtn.onclick = () => this.onReplay();
        
        // ランキングを見るボタン
        const rankingBtn = document.createElement('button');
        rankingBtn.className = 'reward-button tertiary animate-slide-up';
        rankingBtn.style.animationDelay = '200ms';
        rankingBtn.textContent = 'ランキングを見る';
        rankingBtn.onclick = () => this.onViewRanking();
        
        // シェアボタン
        const shareSection = document.createElement('div');
        shareSection.className = 'share-section animate-fade-in';
        shareSection.style.animationDelay = '400ms';
        shareSection.innerHTML = `
            <p>友達と共有しよう！</p>
            <div class="share-buttons">
                <button class="share-button twitter" data-action="share-twitter">
                    <span class="share-icon">🐦</span> Twitter
                </button>
                <button class="share-button copy" data-action="copy-share">
                    <span class="share-icon">📋</span> コピー
                </button>
            </div>
        `;
        
        actions.appendChild(nextChallengeBtn);
        actions.appendChild(replayBtn);
        actions.appendChild(rankingBtn);
        
        content.appendChild(congratsMessage);
        content.appendChild(actions);
        content.appendChild(shareSection);
        
        this.container.appendChild(content);
        
        // イベントリスナーを追加（inlineハンドラーの代替）
        const twitterBtn = shareSection.querySelector('[data-action="share-twitter"]');
        const copyBtn = shareSection.querySelector('[data-action="copy-share"]');
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => this.shareOnTwitter());
        }
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyShareText());
        }
        
        // 最終パーティクル
        this.burstParticles('final');
    }
    
    /**
     * 数値アニメーション
     */
    animateNumber(start, end, duration = 1000) {
        const element = document.createElement('span');
        element.textContent = start;
        
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
        return element.outerHTML;
    }
    
    /**
     * パーティクルシステムを初期化
     */
    initParticleSystem() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        // アニメーションループ
        const animate = () => {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // パーティクルを更新・描画
            this.particles = this.particles.filter(particle => {
                particle.y += particle.vy;
                particle.x += particle.vx;
                particle.vy += particle.gravity;
                particle.opacity -= particle.decay;
                
                if (particle.opacity <= 0) return false;
                
                ctx.save();
                ctx.globalAlpha = particle.opacity;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                return true;
            });
            
            if (this.container) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * パーティクルバースト
     */
    burstParticles(type) {
        if (!this.canvas) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const configs = {
            celebration: {
                count: 50,
                colors: ['#FFD700', '#FFA500', '#FF6347', '#FFB6C1', '#98FB98'],
                speed: 8,
                spread: Math.PI * 2,
                gravity: 0.3
            },
            final: {
                count: 100,
                colors: ['#FFD700', '#FFFFFF', '#FFA500'],
                speed: 10,
                spread: Math.PI * 2,
                gravity: 0.2
            }
        };
        
        const config = configs[type] || configs.celebration;
        
        for (let i = 0; i < config.count; i++) {
            const angle = (config.spread / config.count) * i;
            const speed = config.speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                size: 3 + Math.random() * 3,
                color: config.colors[Math.floor(Math.random() * config.colors.length)],
                opacity: 1,
                gravity: config.gravity,
                decay: 0.01
            });
        }
    }
    
    /**
     * サウンドを再生
     */
    playSound(soundName) {
        if (!this.soundEnabled) return;
        
        // サウンド再生の実装（Web Audio APIを使用）
        // 簡易版として、ブラウザの音を使用
        try {
            const audio = new Audio();
            const sounds = {
                reward_show: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURE',
                points_earned: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURE',
                breakdown_show: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURE'
            };
            
            if (sounds[soundName]) {
                audio.src = sounds[soundName];
                audio.volume = 0.3;
                audio.play().catch(e => console.log('Sound play failed:', e));
            }
        } catch (e) {
            console.log('Sound system error:', e);
        }
    }
    
    /**
     * インタラクションをセットアップ
     */
    setupInteractions() {
        // クリックで閉じる（アクションステージのみ）
        const overlay = document.getElementById('reward-display-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && this.currentStage === 2) {
                    this.close();
                }
            });
        }
        
        // ESCキーで閉じる
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    /**
     * 合計ポイントを取得
     */
    getTotalPoints() {
        try {
            const stats = window.weeklyChallengePersistence?.getStatistics();
            return stats?.totalPoints || this.rewardData.totalPoints;
        } catch (e) {
            return this.rewardData.totalPoints;
        }
    }
    
    /**
     * 次のチャレンジへ
     */
    onNextChallenge() {
        this.close();
        // 週替わりチャレンジシステムに通知
        if (window.WeeklyChallengeSystem) {
            window.WeeklyChallengeSystem.loadNextChallenge();
        }
    }
    
    /**
     * リプレイ
     */
    onReplay() {
        this.close();
        // ゲームをリスタート
        if (window.restartGame) {
            window.restartGame();
        }
    }
    
    /**
     * ランキングを表示
     */
    onViewRanking() {
        this.close();
        // ランキング画面を表示
        if (window.showRanking) {
            window.showRanking();
        }
    }
    
    /**
     * Twitterでシェア
     */
    shareOnTwitter() {
        const text = `ウィークリーチャレンジ「${this.challengeData.name}」をクリア！🎮\n獲得ポイント: ${this.rewardData.totalPoints}点\n#UltimateSquashGame`;
        const url = encodeURIComponent(window.location.href);
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
        window.open(tweetUrl, '_blank', 'width=550,height=420');
    }
    
    /**
     * シェアテキストをコピー
     */
    copyShareText() {
        const text = `ウィークリーチャレンジ「${this.challengeData.name}」をクリアしました！獲得ポイント: ${this.rewardData.totalPoints}点 #UltimateSquashGame`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('クリップボードにコピーしました！');
            });
        } else {
            // フォールバック
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('クリップボードにコピーしました！');
        }
    }
    
    /**
     * トーストメッセージを表示
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'reward-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * 閉じる
     */
    close() {
        const overlay = document.getElementById('reward-display-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                this.destroy();
            }, 300);
        }
    }
    
    /**
     * 破棄
     */
    destroy() {
        const overlay = document.getElementById('reward-display-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.container = null;
        this.canvas = null;
        this.particles = [];
    }
    
    /**
     * 遅延処理
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// グローバルインスタンス
window.rewardDisplayUI = new RewardDisplayUI();