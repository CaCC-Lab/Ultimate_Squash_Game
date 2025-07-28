/**
 * Ultimate Squash Game - JavaScriptバージョン
 * @module game
 */

// ゲーム設定
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    BALL_SIZE: 10,
    PADDLE_WIDTH: 100,
    PADDLE_HEIGHT: 20,
    PADDLE_Y: 550,
    BALL_SPEED: 5,
    BALL_SPEED_INCREMENT: 0.5,
    MAX_BALL_SPEED: 15,
    COMBO_THRESHOLD: 3,
    COMBO_MULTIPLIER: 1.5,
    FPS: 60
};

// ゲーム状態
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.ballX = CONFIG.CANVAS_WIDTH / 2;
        this.ballY = CONFIG.CANVAS_HEIGHT / 2;
        this.ballDX = CONFIG.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
        this.ballDY = CONFIG.BALL_SPEED;
        this.paddleX = CONFIG.CANVAS_WIDTH / 2 - CONFIG.PADDLE_WIDTH / 2;
        this.score = 0;
        this.combo = 0;
        this.highScore = parseInt(localStorage.getItem('highScore') || '0');
        this.isPaused = false;
        this.isGameOver = false;
        this.consecutiveHits = 0;
    }

    updateBallSpeed() {
        const speedMultiplier = 1 + (this.score / 100) * 0.1;
        const speed = Math.min(
            CONFIG.BALL_SPEED * speedMultiplier,
            CONFIG.MAX_BALL_SPEED
        );
        
        const currentSpeed = Math.sqrt(this.ballDX ** 2 + this.ballDY ** 2);
        this.ballDX = (this.ballDX / currentSpeed) * speed;
        this.ballDY = (this.ballDY / currentSpeed) * speed;
    }

    incrementScore(points = 10) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
        }
    }

    incrementCombo() {
        this.consecutiveHits++;
        if (this.consecutiveHits >= CONFIG.COMBO_THRESHOLD) {
            this.combo++;
            const bonusPoints = Math.floor(10 * CONFIG.COMBO_MULTIPLIER * this.combo);
            this.incrementScore(bonusPoints);
        }
    }

    resetCombo() {
        this.combo = 0;
        this.consecutiveHits = 0;
    }
}

