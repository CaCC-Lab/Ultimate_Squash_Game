// 完全なゲームフローのE2Eテスト
const { test, expect } = require('@playwright/test');

test.describe('Complete Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のローカルサーバーを想定
    await page.goto('http://localhost:8080/docs/game.html');

    // 初期化を待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // WebSocket接続を待つ
  });

  test('ゲーム開始から終了までの完全なフロー', async ({ page }) => {
    // 1. WebSocket接続状態を確認
    const connectionStatus = await page.locator('#connectionStatus').textContent();
    expect(['connected', 'disconnected']).toContain(connectionStatus);

    // 2. チャレンジボタンの存在確認
    const challengeButton = page.locator('#challengeButton');
    await expect(challengeButton).toBeVisible();

    // 3. チャレンジボタンをクリック
    await challengeButton.click();

    // 4. チャレンジ詳細が表示されることを確認
    const challengeDetails = page.locator('#challengeDetails');
    await expect(challengeDetails).toBeVisible({ timeout: 5000 });

    // チャレンジ内容の確認
    const challengeTitle = await page.locator('#challengeTitle').textContent();
    expect(challengeTitle).toBeTruthy();

    const challengeDescription = await page.locator('#challengeDescription').textContent();
    expect(challengeDescription).not.toContain('NaN');
    expect(challengeDescription).toBeTruthy();

    // 5. ゲームを開始
    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 6. ゲームキャンバスが表示される
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 7. ゲームプレイのシミュレーション
    // キーボード入力でパドルを操作
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    // 8. スコアが更新されることを確認
    const scoreElement = page.locator('#score');
    await page.waitForFunction(
      el => parseInt(el.textContent) > 0,
      scoreElement.elementHandle(),
      { timeout: 10000 }
    );

    // 9. サウンド再生の確認（コンソールログで確認）
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Playing sound')) {
        consoleLogs.push(msg.text());
      }
    });

    // ゲームを一定時間プレイ
    await page.waitForTimeout(5000);

    // 10. ゲームオーバーまで待つ（最大30秒）
    await page.waitForFunction(
      () => document.querySelector('#gameOverModal')?.style.display !== 'none',
      { timeout: 30000 }
    );

    // 11. ゲームオーバー画面の確認
    const gameOverModal = page.locator('#gameOverModal');
    await expect(gameOverModal).toBeVisible();

    // 最終スコアの確認
    const finalScore = await page.locator('#finalScore').textContent();
    expect(parseInt(finalScore)).toBeGreaterThan(0);

    // 12. チャレンジ結果の確認
    const challengeResult = await page.locator('#challengeResult').textContent();
    expect(['達成', '未達成', 'Success', 'Failed']).toContain(challengeResult);
  });

  test('ミュート機能が全フローで正しく動作する', async ({ page }) => {
    // ミュートボタンを探す
    const muteButton = page.locator('#muteButton, button[aria-label="Mute"]');
    await expect(muteButton).toBeVisible();

    // ミュートをオンにする
    await muteButton.click();

    // ゲームを開始
    const startButton = page.locator('#startButton');
    await startButton.click();

    // コンソールログを監視
    let soundPlayedWhileMuted = false;
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Playing sound') &&
          !msg.text().includes('muted')) {
        soundPlayedWhileMuted = true;
      }
    });

    // ゲームをプレイ
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);

    // ミュート中にサウンドが再生されないことを確認
    expect(soundPlayedWhileMuted).toBe(false);

    // ミュートを解除
    await muteButton.click();

    // サウンドが再生されることを確認
    let soundPlayedAfterUnmute = false;
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Playing sound')) {
        soundPlayedAfterUnmute = true;
      }
    });

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(1000);

    expect(soundPlayedAfterUnmute).toBe(true);
  });

  test('チャレンジの進捗が正しく追跡される', async ({ page }) => {
    // チャレンジを開始
    await page.locator('#challengeButton').click();
    await page.waitForSelector('#challengeDetails');

    // チャレンジタイプを取得
    const challengeType = await page.evaluate(() => {
      return window.challengeManager?.currentChallenge?.type;
    });

    // ゲームを開始
    await page.locator('#startButton').click();

    // チャレンジタイプに応じた進捗確認
    if (challengeType === 'score') {
      // スコアチャレンジの進捗確認
      const progressBar = page.locator('#challengeProgress');
      await expect(progressBar).toBeVisible();

      // スコアが増えるとプログレスバーが更新される
      await page.waitForFunction(
        el => parseInt(el.style.width) > 0,
        progressBar.elementHandle(),
        { timeout: 10000 }
      );
    } else if (challengeType === 'consecutive_hits') {
      // 連続ヒットチャレンジの進捗確認
      const hitCounter = page.locator('#consecutiveHits');
      await expect(hitCounter).toBeVisible();

      // ヒット数が増える
      await page.waitForFunction(
        el => parseInt(el.textContent) > 0,
        hitCounter.elementHandle(),
        { timeout: 10000 }
      );
    }
  });

  test('複数のチャレンジを連続して実行できる', async ({ page }) => {
    // 最初のチャレンジ
    await page.locator('#challengeButton').click();
    await page.waitForSelector('#challengeDetails');

    const firstChallengeTitle = await page.locator('#challengeTitle').textContent();

    // ゲームを開始して即座に終了
    await page.locator('#startButton').click();
    await page.waitForTimeout(2000);

    // ゲームを強制終了（ESCキー）
    await page.keyboard.press('Escape');

    // ゲームオーバー画面を閉じる
    const closeButton = page.locator('#closeGameOverModal, .close-button');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // 2回目のチャレンジ
    await page.locator('#challengeButton').click();
    await page.waitForSelector('#challengeDetails');

    const secondChallengeTitle = await page.locator('#challengeTitle').textContent();

    // 同じ週内なら同じチャレンジになるはず
    expect(secondChallengeTitle).toBe(firstChallengeTitle);
  });
});

