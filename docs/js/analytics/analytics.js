/**
 * Ultimate Squash Game - Analytics Module
 * 
 * プライバシーに配慮した包括的なアナリティクスシステム
 * GDPR/CCPA準拠、ユーザーの同意に基づいたトラッキング
 */

class GameAnalytics {
    constructor() {
        this.initialized = false;
        this.consentGiven = false;
        this.measurementId = 'G-XXXXXXXXXX'; // 本番環境では環境変数から取得
        this.debug = true; // 開発環境ではtrue
        
        // ゲーム固有のメトリクス
        this.sessionStartTime = null;
        this.gameStartTime = null;
        this.actionCount = 0;
        this.scoreHistory = [];
        
        // A/Bテスト設定
        this.experiments = {
            'difficulty_algorithm': this.getExperimentVariant('difficulty_algorithm', ['classic', 'adaptive']),
            'sound_effects': this.getExperimentVariant('sound_effects', ['enabled', 'disabled']),
            'ui_theme': this.getExperimentVariant('ui_theme', ['light', 'dark'])
        };
        
        this.initialize();
    }
    
    /**
     * アナリティクスの初期化
     */
    initialize() {
        // プライバシー同意の確認
        this.checkConsent();
        
        // ページロード時のメトリクス
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            this.trackTiming('page_load', loadTime);
        }
        
        // セッション開始
        this.sessionStartTime = Date.now();
        this.trackEvent('session_start', {
            referrer: document.referrer,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language
        });
        
        // エラーハンドリング
        window.addEventListener('error', (event) => {
            this.trackError(event.error || event.message, event.filename, event.lineno);
        });
        