// ゲームエンジン
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.state = new GameState();
        this.lastTime = 0;
        this.init();
    }

    init() {
        // イベントリスナー設定
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', () => this.handleClick());
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // タッチイベント対応
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        // ゲームループ開始
        this.gameLoop();
    }

    handleMouseMove(e) {
        if (this.state.isPaused || this.state.isGameOver) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.state.paddleX = Math.max(0, Math.min(
            x - CONFIG.PADDLE_WIDTH / 2,
            CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_WIDTH
        ));
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (this.state.isPaused || this.state.isGameOver) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        this.state.paddleX = Math.max(0, Math.min(
            x - CONFIG.PADDLE_WIDTH / 2,
            CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_WIDTH
        ));
    }

    handleClick() {
        if (this.state.isGameOver) {
            this.state.reset();
        }
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.state.isPaused = !this.state.isPaused;
        } else if (e.shiftKey && e.code === 'KeyP') {
            // パフォーマンスダッシュボード表示（将来実装）
            console.log('Performance Dashboard (未実装)');
        }
    }

    update(deltaTime) {
        if (this.state.isPaused || this.state.isGameOver) return;

        // ボール位置更新
        this.state.ballX += this.state.ballDX;
        this.state.ballY += this.state.ballDY;

        // 壁との衝突判定
        if (this.state.ballX <= CONFIG.BALL_SIZE || 
            this.state.ballX >= CONFIG.CANVAS_WIDTH - CONFIG.BALL_SIZE) {
            this.state.ballDX = -this.state.ballDX;
            this.playSound('wall');
        }

        if (this.state.ballY <= CONFIG.BALL_SIZE) {
            this.state.ballDY = -this.state.ballDY;
            this.playSound('wall');
        }

        // パドルとの衝突判定
        if (this.state.ballY >= CONFIG.PADDLE_Y - CONFIG.BALL_SIZE &&
            this.state.ballY <= CONFIG.PADDLE_Y + CONFIG.PADDLE_HEIGHT &&
            this.state.ballX >= this.state.paddleX &&
            this.state.ballX <= this.state.paddleX + CONFIG.PADDLE_WIDTH) {
            
            this.state.ballDY = -Math.abs(this.state.ballDY);
            
            // パドルの位置による角度調整
            const hitPos = (this.state.ballX - this.state.paddleX) / CONFIG.PADDLE_WIDTH;
            this.state.ballDX = 8 * (hitPos - 0.5);
            
            this.state.incrementScore();
            this.state.incrementCombo();
            this.state.updateBallSpeed();
            this.playSound('paddle');
        }

        // ゲームオーバー判定
        if (this.state.ballY > CONFIG.CANVAS_HEIGHT) {
            this.state.isGameOver = true;
            this.state.resetCombo();
            this.playSound('gameover');
        }
    }

    render() {
        // キャンバスクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // ボール描画
        this.ctx.fillStyle = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(this.state.ballX, this.state.ballY, CONFIG.BALL_SIZE, 0, Math.PI * 2);
        this.ctx.fill();

        // ボールの軌跡エフェクト
        for (let i = 1; i <= 3; i++) {
            this.ctx.fillStyle = `rgba(0, 255, 255, ${0.3 / i})`;
            this.ctx.beginPath();
            this.ctx.arc(
                this.state.ballX - this.state.ballDX * i * 2,
                this.state.ballY - this.state.ballDY * i * 2,
                CONFIG.BALL_SIZE * (1 - i * 0.2),
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        // パドル描画
        const gradient = this.ctx.createLinearGradient(
            this.state.paddleX,
            CONFIG.PADDLE_Y,
            this.state.paddleX + CONFIG.PADDLE_WIDTH,
            CONFIG.PADDLE_Y
        );
        gradient.addColorStop(0, '#0f0');
        gradient.addColorStop(0.5, '#0ff');
        gradient.addColorStop(1, '#0f0');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.state.paddleX,
            CONFIG.PADDLE_Y,
            CONFIG.PADDLE_WIDTH,
            CONFIG.PADDLE_HEIGHT
        );

        // パドルの光彩エフェクト
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#0ff';
        this.ctx.fillRect(
            this.state.paddleX,
            CONFIG.PADDLE_Y,
            CONFIG.PADDLE_WIDTH,
            CONFIG.PADDLE_HEIGHT
        );
        this.ctx.shadowBlur = 0;

        // 状態表示
        if (this.state.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        }

        if (this.state.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 50);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.state.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
            this.ctx.fillText(`High Score: ${this.state.highScore}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 40);
            this.ctx.fillText('Click to Restart', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 80);
        }

        // スコア更新
        this.updateScore();
    }

    updateScore() {
        if (!this.scoreElement) return;
        const comboText = this.state.combo > 0 ? `${this.state.combo}x` : '0x';
        this.scoreElement.textContent = `Score: ${this.state.score} | Combo: ${comboText} | High: ${this.state.highScore}`;
    }

    playSound(type) {
        // 簡易的な音声実装（Web Audio API）
        if (!window.AudioContext) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch (type) {
            case 'paddle':
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                break;
            case 'wall':
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
                break;
            case 'gameover':
                oscillator.frequency.setValueAtTime(110, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
                break;
        }
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    
    // グローバルに公開（デバッグ用）
    window.game = game;
    window.GameEngine = GameEngine;
    window.GameState = GameState;
    window.CONFIG = CONFIG;
});

// エクスポート（モジュールとして使用する場合）
export { GameEngine, GameState, CONFIG };