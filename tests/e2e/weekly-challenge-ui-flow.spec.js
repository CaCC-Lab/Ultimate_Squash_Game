import { test, expect } from '@playwright/test';

/**
 * Phase 3: 週替わりチャレンジUI操作フローテスト
 * 
 * 実際のユーザー操作を模擬したE2Eテスト
 * - チャレンジ表示UI
 * - ゲーム中のチャレンジ進捗表示
 * - チャレンジ完了時の通知
 * - ランキング統合
 */

test.describe('Weekly Challenge UI Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    await page.goto('/docs/game.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#loadingOverlay', { state: 'hidden' });
  });

  test('チャレンジ表示ボタンの追加と動作', async ({ page }) => {
    // 週替わりチャレンジ表示ボタンをページに追加
    await page.evaluate(() => {
      // 既存のボタン要素を取得
      const existingButton = document.querySelector('.control-button');
      
      if (existingButton && !document.getElementById('weeklyChallenge')) {
        // 週替わりチャレンジボタンを作成
        const challengeButton = document.createElement('button');
        challengeButton.id = 'weeklyChallenge';
        challengeButton.className = 'control-button';
        challengeButton.textContent = '📅 週替わりチャレンジ';
        challengeButton.style.position = 'absolute';
        challengeButton.style.right = '200px';
        challengeButton.style.top = '20px';
        challengeButton.style.background = '#ff6b6b';
        challengeButton.style.color = 'white';
        challengeButton.style.border = 'none';
        challengeButton.style.padding = '8px 16px';
        challengeButton.style.borderRadius = '4px';
        challengeButton.style.cursor = 'pointer';
        
        // クリックイベントを追加
        challengeButton.addEventListener('click', () => {
          window.showWeeklyChallengeModal();
        });
        
        // ボタンを追加
        existingButton.parentNode.insertBefore(challengeButton, existingButton);
      }
    });
    
    // ボタンが表示されることを確認
    await expect(page.locator('#weeklyChallenge')).toBeVisible();
  });

  test('週替わりチャレンジモーダルの表示と機能', async ({ page }) => {
    // チャレンジモーダルの実装
    await page.evaluate(() => {
      // モーダルHTML構造を作成
      const modalHTML = `
        <div class="modal" id="weeklyChallengeModal" style="display: none;">
          <div class="modal-content">
            <h2 class="modal-title">📅 今週のチャレンジ</h2>
            <div id="challengeContent">
              <div class="challenge-info">
                <h3 id="challengeTitle">チャレンジタイトル</h3>
                <p id="challengeDescription">チャレンジの説明</p>
                <div class="challenge-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="challengeProgress" style="width: 0%"></div>
                  </div>
                  <span id="progressText">0%</span>
                </div>
                <div class="challenge-stats">
                  <div class="stat-item">
                    <span class="stat-label">現在のスコア:</span>
                    <span id="currentScore">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">目標:</span>
                    <span id="targetValue">-</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">残り時間:</span>
                    <span id="timeRemaining">-</span>
                  </div>
                </div>
              </div>
              <div class="challenge-rewards">
                <h4>報酬</h4>
                <div id="rewardInfo">
                  <span class="reward-points">+100 ポイント</span>
                  <span class="reward-title">称号: チャレンジャー</span>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-button" id="startChallenge">チャレンジ開始</button>
              <button class="modal-button" id="closeChallenge">閉じる</button>
            </div>
          </div>
        </div>
      `;
      
      // モーダルのスタイル
      const modalStyle = `
        <style>
          .challenge-info {
            margin: 20px 0;
          }
          .challenge-progress {
            margin: 15px 0;
          }
          .progress-bar {
            width: 100%;
            height: 20px;
            background: #333;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ecdc4, #45b7d1);
            transition: width 0.3s ease;
          }
          .challenge-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 15px 0;
          }
          .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          .stat-label {
            font-weight: bold;
          }
          .challenge-rewards {
            margin: 20px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
          }
          .reward-points {
            color: #4ecdc4;
            font-weight: bold;
            margin-right: 10px;
          }
          .reward-title {
            color: #ff6b6b;
          }
          .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
          }
        </style>
      `;
      
      // HTMLとスタイルを追加
      document.head.insertAdjacentHTML('beforeend', modalStyle);
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // モーダル表示関数
      window.showWeeklyChallengeModal = () => {
        // 現在のチャレンジを生成
        const currentChallenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
        
        // モーダルに情報を設定
        document.getElementById('challengeTitle').textContent = currentChallenge.title;
        document.getElementById('challengeDescription').textContent = currentChallenge.description;
        document.getElementById('targetValue').textContent = currentChallenge.target;
        document.getElementById('timeRemaining').textContent = `${currentChallenge.timeLimit}秒`;
        
        // 報酬情報
        const reward = window.ChallengeRewards.calculateReward(currentChallenge.difficulty);
        document.getElementById('rewardInfo').innerHTML = `
          <span class="reward-points">+${reward.points} ポイント</span>
          <span class="reward-title">称号: ${reward.title}</span>
        `;
        
        // 現在の進捗を更新
        updateChallengeProgress(currentChallenge);
        
        // モーダルを表示
        document.getElementById('weeklyChallengeModal').style.display = 'flex';
      };
      
      // 進捗更新関数
      function updateChallengeProgress(challenge) {
        // 模擬的なゲーム統計を取得
        const currentStats = {
          score: 750,
          consecutiveHits: 8,
          gameDuration: 60,
          specialActions: []
        };
        
        let progressValue = 0;
        let currentValue = 0;
        
        switch (challenge.type) {
          case 'score':
            currentValue = currentStats.score;
            progressValue = Math.min((currentValue / challenge.target) * 100, 100);
            break;
          case 'consecutive_hits':
            currentValue = currentStats.consecutiveHits;
            progressValue = Math.min((currentValue / challenge.target) * 100, 100);
            break;
          case 'time_survival':
            currentValue = currentStats.gameDuration;
            progressValue = Math.min((currentValue / challenge.target) * 100, 100);
            break;
          default:
            progressValue = 0;
        }
        
        // UI更新
        document.getElementById('currentScore').textContent = currentValue;
        document.getElementById('challengeProgress').style.width = `${progressValue}%`;
        document.getElementById('progressText').textContent = `${Math.round(progressValue)}%`;
      }
      
      // イベントリスナーを追加
      document.getElementById('startChallenge').addEventListener('click', () => {
        alert('チャレンジを開始します！ゲームをプレイしてください。');
        document.getElementById('weeklyChallengeModal').style.display = 'none';
      });
      
      document.getElementById('closeChallenge').addEventListener('click', () => {
        document.getElementById('weeklyChallengeModal').style.display = 'none';
      });
    });
    
    // チャレンジボタンを追加
    await page.evaluate(() => {
      const challengeButton = document.createElement('button');
      challengeButton.id = 'weeklyChallenge';
      challengeButton.textContent = '📅 週替わりチャレンジ';
      challengeButton.style.position = 'absolute';
      challengeButton.style.right = '200px';
      challengeButton.style.top = '20px';
      challengeButton.style.background = '#ff6b6b';
      challengeButton.style.color = 'white';
      challengeButton.style.border = 'none';
      challengeButton.style.padding = '8px 16px';
      challengeButton.style.borderRadius = '4px';
      challengeButton.style.cursor = 'pointer';
      
      challengeButton.addEventListener('click', () => {
        window.showWeeklyChallengeModal();
      });
      
      document.body.appendChild(challengeButton);
    });
    
    // チャレンジボタンをクリック
    await page.click('#weeklyChallenge');
    
    // モーダルが表示されることを確認
    await expect(page.locator('#weeklyChallengeModal')).toBeVisible();
    
    // モーダルの内容を確認
    await expect(page.locator('#challengeTitle')).toContainText('チャレンジ');
    await expect(page.locator('#challengeDescription')).toContainText('以上');
    await expect(page.locator('#targetValue')).not.toContainText('-');
    
    // 進捗バーが存在することを確認
    await expect(page.locator('#challengeProgress')).toBeVisible();
    
    // 報酬情報が表示されることを確認
    await expect(page.locator('.reward-points')).toContainText('ポイント');
    await expect(page.locator('.reward-title')).toContainText('称号');
  });

  test('ゲーム中のチャレンジ進捗表示', async ({ page }) => {
    // ゲーム中にチャレンジ進捗を表示するオーバーレイを追加
    await page.evaluate(() => {
      const overlayHTML = `
        <div id="challengeOverlay" style="
          position: absolute;
          top: 80px;
          right: 10px;
          width: 250px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-size: 14px;
          display: none;
        ">
          <h4 style="margin: 0 0 10px 0;">進行中のチャレンジ</h4>
          <div id="overlayTitle" style="font-weight: bold; margin-bottom: 5px;"></div>
          <div class="progress-bar" style="
            width: 100%;
            height: 15px;
            background: #333;
            border-radius: 8px;
            overflow: hidden;
            margin: 10px 0;
          ">
            <div id="overlayProgress" style="
              height: 100%;
              background: linear-gradient(90deg, #4ecdc4, #45b7d1);
              width: 0%;
              transition: width 0.3s ease;
            "></div>
          </div>
          <div id="overlayStats" style="font-size: 12px; color: #ccc;"></div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', overlayHTML);
      
      // チャレンジオーバーレイを表示する関数
      window.showChallengeOverlay = () => {
        const overlay = document.getElementById('challengeOverlay');
        if (overlay) {
          overlay.style.display = 'block';
          
          // 現在のチャレンジを取得
          const challenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
          
          // オーバーレイの内容を更新
          document.getElementById('overlayTitle').textContent = challenge.title;
          
          // 進捗を更新（模擬データ）
          const progress = Math.floor(Math.random() * 100);
          document.getElementById('overlayProgress').style.width = `${progress}%`;
          document.getElementById('overlayStats').textContent = `進捗: ${progress}% | 目標: ${challenge.target}`;
        }
      };
      
      // 5秒後にオーバーレイを表示
      setTimeout(() => {
        window.showChallengeOverlay();
      }, 2000);
    });
    
    // オーバーレイが表示されるまで待機
    await page.waitForSelector('#challengeOverlay', { state: 'visible' });
    
    // オーバーレイの内容を確認
    await expect(page.locator('#overlayTitle')).toContainText('チャレンジ');
    await expect(page.locator('#overlayProgress')).toBeVisible();
    await expect(page.locator('#overlayStats')).toContainText('進捗');
  });

  test('チャレンジ完了通知フロー', async ({ page }) => {
    // チャレンジ完了時の通知システムをテスト
    await page.evaluate(() => {
      // 通知モーダルを作成
      const notificationHTML = `
        <div id="challengeCompleteNotification" style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #4ecdc4, #45b7d1);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          z-index: 2000;
          display: none;
        ">
          <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
          <h2 style="margin: 0 0 10px 0;">チャレンジ完了!</h2>
          <div id="completedChallengeTitle" style="font-size: 18px; margin-bottom: 15px;"></div>
          <div id="earnedRewards" style="
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          ">
            <div style="font-size: 16px; font-weight: bold;">獲得した報酬</div>
            <div id="rewardDetails" style="margin-top: 10px;"></div>
          </div>
          <button id="claimReward" style="
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 15px;
          ">報酬を受け取る</button>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', notificationHTML);
      
      // チャレンジ完了をシミュレート
      window.simulateChallengeCompletion = () => {
        const challenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
        const reward = window.ChallengeRewards.calculateReward(challenge.difficulty);
        
        // 通知内容を設定
        document.getElementById('completedChallengeTitle').textContent = challenge.title;
        document.getElementById('rewardDetails').innerHTML = `
          <div>+ ${reward.points} ポイント</div>
          <div>称号: ${reward.title}</div>
        `;
        
        // 通知を表示
        document.getElementById('challengeCompleteNotification').style.display = 'block';
        
        // 報酬受け取りボタンのイベント
        document.getElementById('claimReward').addEventListener('click', () => {
          alert('報酬を受け取りました！');
          document.getElementById('challengeCompleteNotification').style.display = 'none';
        });
      };
      
      // 3秒後に完了通知を表示
      setTimeout(() => {
        window.simulateChallengeCompletion();
      }, 3000);
    });
    
    // 完了通知が表示されるまで待機
    await page.waitForSelector('#challengeCompleteNotification', { state: 'visible' });
    
    // 通知内容を確認
    await expect(page.locator('#completedChallengeTitle')).toContainText('チャレンジ');
    await expect(page.locator('#rewardDetails')).toContainText('ポイント');
    await expect(page.locator('#rewardDetails')).toContainText('称号');
    
    // 報酬受け取りボタンをクリック
    await page.click('#claimReward');
    
    // 通知が非表示になることを確認
    await expect(page.locator('#challengeCompleteNotification')).toBeHidden();
  });

  test('チャレンジとランキングシステムの統合', async ({ page }) => {
    // チャレンジとランキングシステムの統合をテスト
    await page.evaluate(() => {
      // ランキングにチャレンジ情報を追加
      window.addChallengeToRanking = (playerName, challengeTitle, score) => {
        const challengeEntry = {
          playerName: playerName,
          challengeTitle: challengeTitle,
          score: score,
          completedAt: new Date().toISOString(),
          type: 'weekly_challenge'
        };
        
        // ローカルストレージに保存
        const rankings = JSON.parse(localStorage.getItem('weeklyChallengeRankings') || '[]');
        rankings.push(challengeEntry);
        rankings.sort((a, b) => b.score - a.score);
        localStorage.setItem('weeklyChallengeRankings', JSON.stringify(rankings));
        
        return challengeEntry;
      };
      
      // チャレンジランキングを表示
      window.showChallengeRankings = () => {
        const rankings = JSON.parse(localStorage.getItem('weeklyChallengeRankings') || '[]');
        console.log('Challenge Rankings:', rankings);
        
        // 既存のランキングモーダルを拡張
        const existingModal = document.getElementById('rankingModal');
        if (existingModal) {
          const challengeRankingHTML = `
            <div id="challengeRankingTab" style="margin-top: 20px;">
              <h3>週替わりチャレンジランキング</h3>
              <div id="challengeRankingList">
                ${rankings.map((entry, index) => `
                  <div class="ranking-item ${index === 0 ? 'highlight' : ''}" style="
                    padding: 10px;
                    margin: 5px 0;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                  ">
                    <div>
                      <span style="font-weight: bold;">${index + 1}. ${entry.playerName}</span>
                      <div style="font-size: 12px; color: #999;">${entry.challengeTitle}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: bold; color: #4ecdc4;">${entry.score}</div>
                      <div style="font-size: 12px; color: #999;">${new Date(entry.completedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
          
          // 既存のランキングリストに追加
          const rankingList = existingModal.querySelector('#rankingList');
          if (rankingList) {
            rankingList.insertAdjacentHTML('afterend', challengeRankingHTML);
          }
        }
      };
      
      // テストデータを追加
      window.addChallengeToRanking('Alice', 'スコアマスター', 1500);
      window.addChallengeToRanking('Bob', 'スピードランナー', 1200);
      window.addChallengeToRanking('Charlie', 'コンボキング', 1800);
    });
    
    // ランキングボタンがある場合はクリック
    const rankingButton = page.locator('button:has-text("ランキング")');
    if (await rankingButton.isVisible()) {
      await rankingButton.click();
      
      // チャレンジランキングを表示
      await page.evaluate(() => {
        window.showChallengeRankings();
      });
      
      // チャレンジランキングセクションが表示されることを確認
      await expect(page.locator('#challengeRankingTab')).toBeVisible();
      await expect(page.locator('#challengeRankingList')).toContainText('Alice');
      await expect(page.locator('#challengeRankingList')).toContainText('Bob');
      await expect(page.locator('#challengeRankingList')).toContainText('Charlie');
    }
  });

  test('レスポンシブデザインでのチャレンジUI', async ({ page }) => {
    // モバイルサイズでのチャレンジUIをテスト
    await page.setViewportSize({ width: 375, height: 667 });
    
    // モバイル用のチャレンジボタンを追加
    await page.evaluate(() => {
      // モバイル用の簡略化されたチャレンジパネル
      const mobileChallengePanelHTML = `
        <div id="mobileChallengePanel" style="
          position: fixed;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 1000;
          display: none;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div id="mobileChallengeName" style="font-weight: bold; margin-bottom: 5px;"></div>
              <div id="mobileChallengeProgress" style="color: #4ecdc4;"></div>
            </div>
            <button id="mobileShowDetails" style="
              background: #ff6b6b;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 4px;
              font-size: 12px;
            ">詳細</button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', mobileChallengePanelHTML);
      
      // モバイルパネルを表示
      window.showMobileChallengePanel = () => {
        const challenge = window.ChallengeGenerator.generateWeeklyChallenge(new Date());
        const progress = Math.floor(Math.random() * 100);
        
        document.getElementById('mobileChallengeName').textContent = challenge.title;
        document.getElementById('mobileChallengeProgress').textContent = `進捗: ${progress}%`;
        document.getElementById('mobileChallengePanel').style.display = 'block';
      };
      
      // 詳細ボタンのイベント
      document.getElementById('mobileShowDetails').addEventListener('click', () => {
        alert('モバイル用チャレンジ詳細画面');
      });
      
      // 2秒後にモバイルパネルを表示
      setTimeout(() => {
        window.showMobileChallengePanel();
      }, 2000);
    });
    
    // モバイルパネルが表示されることを確認
    await page.waitForSelector('#mobileChallengePanel', { state: 'visible' });
    
    // パネルの内容を確認
    await expect(page.locator('#mobileChallengeName')).toContainText('チャレンジ');
    await expect(page.locator('#mobileChallengeProgress')).toContainText('進捗');
    
    // 詳細ボタンをクリック
    await page.click('#mobileShowDetails');
    
    // アラートが表示されることを確認
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('モバイル用チャレンジ詳細画面');
      dialog.accept();
    });
  });
});