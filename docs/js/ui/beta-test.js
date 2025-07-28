/**
 * Ultimate Squash Game - ベータテストシステム
 *
 * 公開ベータテストの実施とフィードバック収集を管理するモジュール
 * アナリティクスシステムと統合して効果的なテストを実現
 */

class BetaTester {
  constructor() {
    this.initialized = false;
    this.betaEnabled = false;
    this.betaUserId = null;
    this.feedbackHistory = [];
    this.betaFeatures = {
      'weekly_challenge': true,
      'ai_difficulty_adaptive': true,
      'new_sound_effects': true,
      'multiplayer_preview': false,
      'custom_paddles': true
    };

    // フィードバックカテゴリー
    this.feedbackCategories = {
      'bug': 'バグ報告',
      'feature': '機能改善提案',
      'performance': 'パフォーマンス問題',
      'ui': 'UI/UXフィードバック',
      'gameplay': 'ゲームプレイ感想',
      'other': 'その他'
    };

    // 重要度レベル
    this.severityLevels = {
      'critical': '致命的',
      'major': '重大',
      'minor': '軽微',
      'suggestion': '提案'
    };

    this.initialize();
  }

  /**
     * ベータテストシステムの初期化
     */
  initialize() {
    // ベータ参加状態の確認
    this.checkBetaStatus();

    // URLパラメータでベータモードを有効化
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('beta') === 'true') {
      this.showBetaEnrollment();
    }

    // ベータ参加者用UIの初期化
    if (this.betaEnabled) {
      this.initializeBetaUI();
      this.loadBetaFeatures();
      this.trackBetaSession();
    }

