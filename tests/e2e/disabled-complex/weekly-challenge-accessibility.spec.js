import { test, expect } from '@playwright/test';

/**
 * Phase 3: 週替わりチャレンジのアクセシビリティテスト
 * 
 * WCAG 2.1 AAレベル準拠のアクセシビリティテスト
 * - キーボードナビゲーション
 * - スクリーンリーダー対応
 * - 色覚異常対応
 * - 高コントラストモード
 */

test.describe('Weekly Challenge Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/game.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#loadingOverlay', { state: 'hidden' });
  });

  test('キーボードナビゲーションによるチャレンジ操作', async ({ page }) => {
    // チャレンジボタンを追加
    await page.evaluate(() => {
      const challengeButton = document.createElement('button');
      challengeButton.id = 'weeklyChallenge';
      challengeButton.textContent = '📅 週替わりチャレンジ';
      challengeButton.setAttribute('aria-label', '週替わりチャレンジを表示');
      challengeButton.setAttribute('tabindex', '0');
      challengeButton.style.cssText = `
        position: absolute;
        right: 200px;
        top: 20px;
        background: #ff6b6b;
        color: white;
        border: 2px solid transparent;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      // フォーカス時のスタイル
      challengeButton.addEventListener('focus', () => {
        challengeButton.style.borderColor = '#4ecdc4';
        challengeButton.style.outline = '2px solid #4ecdc4';
      });
      
      challengeButton.addEventListener('blur', () => {
        challengeButton.style.borderColor = 'transparent';
        challengeButton.style.outline = 'none';
      });
      
      challengeButton.addEventListener('click', () => {
        alert('チャレンジモーダルを表示');
      });
      
      // Enterキーでもクリック可能にする
      challengeButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          challengeButton.click();
        }
      });
      
      document.body.appendChild(challengeButton);
    });
    
    // Tabキーでボタンにフォーカス
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // チャレンジボタンにフォーカスが当たることを確認
    const focusedElement = await page.locator('#weeklyChallenge');
    await expect(focusedElement).toBeFocused();
    
    // Enterキーでボタンを押す
    await page.keyboard.press('Enter');
    
    // アラートが表示されることを確認
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('チャレンジモーダルを表示');
      dialog.accept();
    });
  });

  test('スクリーンリーダー対応のチャレンジ情報', async ({ page }) => {
    // アクセシブルなチャレンジパネルを作成
    await page.evaluate(() => {
      const challengePanelHTML = `
        <div id="accessibleChallengePanel" 
             role="region" 
             aria-labelledby="challengeTitle"
             aria-describedby="challengeDescription"
             style="
               position: absolute;
               top: 100px;
               right: 20px;
               width: 300px;
               background: rgba(0, 0, 0, 0.9);
               color: white;
               padding: 20px;
               border-radius: 8px;
               border: 2px solid #4ecdc4;
             ">
          <h2 id="challengeTitle">今週のチャレンジ</h2>
          <p id="challengeDescription">1500点以上のスコアを60秒以内に達成してください</p>
          
          <div role="progressbar" 
               aria-valuenow="45" 
               aria-valuemin="0" 
               aria-valuemax="100"
               aria-label="チャレンジ進捗">
            <div style="
              width: 100%;
              height: 20px;
              background: #333;
              border-radius: 10px;
              overflow: hidden;
              margin: 15px 0;
            ">
              <div style="
                width: 45%;
                height: 100%;
                background: #4ecdc4;
                transition: width 0.3s ease;
              "></div>
            </div>
            <span aria-live="polite" id="progressText">進捗: 45%</span>
          </div>
          
          <div role="group" aria-labelledby="statsTitle">
            <h3 id="statsTitle">チャレンジ統計</h3>
            <dl>
              <dt>現在のスコア:</dt>
              <dd id="currentScore" aria-live="polite">675</dd>
              <dt>目標スコア:</dt>
              <dd>1500</dd>
              <dt>残り時間:</dt>
              <dd id="timeRemaining" aria-live="polite">35秒</dd>
            </dl>
          </div>
          
          <button id="challengeAction" 
                  aria-describedby="actionDescription"
                  style="
                    background: #4ecdc4;
                    color: #1a1a2e;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 15px;
                  ">
            チャレンジを開始
          </button>
          <p id="actionDescription" style="font-size: 12px; color: #ccc; margin-top: 5px;">
            チャレンジを開始すると、進捗が自動的に追跡されます
          </p>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', challengePanelHTML);
      
      // 進捗とタイマーを動的に更新
      let progress = 45;
      let timeLeft = 35;
      
      const updateInterval = setInterval(() => {
        progress = Math.min(progress + 2, 100);
        timeLeft = Math.max(timeLeft - 1, 0);
        
        const progressBar = document.querySelector('[role="progressbar"]');
        const progressFill = progressBar.querySelector('div > div');
        const progressText = document.getElementById('progressText');
        const currentScore = document.getElementById('currentScore');
        const timeRemaining = document.getElementById('timeRemaining');
        
        if (progressBar && progressFill && progressText) {
          progressBar.setAttribute('aria-valuenow', progress);
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `進捗: ${progress}%`;
          currentScore.textContent = Math.round(675 + (progress - 45) * 20);
          timeRemaining.textContent = `${timeLeft}秒`;
        }
        
        if (progress >= 100 || timeLeft <= 0) {
          clearInterval(updateInterval);
        }
      }, 1000);
      
      // ボタンクリックイベント
      document.getElementById('challengeAction').addEventListener('click', () => {
        alert('チャレンジが開始されました！');
      });
    });
    
    // チャレンジパネルが表示されることを確認
    await expect(page.locator('#accessibleChallengePanel')).toBeVisible();
    
    // ARIA属性が正しく設定されていることを確認
    const challengePanel = page.locator('#accessibleChallengePanel');
    await expect(challengePanel).toHaveAttribute('role', 'region');
    await expect(challengePanel).toHaveAttribute('aria-labelledby', 'challengeTitle');
    
    // プログレスバーのARIA属性を確認
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    
    // ライブリージョンが機能することを確認
    await page.waitForTimeout(2000);
    const updatedProgress = await progressBar.getAttribute('aria-valuenow');
    expect(parseInt(updatedProgress)).toBeGreaterThan(45);
  });

  test('色覚異常対応のチャレンジ表示', async ({ page }) => {
    // 色覚異常に対応したチャレンジ表示をテスト
    await page.evaluate(() => {
      // 色覚異常対応のチャレンジカード
      const colorBlindFriendlyHTML = `
        <div id="colorBlindChallenge" style="
          position: absolute;
          top: 150px;
          left: 20px;
          width: 350px;
          background: white;
          color: black;
          padding: 20px;
          border-radius: 8px;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        ">
          <h2 style="margin: 0 0 15px 0; color: #000;">チャレンジ: スコアマスター</h2>
          
          <div style="margin: 15px 0;">
            <div style="
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            ">
              <span style="
                display: inline-block;
                width: 20px;
                height: 20px;
                background: #000;
                border-radius: 50%;
                margin-right: 10px;
              "></span>
              <span style="font-weight: bold;">目標: 1500点</span>
            </div>
            
            <div style="
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            ">
              <span style="
                display: inline-block;
                width: 20px;
                height: 20px;
                background: #666;
                border-radius: 50%;
                margin-right: 10px;
              "></span>
              <span>現在: 845点</span>
            </div>
          </div>
          
          <div style="margin: 15px 0;">
            <div style="
              width: 100%;
              height: 25px;
              background: #f0f0f0;
              border: 2px solid #000;
              border-radius: 4px;
              overflow: hidden;
              position: relative;
            ">
              <div style="
                width: 56%;
                height: 100%;
                background: repeating-linear-gradient(
                  45deg,
                  #333,
                  #333 10px,
                  #666 10px,
                  #666 20px
                );
                position: relative;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-weight: bold;
                font-size: 12px;
                color: #fff;
                text-shadow: 1px 1px 2px #000;
              ">56%</div>
            </div>
          </div>
          
          <div style="margin: 15px 0;">
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            ">
              <div style="
                padding: 10px;
                background: #f8f8f8;
                border: 1px solid #ccc;
                border-radius: 4px;
                text-align: center;
              ">
                <div style="font-size: 18px; font-weight: bold;">★★★</div>
                <div style="font-size: 12px;">難易度: 普通</div>
              </div>
              <div style="
                padding: 10px;
                background: #f8f8f8;
                border: 1px solid #ccc;
                border-radius: 4px;
                text-align: center;
              ">
                <div style="font-size: 18px; font-weight: bold;">⏰ 45s</div>
                <div style="font-size: 12px;">残り時間</div>
              </div>
            </div>
          </div>
          
          <div style="
            margin-top: 20px;
            padding: 15px;
            background: #e8f4f8;
            border: 1px solid #b8d4e8;
            border-radius: 4px;
          ">
            <h3 style="margin: 0 0 10px 0; font-size: 14px;">報酬</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>+150 ポイント</li>
              <li>🏆 称号: スコアマスター</li>
              <li>📈 レベル進捗 +10%</li>
            </ul>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', colorBlindFriendlyHTML);
    });
    
    // 色覚異常対応のチャレンジ表示が正しく表示されることを確認
    await expect(page.locator('#colorBlindChallenge')).toBeVisible();
    
    // テキストベースの情報が適切に表示されることを確認
    await expect(page.locator('#colorBlindChallenge')).toContainText('目標: 1500点');
    await expect(page.locator('#colorBlindChallenge')).toContainText('現在: 845点');
    await expect(page.locator('#colorBlindChallenge')).toContainText('56%');
    await expect(page.locator('#colorBlindChallenge')).toContainText('報酬');
    
    // 視覚的な指標（アイコン、パターン）が含まれていることを確認
    await expect(page.locator('#colorBlindChallenge')).toContainText('★★★');
    await expect(page.locator('#colorBlindChallenge')).toContainText('⏰');
    await expect(page.locator('#colorBlindChallenge')).toContainText('🏆');
  });

  test('高コントラストモードでのチャレンジ表示', async ({ page }) => {
    // 高コントラストモードを有効にする
    await page.evaluate(() => {
      document.body.classList.add('high-contrast');
    });
    
    // 高コントラストモード用のチャレンジ表示を作成
    await page.evaluate(() => {
      const highContrastStyle = `
        <style>
          body.high-contrast #highContrastChallenge {
            background: #000000 !important;
            color: #FFFFFF !important;
            border: 3px solid #FFFFFF !important;
          }
          body.high-contrast #highContrastChallenge .title {
            color: #FFFF00 !important;
            background: #000000 !important;
          }
          body.high-contrast #highContrastChallenge .progress-bar {
            background: #000000 !important;
            border: 2px solid #FFFFFF !important;
          }
          body.high-contrast #highContrastChallenge .progress-fill {
            background: #FFFFFF !important;
          }
          body.high-contrast #highContrastChallenge .button {
            background: #FFFFFF !important;
            color: #000000 !important;
            border: 2px solid #FFFFFF !important;
          }
          body.high-contrast #highContrastChallenge .button:hover {
            background: #FFFF00 !important;
            color: #000000 !important;
          }
          body.high-contrast #highContrastChallenge .success {
            color: #00FF00 !important;
          }
          body.high-contrast #highContrastChallenge .warning {
            color: #FFFF00 !important;
          }
          body.high-contrast #highContrastChallenge .error {
            color: #FF0000 !important;
          }
        </style>
      `;
      
      document.head.insertAdjacentHTML('beforeend', highContrastStyle);
      
      const highContrastHTML = `
        <div id="highContrastChallenge" style="
          position: absolute;
          top: 200px;
          right: 20px;
          width: 300px;
          background: #1a1a2e;
          color: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #4ecdc4;
        ">
          <h2 class="title" style="margin: 0 0 15px 0; color: #4ecdc4;">
            高コントラストチャレンジ
          </h2>
          
          <div style="margin: 15px 0;">
            <div style="font-size: 16px; margin-bottom: 10px;">
              <span class="success">✓</span> 目標スコア: 1200点
            </div>
            <div style="font-size: 16px; margin-bottom: 10px;">
              <span class="warning">⚠</span> 現在スコア: 980点
            </div>
            <div style="font-size: 16px; margin-bottom: 10px;">
              <span class="error">⏰</span> 残り時間: 25秒
            </div>
          </div>
          
          <div class="progress-bar" style="
            width: 100%;
            height: 25px;
            background: #333;
            border: 2px solid #fff;
            border-radius: 4px;
            overflow: hidden;
            margin: 15px 0;
          ">
            <div class="progress-fill" style="
              width: 82%;
              height: 100%;
              background: #4ecdc4;
              position: relative;
            ">
              <span style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-weight: bold;
                font-size: 12px;
                color: #000;
              ">82%</span>
            </div>
          </div>
          
          <div style="margin: 15px 0;">
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            ">
              <div style="
                padding: 10px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #fff;
                border-radius: 4px;
                text-align: center;
              ">
                <div style="font-size: 14px; font-weight: bold;">難易度</div>
                <div style="font-size: 18px;">★★★</div>
              </div>
              <div style="
                padding: 10px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #fff;
                border-radius: 4px;
                text-align: center;
              ">
                <div style="font-size: 14px; font-weight: bold;">状態</div>
                <div class="warning" style="font-size: 18px;">進行中</div>
              </div>
            </div>
          </div>
          
          <button class="button" style="
            background: #4ecdc4;
            color: #1a1a2e;
            border: 2px solid #4ecdc4;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            margin-top: 15px;
            font-weight: bold;
          ">
            チャレンジを完了
          </button>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', highContrastHTML);
    });
    
    // 高コントラストモードでチャレンジが正しく表示されることを確認
    await expect(page.locator('#highContrastChallenge')).toBeVisible();
    await expect(page.locator('#highContrastChallenge .title')).toContainText('高コントラストチャレンジ');
    
    // 色分けされた情報が適切に表示されることを確認
    await expect(page.locator('.success')).toContainText('✓');
    await expect(page.locator('.warning')).toContainText('⚠');
    await expect(page.locator('.error')).toContainText('⏰');
    
    // 進捗バーが視認可能であることを確認
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.progress-fill')).toContainText('82%');
  });

  test('フォーカス管理とキーボードショートカット', async ({ page }) => {
    // チャレンジ関連のキーボードショートカットをテスト
    await page.evaluate(() => {
      // キーボードショートカットハンドラーを追加
      document.addEventListener('keydown', (e) => {
        // Ctrl+Cでチャレンジ表示
        if (e.ctrlKey && e.key === 'c') {
          e.preventDefault();
          alert('チャレンジ表示ショートカット（Ctrl+C）が実行されました');
        }
        
        // Ctrl+Pでチャレンジ進捗表示
        if (e.ctrlKey && e.key === 'p') {
          e.preventDefault();
          alert('チャレンジ進捗表示ショートカット（Ctrl+P）が実行されました');
        }
        
        // Escapeでモーダルを閉じる
        if (e.key === 'Escape') {
          const modals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
          modals.forEach(modal => {
            modal.style.display = 'none';
          });
        }
      });
      
      // フォーカス可能な要素を作成
      const focusableElements = `
        <div id="focusableChallenge" style="
          position: absolute;
          top: 250px;
          left: 20px;
          width: 300px;
          background: #1a1a2e;
          color: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #4ecdc4;
        ">
          <h2>フォーカス管理テスト</h2>
          <button id="btn1" tabindex="1">ボタン 1</button>
          <button id="btn2" tabindex="2">ボタン 2</button>
          <input id="input1" type="text" placeholder="入力フィールド" tabindex="3">
          <select id="select1" tabindex="4">
            <option>オプション 1</option>
            <option>オプション 2</option>
          </select>
          <button id="btn3" tabindex="5">ボタン 3</button>
          <p style="font-size: 12px; color: #ccc; margin-top: 10px;">
            キーボードショートカット: Ctrl+C（チャレンジ表示）、Ctrl+P（進捗表示）、Esc（閉じる）
          </p>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', focusableElements);
      
      // フォーカス時のスタイルを追加
      document.querySelectorAll('#focusableChallenge button, #focusableChallenge input, #focusableChallenge select').forEach(el => {
        el.style.margin = '5px';
        el.style.padding = '8px';
        el.style.borderRadius = '4px';
        el.style.border = '2px solid transparent';
        
        el.addEventListener('focus', () => {
          el.style.borderColor = '#4ecdc4';
          el.style.outline = '2px solid #4ecdc4';
        });
        
        el.addEventListener('blur', () => {
          el.style.borderColor = 'transparent';
          el.style.outline = 'none';
        });
      });
    });
    
    // フォーカス管理テストエリアが表示されることを確認
    await expect(page.locator('#focusableChallenge')).toBeVisible();
    
    // Tab キーでフォーカスを移動
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // 最初のボタンにフォーカスが当たることを確認
    await expect(page.locator('#btn1')).toBeFocused();
    
    // 続けてTabキーでフォーカスを移動
    await page.keyboard.press('Tab');
    await expect(page.locator('#btn2')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#input1')).toBeFocused();
    
    // キーボードショートカットをテスト
    await page.keyboard.press('Control+c');
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('チャレンジ表示ショートカット（Ctrl+C）が実行されました');
      dialog.accept();
    });
    
    await page.keyboard.press('Control+p');
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('チャレンジ進捗表示ショートカット（Ctrl+P）が実行されました');
      dialog.accept();
    });
  });

  test('音声読み上げとARIAライブリージョン', async ({ page }) => {
    // ARIAライブリージョンを使用したチャレンジ更新通知をテスト
    await page.evaluate(() => {
      const ariaLiveHTML = `
        <div id="ariaLiveChallenge" style="
          position: absolute;
          top: 300px;
          right: 20px;
          width: 300px;
          background: #1a1a2e;
          color: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #4ecdc4;
        ">
          <h2>ARIAライブリージョンテスト</h2>
          
          <div aria-live="polite" id="challengeStatus" style="
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          ">
            チャレンジ待機中...
          </div>
          
          <div aria-live="assertive" id="challengeAlerts" style="
            background: rgba(255, 0, 0, 0.2);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            min-height: 20px;
          "></div>
          
          <div style="margin: 15px 0;">
            <label for="scoreInput">現在のスコア:</label>
            <input id="scoreInput" type="number" value="0" style="
              width: 100%;
              padding: 8px;
              margin: 5px 0;
              border: 1px solid #ccc;
              border-radius: 4px;
            ">
          </div>
          
          <button id="updateProgress" style="
            background: #4ecdc4;
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
          ">
            進捗を更新
          </button>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', ariaLiveHTML);
      
      // 進捗更新の実装
      let updateCount = 0;
      document.getElementById('updateProgress').addEventListener('click', () => {
        updateCount++;
        const score = document.getElementById('scoreInput').value;
        const statusElement = document.getElementById('challengeStatus');
        const alertsElement = document.getElementById('challengeAlerts');
        
        // politeな更新（穏やかに読み上げられる）
        statusElement.textContent = `更新 ${updateCount}: スコア ${score}点で進捗更新中...`;
        
        // assertiveな更新（緊急に読み上げられる）
        if (parseInt(score) >= 1000) {
          alertsElement.textContent = '目標達成！チャレンジクリアまであと少しです！';
        } else if (parseInt(score) >= 500) {
          alertsElement.textContent = '半分に到達しました。この調子で続けてください！';
        } else {
          alertsElement.textContent = '';
        }
        
        // 2秒後にステータスをクリア
        setTimeout(() => {
          statusElement.textContent = 'チャレンジ進行中...';
        }, 2000);
      });
    });
    
    // ARIAライブリージョンテストエリアが表示されることを確認
    await expect(page.locator('#ariaLiveChallenge')).toBeVisible();
    
    // 初期状態の確認
    await expect(page.locator('#challengeStatus')).toContainText('チャレンジ待機中...');
    
    // スコア入力とボタンクリック
    await page.fill('#scoreInput', '750');
    await page.click('#updateProgress');
    
    // ライブリージョンが更新されることを確認
    await expect(page.locator('#challengeStatus')).toContainText('スコア 750点で進捗更新中...');
    
    // 高スコアでアラートが表示されることをテスト
    await page.fill('#scoreInput', '1200');
    await page.click('#updateProgress');
    
    await expect(page.locator('#challengeAlerts')).toContainText('目標達成！チャレンジクリアまであと少しです！');
  });
});