test.describe('Error Recovery Flow', () => {
  test('WebSocket接続失敗からのリカバリー', async ({ page, context }) => {
    // WebSocketをブロック
    await context.route('ws://localhost:8765', route => {
      route.abort();
    });

    await page.goto('http://localhost:8080/docs/game.html');
    await page.waitForTimeout(2000);

    // オフラインモードでも機能することを確認
    const connectionStatus = await page.locator('#connectionStatus').textContent();
    expect(connectionStatus).toBe('disconnected');

    // チャレンジ機能が使えることを確認
    const challengeButton = page.locator('#challengeButton');
    await expect(challengeButton).toBeVisible();
    await expect(challengeButton).toBeEnabled();

    await challengeButton.click();

    // オフラインでもチャレンジが生成される
    const challengeDetails = page.locator('#challengeDetails');
    await expect(challengeDetails).toBeVisible();
  });

  test('ゲーム中のネットワーク切断からの復帰', async ({ page, context }) => {
    await page.goto('http://localhost:8080/docs/game.html');
    await page.waitForTimeout(1000);

    // ゲームを開始
    await page.locator('#challengeButton').click();
    await page.waitForSelector('#challengeDetails');
    await page.locator('#startButton').click();

    // ゲーム中にWebSocketを切断
    await context.route('ws://localhost:8765', route => {
      route.abort();
    });

    // ゲームが継続することを確認
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // キー入力が引き続き機能する
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');

    // スコアが更新され続ける
    const scoreElement = page.locator('#score');
    const initialScore = parseInt(await scoreElement.textContent());

    await page.waitForFunction(
      (el, initScore) => parseInt(el.textContent) > initScore,
      scoreElement.elementHandle(),
      initialScore,
      { timeout: 10000 }
    );
  });

  test('無効なチャレンジデータからのリカバリー', async ({ page }) => {
    await page.goto('http://localhost:8080/docs/game.html');

    // 無効なチャレンジデータを注入
    await page.evaluate(() => {
      window.challengeManager = {
        currentChallenge: {
          type: 'invalid_type',
          target: 'not_a_number',
          description: null
        }
      };
    });

    // エラーが発生してもクラッシュしない
    const startButton = page.locator('#startButton');
    await startButton.click();

    // ゲームが開始される
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // エラーメッセージが表示される可能性
    const errorMessage = page.locator('.error-message, #errorMessage');
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('チャレンジ');
    }
  });
});