    this.initialized = true;
    console.log('Beta test system initialized');
  }

  /**
     * ベータ参加状態の確認
     */
  checkBetaStatus() {
    const betaData = localStorage.getItem('beta_enrollment');
    if (betaData) {
      const enrollment = JSON.parse(betaData);
      this.betaEnabled = enrollment.active;
      this.betaUserId = enrollment.userId;

      // 有効期限チェック
      if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
        this.betaEnabled = false;
        this.exitBeta();
      }
    }
  }

  /**
     * ベータ参加画面の表示
     */
  showBetaEnrollment() {
    if (this.betaEnabled) {
      this.showBetaDashboard();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'beta-enrollment-modal';
    modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10002; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1a1a; color: white; padding: 40px; border-radius: 12px; max-width: 600px; width: 90%; border: 2px solid #4CAF50;">
                    <h1 style="margin: 0 0 20px 0; color: #4CAF50; text-align: center;">
                        🚀 ベータテストプログラムへようこそ！
                    </h1>
                    
                    <div style="margin-bottom: 30px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px;">ベータテスターの特典</h3>
                        <ul style="margin: 0 0 20px 0; padding-left: 25px; line-height: 1.8;">
                            <li>新機能への早期アクセス</li>
                            <li>ウィークリーチャレンジの先行プレイ</li>
                            <li>AI難易度調整の新アルゴリズム</li>
                            <li>開発チームへの直接フィードバック</li>
                            <li>ベータテスター限定バッジ（実装予定）</li>
                        </ul>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px;">参加条件</h3>
                        <ul style="margin: 0; padding-left: 25px; font-size: 14px; opacity: 0.9;">
                            <li>定期的なフィードバック提供（週1回以上推奨）</li>
                            <li>バグや問題の報告</li>
                            <li>新機能の積極的なテスト</li>
                            <li>建設的な改善提案</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <label style="display: block; margin-bottom: 10px; font-size: 14px; opacity: 0.9;">
                            メールアドレス（任意）
                        </label>
                        <input type="email" id="beta-email" placeholder="beta@example.com" 
                               style="width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; color: white; border-radius: 4px; font-size: 14px;">
                        <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.7;">
                            ※重要なアップデート情報をお送りします（入力しなくても参加可能）
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="beta-terms" style="margin-right: 10px;">
                            <span style="font-size: 14px;">
                                ベータテストの参加条件に同意し、フィードバック提供に協力します
                            </span>
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="betaTester.declineEnrollment()" 
                                style="padding: 12px 30px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                            今回は参加しない
                        </button>
                        <button onclick="betaTester.acceptEnrollment()" 
                                style="padding: 12px 40px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">
                            ベータテストに参加
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
  }

  /**
     * ベータ参加を承諾
     */
  acceptEnrollment() {
    const termsCheckbox = document.getElementById('beta-terms');
    if (!termsCheckbox.checked) {
      alert('参加条件への同意が必要です');
      return;
    }

    const email = document.getElementById('beta-email').value;

    // ベータユーザーIDの生成
    this.betaUserId = 'beta_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 参加情報の保存
    const enrollment = {
      userId: this.betaUserId,
      email: email || null,
      enrolledAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日間
      active: true,
      features: Object.keys(this.betaFeatures)
    };

    localStorage.setItem('beta_enrollment', JSON.stringify(enrollment));
    this.betaEnabled = true;

    // アナリティクスに記録
    if (window.gameAnalytics) {
      gameAnalytics.trackEvent('beta_enrollment', {
        userId: this.betaUserId,
        hasEmail: !!email
      });
    }

    // UIを閉じて初期化
    this.closeEnrollmentModal();
    this.initializeBetaUI();
    this.showWelcomeMessage();
  }

  /**
     * ベータ参加を拒否
     */
  declineEnrollment() {
    localStorage.setItem('beta_declined', new Date().toISOString());
    this.closeEnrollmentModal();
  }

  /**
     * 参加画面を閉じる
     */
  closeEnrollmentModal() {
    const modal = document.getElementById('beta-enrollment-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
     * ベータ参加者用UIの初期化
     */
  initializeBetaUI() {
    // フィードバックボタンの追加
    this.addFeedbackButton();

    // ベータバッジの表示
    this.showBetaBadge();

    // ベータ機能の有効化
    this.enableBetaFeatures();

    // キーボードショートカット
    this.setupKeyboardShortcuts();
  }

  /**
     * フィードバックボタンの追加
     */
  addFeedbackButton() {
    const button = document.createElement('button');
    button.id = 'beta-feedback-button';
    button.innerHTML = '💬 フィードバック';
    button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 1000;
            transition: all 0.3s ease;
        `;

    button.onmouseover = () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 8px rgba(0,0,0,0.4)';
    };

    button.onmouseout = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    };

    button.onclick = () => this.showFeedbackForm();

    document.body.appendChild(button);
  }

  /**
     * ベータバッジの表示
     */
  showBetaBadge() {
    const badge = document.createElement('div');
    badge.id = 'beta-badge';
    badge.innerHTML = `
            <div style="background: #ff5722; color: white; padding: 5px 15px; border-radius: 0 0 8px 8px; font-size: 12px; font-weight: bold;">
                BETA v1.0
            </div>
        `;
    badge.style.cssText = `
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1001;
        `;

    document.body.appendChild(badge);
  }

  /**
     * フィードバックフォームの表示
     */
  showFeedbackForm() {
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10003; display: flex; align-items: center; justify-content: center;">
                <div style="background: #2a2a2a; color: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin: 0 0 20px 0; color: #4CAF50;">フィードバックを送信</h2>
                    
                    <form id="beta-feedback-form">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px;">
                                カテゴリー <span style="color: #ff5722;">*</span>
                            </label>
                            <select id="feedback-category" required style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                                ${Object.entries(this.feedbackCategories).map(([key, value]) =>
    `<option value="${key}">${value}</option>`
  ).join('')}
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px;">
                                重要度 <span style="color: #ff5722;">*</span>
                            </label>
                            <select id="feedback-severity" required style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                                ${Object.entries(this.severityLevels).map(([key, value]) =>
    `<option value="${key}">${value}</option>`
  ).join('')}
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px;">
                                タイトル <span style="color: #ff5722;">*</span>
                            </label>
                            <input type="text" id="feedback-title" required maxlength="100"
                                   placeholder="問題や提案を簡潔に記述"
                                   style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px;">
                                詳細説明 <span style="color: #ff5722;">*</span>
                            </label>
                            <textarea id="feedback-description" required rows="6"
                                      placeholder="具体的な状況、再現手順、期待される動作などを詳しく記述してください"
                                      style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px; resize: vertical;"></textarea>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px;">
                                発生頻度
                            </label>
                            <select id="feedback-frequency" style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                                <option value="always">常に発生</option>
                                <option value="often">頻繁に発生</option>
                                <option value="sometimes">時々発生</option>
                                <option value="rarely">まれに発生</option>
                                <option value="once">一度だけ発生</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" id="feedback-screenshot" style="margin-right: 8px;">
                                <span style="font-size: 14px;">スクリーンショットを自動添付（ゲーム画面のみ）</span>
                            </label>
                        </div>
                        
                        <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; font-size: 14px;">システム情報（自動収集）</h4>
                            <pre style="margin: 0; font-size: 12px; opacity: 0.8; white-space: pre-wrap;">${this.getSystemInfo()}</pre>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="betaTester.closeFeedbackForm()"
                                    style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                キャンセル
                            </button>
                            <button type="submit"
                                    style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                                送信
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // フォームイベントの設定
    document.getElementById('beta-feedback-form').onsubmit = (e) => {
      e.preventDefault();
      this.submitFeedback();
    };
  }

  /**
     * フィードバックの送信
     */
  async submitFeedback() {
    const feedback = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: this.betaUserId,
      timestamp: new Date().toISOString(),
      category: document.getElementById('feedback-category').value,
      severity: document.getElementById('feedback-severity').value,
      title: document.getElementById('feedback-title').value,
      description: document.getElementById('feedback-description').value,
      frequency: document.getElementById('feedback-frequency').value,
      includeScreenshot: document.getElementById('feedback-screenshot').checked,
      systemInfo: this.getSystemInfo(),
      gameState: this.getGameState()
    };

    // スクリーンショットの取得（Canvas要素から）
    if (feedback.includeScreenshot) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        feedback.screenshot = canvas.toDataURL('image/png');
      }
    }

    // ローカル保存
    this.saveFeedbackLocally(feedback);

    // アナリティクスに送信
    if (window.gameAnalytics) {
      gameAnalytics.trackEvent('beta_feedback', {
        feedbackId: feedback.id,
        category: feedback.category,
        severity: feedback.severity,
        hasScreenshot: feedback.includeScreenshot
      });
    }

    // サーバーへの送信（実装時）
    try {
      await this.sendFeedbackToServer(feedback);
      this.showSuccessMessage('フィードバックを送信しました！');
    } catch (error) {
      console.error('Feedback submission error:', error);
      this.showSuccessMessage('フィードバックをローカルに保存しました。後で送信されます。');
    }

    this.closeFeedbackForm();
  }

  /**
     * フィードバックのローカル保存
     */
  saveFeedbackLocally(feedback) {
    const feedbacks = JSON.parse(localStorage.getItem('beta_feedbacks') || '[]');
    feedbacks.push(feedback);

    // 最新30件のみ保持
    if (feedbacks.length > 30) {
      feedbacks.splice(0, feedbacks.length - 30);
    }

    localStorage.setItem('beta_feedbacks', JSON.stringify(feedbacks));
    this.feedbackHistory.push(feedback);
  }

  /**
     * フィードバックをサーバーに送信
     */
  async sendFeedbackToServer(feedback) {
    // 実装例（実際のエンドポイントに置き換え）
    const response = await fetch('/api/beta/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      throw new Error('Feedback submission failed');
    }

    return response.json();
  }

  /**
     * システム情報の取得
     */
  getSystemInfo() {
    return `ブラウザ: ${navigator.userAgent}
画面解像度: ${window.screen.width}x${window.screen.height}
ウィンドウサイズ: ${window.innerWidth}x${window.innerHeight}
言語: ${navigator.language}
プラットフォーム: ${navigator.platform}
メモリ: ${navigator.deviceMemory || 'N/A'} GB
CPU: ${navigator.hardwareConcurrency || 'N/A'} cores`;
  }

  /**
     * ゲーム状態の取得
     */
  getGameState() {
    // ゲームの現在状態を取得（実装に応じて調整）
    return {
      score: window.game_state?.scores || [0, 0],
      gameTime: window.game_state?.game_time || 0,
      difficulty: window.game_state?.difficulty || 'normal',
      betaFeatures: this.betaFeatures
    };
  }

  /**
     * フィードバックフォームを閉じる
     */
  closeFeedbackForm() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
     * 成功メッセージの表示
     */
  showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 10004;
            animation: slideUp 0.3s ease-out;
        `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
     * ウェルカムメッセージの表示
     */
  showWelcomeMessage() {
    const welcome = document.createElement('div');
    welcome.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2a2a2a; color: white; padding: 40px; border-radius: 12px; text-align: center; z-index: 10005; border: 2px solid #4CAF50;">
                <h2 style="margin: 0 0 20px 0; color: #4CAF50;">🎉 ベータテストへようこそ！</h2>
                <p style="margin: 0 0 20px 0; font-size: 16px;">
                    あなたのフィードバックがゲームをより良くします。<br>
                    右下のフィードバックボタンからいつでも意見をお寄せください。
                </p>
                <p style="margin: 0 0 30px 0; font-size: 14px; opacity: 0.8;">
                    ショートカット: <kbd>F</kbd>キーでフィードバックフォームを開く
                </p>
                <button onclick="this.parentElement.parentElement.remove()"
                        style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                    はじめる
                </button>
            </div>
        `;

    document.body.appendChild(welcome);
  }

  /**
     * ベータ機能の有効化
     */
  enableBetaFeatures() {
    // ウィークリーチャレンジ
    if (this.betaFeatures.weekly_challenge && window.challengeGenerator) {
      console.log('Beta: Weekly challenge enabled');
    }

    // AI適応難易度
    if (this.betaFeatures.ai_difficulty_adaptive) {
      console.log('Beta: Adaptive AI difficulty enabled');
      // AI難易度調整ロジックの有効化
    }

    // 新サウンドエフェクト
    if (this.betaFeatures.new_sound_effects && window.soundSystem) {
      console.log('Beta: New sound effects enabled');
      // 新しいサウンドセットの読み込み
    }

    // カスタムパドル
    if (this.betaFeatures.custom_paddles) {
      console.log('Beta: Custom paddles enabled');
      this.enablePaddleCustomization();
    }
  }

  /**
     * パドルカスタマイズ機能
     */
  enablePaddleCustomization() {
    // カスタマイズボタンの追加
    const customizeBtn = document.createElement('button');
    customizeBtn.innerHTML = '🎨';
    customizeBtn.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: #ff5722;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            z-index: 1000;
        `;
    customizeBtn.onclick = () => this.showPaddleCustomizer();
    customizeBtn.title = 'パドルをカスタマイズ（ベータ機能）';

    document.body.appendChild(customizeBtn);
  }

  /**
     * パドルカスタマイザーUI
     */
  showPaddleCustomizer() {
    const modal = document.createElement('div');
    modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10006; display: flex; align-items: center; justify-content: center;">
                <div style="background: #2a2a2a; color: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <h3 style="margin: 0 0 20px 0; color: #ff5722;">パドルカスタマイズ（ベータ）</h3>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px;">パドルの色</label>
                        <input type="color" id="paddle-color" value="#ffffff" style="width: 100%; height: 40px; cursor: pointer;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px;">パドルの形状</label>
                        <select id="paddle-shape" style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                            <option value="rect">長方形（標準）</option>
                            <option value="rounded">角丸</option>
                            <option value="diamond">ダイヤモンド</option>
                            <option value="circle">円形</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px;">エフェクト</label>
                        <select id="paddle-effect" style="width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 4px;">
                            <option value="none">なし</option>
                            <option value="glow">グロー効果</option>
                            <option value="trail">軌跡効果</option>
                            <option value="rainbow">レインボー</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()"
                                style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            キャンセル
                        </button>
                        <button onclick="betaTester.applyPaddleCustomization()"
                                style="padding: 10px 20px; background: #ff5722; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            適用
                        </button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * パドルカスタマイズの適用
     */
  applyPaddleCustomization() {
    const customization = {
      color: document.getElementById('paddle-color').value,
      shape: document.getElementById('paddle-shape').value,
      effect: document.getElementById('paddle-effect').value
    };

    // カスタマイズ設定の保存
    localStorage.setItem('paddle_customization', JSON.stringify(customization));

    // アナリティクスに記録
    if (window.gameAnalytics) {
      gameAnalytics.trackEvent('beta_customization', {
        type: 'paddle',
        settings: customization
      });
    }

    // 実際のゲームへの適用（実装に応じて）
    if (window.game_state) {
      // ゲームのパドル描画ロジックに適用
      console.log('Paddle customization applied:', customization);
    }

    this.showSuccessMessage('パドルをカスタマイズしました！');
    document.querySelector('[style*="position: fixed"]').remove();
  }

  /**
     * キーボードショートカットの設定
     */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Fキーでフィードバック
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // 入力フィールドにフォーカスがない場合のみ
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.showFeedbackForm();
        }
      }

      // Ctrl+Shift+Bでベータダッシュボード
      if (e.key.toLowerCase() === 'b' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.showBetaDashboard();
      }
    });
  }

  /**
     * ベータダッシュボードの表示
     */
  showBetaDashboard() {
    const feedbacks = JSON.parse(localStorage.getItem('beta_feedbacks') || '[]');

    const modal = document.createElement('div');
    modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10007; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1a1a; color: white; padding: 40px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin: 0 0 30px 0; color: #4CAF50;">ベータテストダッシュボード</h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.8;">参加日数</h3>
                            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #4CAF50;">
                                ${this.getDaysSinceEnrollment()}
                            </p>
                        </div>
                        
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.8;">フィードバック数</h3>
                            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #ff5722;">
                                ${feedbacks.length}
                            </p>
                        </div>
                        
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.8;">有効機能</h3>
                            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #2196F3;">
                                ${Object.values(this.betaFeatures).filter(v => v).length}
                            </p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px;">ベータ機能の状態</h3>
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
                            ${Object.entries(this.betaFeatures).map(([key, enabled]) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <span>${this.getFeatureName(key)}</span>
                                    <span style="color: ${enabled ? '#4CAF50' : '#666'};">
                                        ${enabled ? '✓ 有効' : '無効'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px;">最近のフィードバック</h3>
                        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                            ${feedbacks.slice(-5).reverse().map(fb => `
                                <div style="border-bottom: 1px solid #444; padding: 10px 0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span style="font-weight: bold;">${fb.title}</span>
                                        <span style="font-size: 12px; opacity: 0.7;">${new Date(fb.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div style="display: flex; gap: 10px; font-size: 12px;">
                                        <span style="background: #444; padding: 2px 8px; border-radius: 3px;">${this.feedbackCategories[fb.category]}</span>
                                        <span style="background: #444; padding: 2px 8px; border-radius: 3px;">${this.severityLevels[fb.severity]}</span>
                                    </div>
                                </div>
                            `).join('') || '<p style="text-align: center; opacity: 0.7;">まだフィードバックがありません</p>'}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: space-between;">
                        <button onclick="betaTester.exportFeedbacks()"
                                style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            データをエクスポート
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="betaTester.exitBeta()"
                                    style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                ベータを終了
                            </button>
                            <button onclick="this.closest('[style*=\"position: fixed\"]').remove()"
                                    style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  }

  /**
     * 参加日数の計算
     */
  getDaysSinceEnrollment() {
    const enrollment = JSON.parse(localStorage.getItem('beta_enrollment') || '{}');
    if (!enrollment.enrolledAt) return 0;

    const days = Math.floor((new Date() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60 * 24));
    return days;
  }

  /**
     * 機能名の取得
     */
  getFeatureName(key) {
    const names = {
      'weekly_challenge': 'ウィークリーチャレンジ',
      'ai_difficulty_adaptive': 'AI適応難易度',
      'new_sound_effects': '新サウンドエフェクト',
      'multiplayer_preview': 'マルチプレイヤー（プレビュー）',
      'custom_paddles': 'カスタムパドル'
    };
    return names[key] || key;
  }

  /**
     * フィードバックのエクスポート
     */
  exportFeedbacks() {
    const feedbacks = JSON.parse(localStorage.getItem('beta_feedbacks') || '[]');
    const enrollment = JSON.parse(localStorage.getItem('beta_enrollment') || '{}');

    const exportData = {
      userId: this.betaUserId,
      enrollmentDate: enrollment.enrolledAt,
      exportDate: new Date().toISOString(),
      feedbacks: feedbacks
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta_feedback_${this.betaUserId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
     * ベータテストの終了
     */
  exitBeta() {
    if (confirm('本当にベータテストを終了しますか？\n\n送信済みのフィードバックは保持されます。')) {
      // アナリティクスに記録
      if (window.gameAnalytics) {
        gameAnalytics.trackEvent('beta_exit', {
          userId: this.betaUserId,
          daysParticipated: this.getDaysSinceEnrollment(),
          feedbackCount: this.feedbackHistory.length
        });
      }

      // ベータ状態をクリア
      localStorage.removeItem('beta_enrollment');
      this.betaEnabled = false;

      // UIをクリア
      const elementsToRemove = [
        'beta-feedback-button',
        'beta-badge',
        document.querySelector('[style*="position: fixed"]')
      ];

      elementsToRemove.forEach(el => {
        if (el && el.remove) el.remove();
      });

      alert('ベータテストへのご協力ありがとうございました！');
      location.reload();
    }
  }

  /**
     * ベータセッションの追跡
     */
  trackBetaSession() {
    if (window.gameAnalytics) {
      gameAnalytics.trackEvent('beta_session_start', {
        userId: this.betaUserId,
        enabledFeatures: Object.keys(this.betaFeatures).filter(k => this.betaFeatures[k])
      });
    }
  }

  /**
     * ベータ機能の読み込み
     */
  loadBetaFeatures() {
    // 保存されたカスタマイズの適用
    const paddleCustom = localStorage.getItem('paddle_customization');
    if (paddleCustom) {
      const custom = JSON.parse(paddleCustom);
      console.log('Loading paddle customization:', custom);
      // 実際のゲームへの適用
    }
  }
}

// グローバルインスタンスを作成
const betaTester = new BetaTester();

// CSSアニメーションの追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 20px);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    /* フィードバックボタンのアニメーション */
    #beta-feedback-button {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% {
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        50% {
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
        }
        100% {
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
    }
`;
document.head.appendChild(style);
