/**
 * Tutorial System for Ultimate Squash Game
 * Provides interactive onboarding for new players
 */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.completedSteps = new Set();
        this.tutorialData = null;
        this.callbacks = new Map();
        this.isForceStarted = false;
        
        // Tutorial steps definition
        this.steps = [
            {
                id: 'welcome',
                title: 'スカッシュゲームへようこそ！',
                content: 'このチュートリアルでゲームの基本を学びましょう',
                action: 'none',
                duration: 3000
            },
            {
                id: 'racket_control',
                title: 'ラケットの操作',
                content: 'マウスを左右に動かしてラケットを操作します',
                action: 'practice_racket',
                validation: 'racket_moved',
                hint: 'マウスを画面の端から端まで動かしてみてください'
            },
            {
                id: 'hitting_ball',
                title: 'ボールを打つ',
                content: 'ボールがラケットに当たるようにタイミングを合わせましょう',
                action: 'practice_hit',
                validation: 'ball_hit',
                successCount: 3,
                hint: 'ボールの軌道を予測して、早めにラケットを移動させましょう'
            },
            {
                id: 'scoring',
                title: 'スコアシステム',
                content: 'ボールを打ち返すたびに10ポイント獲得します',
                action: 'show_scoring',
                duration: 4000
            },
            {
                id: 'combo_system',
                title: 'コンボシステム',
                content: '連続でボールを打ち返すとコンボボーナスが付きます！',
                action: 'practice_combo',
                validation: 'combo_achieved',
                targetCombo: 5,
                hint: '落ち着いて、ボールの動きを見ながら連続ヒットを狙いましょう'
            },
            {
                id: 'weekly_challenge_intro',
                title: '週替わりチャレンジ',
                content: '毎週新しいチャレンジが登場！達成すると報酬がもらえます',
                action: 'show_challenge_button',
                duration: 5000
            },
            {
                id: 'difficulty_settings',
                title: '難易度設定',
                content: '右側のパネルで難易度を変更できます',
                action: 'highlight_difficulty',
                duration: 4000
            },
            {
                id: 'ready_to_play',
                title: '準備完了！',
                content: 'チュートリアル完了！本格的なゲームを楽しみましょう',
                action: 'complete_tutorial',
                duration: 3000
            }
        ];
        
        // Validation tracking
        this.validationData = {
            racketMoveCount: 0,
            ballHitCount: 0,
            currentCombo: 0,
            maxCombo: 0
        };
    }

    /**
     * チュートリアルを開始
     */
    async start(forceStart = false) {
        this.isActive = true;
        this.currentStep = 0;
        this.isForceStarted = forceStart;
        
        // 新規プレイヤーチェック
        if (!this.isNewPlayer() && !forceStart) {
            console.log('Tutorial skipped - not a new player');
            return false;
        }
        
        // チュートリアルUIを表示
        this.createTutorialUI();
        
        // ゲームをチュートリアルモードに設定
        await this.setGameTutorialMode(true);
        
        // 最初のステップを開始
        this.showStep(0);
        
        return true;
    }

    /**
     * 新規プレイヤーかどうかチェック
     */
    isNewPlayer() {
        const tutorialCompleted = localStorage.getItem('ultimateSquashGame.tutorialCompleted');
        const gamesPlayed = parseInt(localStorage.getItem('ultimateSquashGame.gamesPlayed') || '0');
        
        return !tutorialCompleted && gamesPlayed < 3;
    }

    /**
     * チュートリアルUIを作成
     */
    createTutorialUI() {
        // オーバーレイコンテナ
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        
        // チュートリアルボックス
        const tutorialBox = document.createElement('div');
        tutorialBox.id = 'tutorial-box';
        tutorialBox.className = 'tutorial-box';
        
        // プログレスバー
        const progressBar = document.createElement('div');
        progressBar.className = 'tutorial-progress';
        progressBar.innerHTML = `
            <div class="tutorial-progress-bar">
                <div class="tutorial-progress-fill" style="width: 0%"></div>
            </div>
            <div class="tutorial-progress-text">ステップ 1 / ${this.steps.length}</div>
        `;
        
        // コンテンツエリア
        const content = document.createElement('div');
        content.className = 'tutorial-content';
        content.innerHTML = `
            <h3 class="tutorial-title"></h3>
            <p class="tutorial-description"></p>
            <div class="tutorial-hint" style="display: none;"></div>
        `;
        
        // ボタンエリア
        const buttons = document.createElement('div');
        buttons.className = 'tutorial-buttons';
        buttons.innerHTML = `
            <button class="tutorial-skip">スキップ</button>
            <button class="tutorial-next" disabled>次へ</button>
        `;
        
        tutorialBox.appendChild(progressBar);
        tutorialBox.appendChild(content);
        tutorialBox.appendChild(buttons);
        overlay.appendChild(tutorialBox);
        
        document.body.appendChild(overlay);
        
        // イベントリスナー
        buttons.querySelector('.tutorial-skip').addEventListener('click', () => this.skip());
        buttons.querySelector('.tutorial-next').addEventListener('click', () => this.nextStep());
    }

    /**
     * UIを更新
     */
    updateUI(step) {
        const titleEl = document.querySelector('.tutorial-title');
        const descEl = document.querySelector('.tutorial-description');
        const hintEl = document.querySelector('.tutorial-hint');
        
        if (titleEl) titleEl.textContent = step.title;
        if (descEl) descEl.textContent = step.content;
        
        // ヒント表示制御
        if (step.hint) {
            hintEl.textContent = '💡 ヒント: ' + step.hint;
            hintEl.style.display = 'none'; // 初期は非表示
            
            // 10秒後にヒントを表示
            setTimeout(() => {
                if (this.currentStep === this.steps.indexOf(step)) {
                    hintEl.style.display = 'block';
                }
            }, 10000);
        } else {
            hintEl.style.display = 'none';
        }
    }

    /**
     * プログレスを更新
     */
    updateProgress() {
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        const fillEl = document.querySelector('.tutorial-progress-fill');
        const textEl = document.querySelector('.tutorial-progress-text');
        
        if (fillEl) fillEl.style.width = `${progress}%`;
        if (textEl) textEl.textContent = `ステップ ${this.currentStep + 1} / ${this.steps.length}`;
    }

    /**
     * 現在のステップを表示
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        // UI更新
        this.updateUI(step);
        
        // プログレス更新
        this.updateProgress();
        
        // ステップアクションを実行
        this.executeStepAction(step);
        
        // 検証が必要ない場合は自動で次へ
        if (!step.validation && step.duration) {
            setTimeout(() => {
                this.enableNextButton();
            }, step.duration);
        }
    }

    /**
     * ステップアクションを実行
     */
    async executeStepAction(step) {
        switch (step.action) {
            case 'practice_racket':
                await this.startRacketPractice();
                break;
            case 'practice_hit':
                await this.startHitPractice(step.successCount);
                break;
            case 'practice_combo':
                await this.startComboPractice(step.targetCombo);
                break;
            case 'show_challenge_button':
                this.highlightChallengeButton();
                setTimeout(() => this.enableNextButton(), step.duration);
                break;
            case 'highlight_difficulty':
                this.highlightDifficultyPanel();
                setTimeout(() => this.enableNextButton(), step.duration);
                break;
            case 'show_scoring':
                // スコアシステムの説明表示
                setTimeout(() => this.enableNextButton(), step.duration);
                break;
            case 'complete_tutorial':
                // 最終ステップ
                setTimeout(() => this.enableNextButton(), step.duration);
                break;
        }
    }

    /**
     * ラケット練習開始
     */
    async startRacketPractice() {
        // Python側にラケット練習モードを設定
        if (window.pyodide && window.pyodide.runPython) {
            window.pyodide.runPython(`
                game_state.set_tutorial_step('practice_racket')
            `);
        }
        
        // マウス移動を監視
        let leftReached = false;
        let rightReached = false;
        
        const handleMouseMove = (e) => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            
            if (relativeX < 50) leftReached = true;
            if (relativeX > rect.width - 50) rightReached = true;
            
            if (leftReached && rightReached) {
                document.removeEventListener('mousemove', handleMouseMove);
                this.validateStep('racket_moved');
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
    }

    /**
     * ヒット練習開始
     */
    async startHitPractice(targetHits) {
        this.validationData.ballHitCount = 0;
        
        // Python側にヒット練習モードを設定
        if (window.pyodide && window.pyodide.runPython) {
            window.pyodide.runPython(`
                game_state.set_tutorial_step('practice_hit')
            `);
        }
        
        // ヒットイベントを監視
        this.monitorBallHits(targetHits);
    }

    /**
     * コンボ練習開始
     */
    async startComboPractice(targetCombo) {
        this.validationData.maxCombo = 0;
        
        // Python側にコンボ練習モードを設定
        if (window.pyodide && window.pyodide.runPython) {
            window.pyodide.runPython(`
                game_state.set_tutorial_step('practice_combo')
            `);
        }
        
        // コンボを監視
        this.monitorCombo(targetCombo);
    }

    /**
     * ボールヒットを監視
     */
    monitorBallHits(targetHits) {
        const checkHits = () => {
            if (!this.isActive) return;
            
            // Python側からヒット数を取得
            if (window.updateGameState) {
                const gameData = window.currentGameData;
                if (gameData && gameData.total_hits > this.validationData.ballHitCount) {
                    this.validationData.ballHitCount = gameData.total_hits;
                    
                    if (this.validationData.ballHitCount >= targetHits) {
                        this.validateStep('ball_hit');
                        return;
                    }
                }
            }
            
            // 継続監視
            setTimeout(checkHits, 100);
        };
        
        checkHits();
    }

    /**
     * コンボを監視
     */
    monitorCombo(targetCombo) {
        const checkCombo = () => {
            if (!this.isActive) return;
            
            // Python側からコンボ数を取得
            if (window.updateGameState) {
                const gameData = window.currentGameData;
                if (gameData && gameData.combo > this.validationData.maxCombo) {
                    this.validationData.maxCombo = gameData.combo;
                    
                    if (this.validationData.maxCombo >= targetCombo) {
                        this.validateStep('combo_achieved');
                        return;
                    }
                }
            }
            
            // 継続監視
            setTimeout(checkCombo, 100);
        };
        
        checkCombo();
    }

    /**
     * チャレンジボタンをハイライト
     */
    highlightChallengeButton() {
        const button = document.querySelector('.challenge-button');
        if (button) {
            button.classList.add('tutorial-highlight');
            setTimeout(() => {
                button.classList.remove('tutorial-highlight');
            }, 5000);
        }
    }

    /**
     * 難易度パネルをハイライト
     */
    highlightDifficultyPanel() {
        const panel = document.querySelector('[data-difficulty-panel]');
        if (panel) {
            panel.classList.add('tutorial-highlight');
            setTimeout(() => {
                panel.classList.remove('tutorial-highlight');
            }, 5000);
        }
    }

    /**
     * ステップ検証
     */
    validateStep(validationType) {
        const currentStep = this.steps[this.currentStep];
        if (currentStep.validation === validationType) {
            this.completedSteps.add(currentStep.id);
            this.enableNextButton();
        }
    }

    /**
     * 次へボタンを有効化
     */
    enableNextButton() {
        const nextBtn = document.querySelector('.tutorial-next');
        if (nextBtn) {
            nextBtn.disabled = false;
        }
    }

    /**
     * 次のステップへ
     */
    nextStep() {
        const nextBtn = document.querySelector('.tutorial-next');
        if (nextBtn) {
            nextBtn.disabled = true;
        }
        
        this.showStep(this.currentStep + 1);
    }

    /**
     * チュートリアルをスキップ
     */
    skip() {
        if (confirm('チュートリアルをスキップしますか？\nいつでもヘルプメニューから再開できます。')) {
            this.complete();
        }
    }

    /**
     * Python側にチュートリアルモードを設定
     */
    async setGameTutorialMode(enabled) {
        if (window.pyodide && window.pyodide.runPython) {
            window.pyodide.runPython(`
                game_state.set_tutorial_mode(${enabled})
            `);
        }
    }

    /**
     * チュートリアル完了
     */
    complete() {
        this.isActive = false;
        
        // 完了フラグを保存
        localStorage.setItem('ultimateSquashGame.tutorialCompleted', 'true');
        localStorage.setItem('ultimateSquashGame.tutorialCompletedDate', new Date().toISOString());
        
        // UIを削除
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 500);
        }
        
        // ゲームを通常モードに戻す
        this.setGameTutorialMode(false);
        
        // 完了コールバック
        if (this.callbacks.has('complete')) {
            this.callbacks.get('complete')();
        }
        
        // 完了メッセージ
        this.showCompletionMessage();
    }

    /**
     * 完了メッセージを表示
     */
    showCompletionMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'tutorial-completion-message';
        messageDiv.innerHTML = `
            <div class="completion-content">
                <h2>🎉 チュートリアル完了！</h2>
                <p>ゲームの基本を習得しました。楽しんでプレイしてください！</p>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            setTimeout(() => messageDiv.remove(), 500);
        }, 3000);
    }
}

// グローバルに公開
window.TutorialSystem = TutorialSystem;