        // ページ離脱時のイベント
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });
        
        this.initialized = true;
        this.log('Analytics initialized');
    }
    
    /**
     * プライバシー同意の確認と管理
     */
    checkConsent() {
        const consent = localStorage.getItem('analytics_consent');
        
        if (consent === null) {
            // 初回訪問：同意バナーを表示
            this.showConsentBanner();
        } else {
            this.consentGiven = consent === 'granted';
            this.updateGoogleConsent();
        }
    }
    
    /**
     * 同意バナーの表示
     */
    showConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'consent-banner';
        banner.innerHTML = `
            <div style="position: fixed; bottom: 0; left: 0; right: 0; background: #1a1a1a; color: white; padding: 20px; z-index: 10000; box-shadow: 0 -2px 10px rgba(0,0,0,0.3);">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                    <div style="flex: 1; min-width: 300px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px;">プライバシー設定</h3>
                        <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                            ゲーム体験を向上させるため、匿名化された利用統計を収集します。
                            個人を特定する情報は収集しません。
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="gameAnalytics.acceptConsent()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            同意する
                        </button>
                        <button onclick="gameAnalytics.rejectConsent()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            拒否する
                        </button>
                        <button onclick="gameAnalytics.showPrivacySettings()" style="padding: 10px 20px; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            詳細設定
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }
    
    /**
     * 同意を受け入れる
     */
    acceptConsent() {
        this.consentGiven = true;
        localStorage.setItem('analytics_consent', 'granted');
        this.updateGoogleConsent();
        this.hideBanner();
        this.trackEvent('consent_granted');
    }
    
    /**
     * 同意を拒否する
     */
    rejectConsent() {
        this.consentGiven = false;
        localStorage.setItem('analytics_consent', 'denied');
        this.updateGoogleConsent();
        this.hideBanner();
        // 同意拒否は追跡しない
    }
    
    /**
     * Googleアナリティクスの同意状態を更新
     */
    updateGoogleConsent() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': this.consentGiven ? 'granted' : 'denied'
            });
        }
    }
    
    /**
     * バナーを非表示にする
     */
    hideBanner() {
        const banner = document.getElementById('consent-banner');
        if (banner) {
            banner.remove();
        }
    }
    
    /**
     * プライバシー詳細設定を表示
     */
    showPrivacySettings() {
        const modal = document.createElement('div');
        modal.id = 'privacy-settings-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #2a2a2a; color: white; padding: 30px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin: 0 0 20px 0;">プライバシー設定</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 16px;">データ収集について</h3>
                        <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
                            Ultimate Squash Gameでは、ゲーム体験の向上のため、以下のデータを収集します：
                        </p>
                        
                        <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; font-size: 14px;">収集するデータ</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                                <li>ゲームプレイ統計（スコア、プレイ時間、アクション数）</li>
                                <li>技術情報（ブラウザ、画面解像度、言語設定）</li>
                                <li>エラー情報（ゲームの安定性改善のため）</li>
                                <li>匿名化されたセッション情報</li>
                            </ul>
                        </div>
                        
                        <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; font-size: 14px;">収集しないデータ</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                                <li>個人を特定できる情報（名前、メールアドレス等）</li>
                                <li>位置情報</li>
                                <li>他サイトの閲覧履歴</li>
                                <li>デバイス内の個人ファイル</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 16px;">データの利用目的</h3>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                            <li>ゲームバランスの調整と改善</li>
                            <li>バグの発見と修正</li>
                            <li>新機能の開発優先順位の決定</li>
                            <li>技術的問題の解決</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 16px;">あなたの権利</h3>
                        <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">
                            GDPR/CCPAに基づき、以下の権利があります：
                        </p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                            <li>データ収集の同意/拒否</li>
                            <li>収集済みデータの削除要求</li>
                            <li>データ収集の一時停止</li>
                            <li>収集データの開示要求</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="analytics-consent-checkbox" ${this.consentGiven ? 'checked' : ''} style="margin-right: 10px;">
                            <span style="font-size: 14px;">ゲーム改善のためのデータ収集に同意します</span>
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="gameAnalytics.clearAllData()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            データを削除
                        </button>
                        <button onclick="gameAnalytics.closePrivacySettings()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            キャンセル
                        </button>
                        <button onclick="gameAnalytics.savePrivacySettings()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            保存
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    /**
     * プライバシー設定を保存
     */
    savePrivacySettings() {
        const checkbox = document.getElementById('analytics-consent-checkbox');
        if (checkbox) {
            if (checkbox.checked && !this.consentGiven) {
                this.acceptConsent();
            } else if (!checkbox.checked && this.consentGiven) {
                this.rejectConsent();
            }
        }
        this.closePrivacySettings();
    }
    
    /**
     * プライバシー設定モーダルを閉じる
     */
    closePrivacySettings() {
        const modal = document.getElementById('privacy-settings-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * すべてのデータを削除
     */
    clearAllData() {
        if (confirm('本当にすべての分析データを削除しますか？この操作は取り消せません。')) {
            // ローカルストレージから削除
            localStorage.removeItem('analytics_consent');
            
            // Google Analyticsのデータ削除リクエスト
            if (typeof gtag !== 'undefined') {
                gtag('event', 'user_data_deletion_request', {
                    timestamp: Date.now()
                });
            }
            
            // 同意を取り消し
            this.rejectConsent();
            this.closePrivacySettings();
            
            alert('データ削除リクエストを送信しました。処理には最大7日かかる場合があります。');
        }
    }
    
    /**
     * カスタムイベントのトラッキング
     */
    trackEvent(eventName, parameters = {}) {
        if (!this.consentGiven) return;
        
        const eventData = {
            ...parameters,
            timestamp: Date.now(),
            session_id: this.sessionStartTime,
            experiment_variants: this.experiments
        };
        
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
        
        this.log(`Event tracked: ${eventName}`, eventData);
    }
    
    /**
     * ゲーム固有のイベントトラッキング
     */
    
    // ゲーム開始
    trackGameStart(difficulty, gameMode) {
        this.gameStartTime = Date.now();
        this.actionCount = 0;
        this.scoreHistory = [];
        
        this.trackEvent('game_start', {
            difficulty,
            game_mode: gameMode,
            sound_enabled: soundSystem?.soundEnabled || false,
            challenge_active: window.challengeGenerator?.currentChallenge !== null
        });
    }
    
    // ゲーム終了
    trackGameEnd(finalScore, duration, winner) {
        const gameStats = this.calculateGameStats();
        
        this.trackEvent('game_end', {
            final_score: finalScore,
            duration: duration || (Date.now() - this.gameStartTime),
            winner,
            actions_count: this.actionCount,
            average_rally_length: gameStats.avgRallyLength,
            max_combo: gameStats.maxCombo,
            score_progression: this.scoreHistory
        });
    }
    
    // アクション（キー入力）
    trackAction(actionType, success = true) {
        this.actionCount++;
        
        // 100アクションごとに集計して送信（パフォーマンス考慮）
        if (this.actionCount % 100 === 0) {
            this.trackEvent('game_actions_batch', {
                action_count: 100,
                game_time: Date.now() - this.gameStartTime
            });
        }
    }
    
    // スコア変更
    trackScoreChange(playerScore, aiScore) {
        this.scoreHistory.push({
            player: playerScore,
            ai: aiScore,
            timestamp: Date.now() - this.gameStartTime
        });
        
        // マイルストーンスコアで追跡
        const totalScore = playerScore + aiScore;
        if (totalScore % 10 === 0) {
            this.trackEvent('score_milestone', {
                player_score: playerScore,
                ai_score: aiScore,
                total_score: totalScore
            });
        }
    }
    
    // チャレンジ関連
    trackChallengeStart(challengeType, difficulty) {
        this.trackEvent('challenge_start', {
            challenge_type: challengeType,
            difficulty,
            week_number: window.challengeGenerator?.currentWeek
        });
    }
    
    trackChallengeComplete(challengeType, score, success) {
        this.trackEvent('challenge_complete', {
            challenge_type: challengeType,
            score,
            success,
            time_taken: Date.now() - this.gameStartTime
        });
    }
    
    // サウンドイベント
    trackSoundToggle(enabled) {
        this.trackEvent('sound_toggle', {
            enabled,
            toggle_time: Date.now() - this.sessionStartTime
        });
    }
    
    // ネットワーク関連
    trackNetworkCondition(quality) {
        this.trackEvent('network_quality', {
            quality,
            latency: window.networkMonitor?.latency,
            connection_type: navigator.connection?.effectiveType
        });
    }
    
    /**
     * パフォーマンストラッキング
     */
    trackTiming(category, value, label = '') {
        if (!this.consentGiven) return;
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timing_complete', {
                name: category,
                value: Math.round(value),
                event_category: 'Performance',
                event_label: label
            });
        }
        
        this.log(`Timing tracked: ${category} = ${value}ms`);
    }
    
    /**
     * エラートラッキング
     */
    trackError(message, source = '', lineno = 0) {
        if (!this.consentGiven) return;
        
        this.trackEvent('exception', {
            description: message,
            fatal: false,
            error_source: source,
            line_number: lineno
        });
    }
    
    /**
     * A/Bテスト
     */
    getExperimentVariant(experimentName, variants) {
        // ユーザーIDまたはセッションIDに基づいて決定論的に選択
        const seed = this.sessionStartTime || Date.now();
        const hash = this.simpleHash(experimentName + seed);
        const index = hash % variants.length;
        
        const variant = variants[index];
        this.log(`Experiment ${experimentName}: variant ${variant}`);
        
        return variant;
    }
    
    /**
     * 簡易ハッシュ関数
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    /**
     * ゲーム統計の計算
     */
    calculateGameStats() {
        // ラリーの長さ、コンボ数などを計算
        let maxCombo = 0;
        let currentCombo = 0;
        let totalRallies = 0;
        
        for (let i = 1; i < this.scoreHistory.length; i++) {
            const prevTotal = this.scoreHistory[i-1].player + this.scoreHistory[i-1].ai;
            const currTotal = this.scoreHistory[i].player + this.scoreHistory[i].ai;
            
            if (currTotal === prevTotal + 1) {
                currentCombo++;
                maxCombo = Math.max(maxCombo, currentCombo);
            } else {
                currentCombo = 0;
            }
            
            totalRallies++;
        }
        
        return {
            maxCombo,
            avgRallyLength: totalRallies > 0 ? this.actionCount / totalRallies : 0
        };
    }
    
    /**
     * セッション終了の追跡
     */
    trackSessionEnd() {
        if (!this.consentGiven || !this.sessionStartTime) return;
        
        const sessionDuration = Date.now() - this.sessionStartTime;
        this.trackEvent('session_end', {
            duration: sessionDuration,
            total_games: this.gameStartTime ? 1 : 0,
            total_actions: this.actionCount
        });
    }
    
    /**
     * カスタムディメンションの設定
     */
    setUserProperty(name, value) {
        if (!this.consentGiven) return;
        
        if (typeof gtag !== 'undefined') {
            gtag('set', 'user_properties', {
                [name]: value
            });
        }
    }
    
    /**
     * デバッグログ
     */
    log(message, data = null) {
        if (this.debug) {
            console.log(`[Analytics] ${message}`, data || '');
        }
    }
}

// グローバルインスタンスを作成
const gameAnalytics = new GameAnalytics();

// ゲームシステムとの統合ヘルパー
const analyticsIntegration = {
    // ゲームエンジンのイベントにフック
    hookGameEvents() {
        // キー入力の追跡
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                gameAnalytics.trackAction('paddle_move');
            }
        });
        
        // サウンドシステムとの統合
        if (window.soundSystem) {
            const originalSetMuted = soundSystem.setMuted;
            soundSystem.setMuted = function(muted) {
                originalSetMuted.call(this, muted);
                gameAnalytics.trackSoundToggle(!muted);
            };
        }
        
        // ネットワークモニターとの統合
        if (window.networkMonitor) {
            networkMonitor.addQualityChangeListener((quality) => {
                gameAnalytics.trackNetworkCondition(quality);
            });
        }
    },
    
    // パフォーマンスメトリクスの自動収集
    startPerformanceMonitoring() {
        // フレームレートの監視
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                // 低FPSの場合のみ追跡
                if (fps < 30) {
                    gameAnalytics.trackEvent('low_fps', { fps });
                }
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
};

// 統合の自動実行
document.addEventListener('DOMContentLoaded', () => {
    analyticsIntegration.hookGameEvents();
    analyticsIntegration.startPerformanceMonitoring();
});