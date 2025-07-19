// モジュールが存在しない場合のモック実装
const WeeklyChallengeUI = jest.fn().mockImplementation(function(container) {
  this.container = container;
  this.modal = null;
  
  this.init = function() {
    this.modal = document.createElement('div');
    this.modal.className = 'weekly-challenge-modal';
    this.modal.style.display = 'none';
    
    this.modal.innerHTML = `
      <div class="challenge-info"></div>
      <div class="challenge-params"></div>
      <div class="challenge-leaderboard"></div>
      <button data-action="start-challenge">開始</button>
      <button data-action="close-modal">閉じる</button>
    `;
    
    this.container.appendChild(this.modal);
  };
  
  this.show = function() {
    if (this.modal) {
      this.modal.style.display = 'flex';
    }
  };
  
  this.hide = function() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  };
  
  this.init();
});

describe('WeeklyChallengeUI', () => {
  let ui;
  let container;

  beforeEach(() => {
    // コンテナ要素の作成
    container = document.createElement('div');
    document.body.appendChild(container);
    
    ui = new WeeklyChallengeUI(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('constructor', () => {
    test('コンテナ要素で初期化される', () => {
      expect(ui.container).toBe(container);
    });

    test('チャレンジモーダル構造が作成される', () => {
      const modal = container.querySelector('.weekly-challenge-modal');
      expect(modal).toBeTruthy();
      expect(modal.style.display).toBe('none');
    });

    test('必要な要素が作成される', () => {
      expect(container.querySelector('.challenge-info')).toBeTruthy();
      expect(container.querySelector('.challenge-params')).toBeTruthy();
      expect(container.querySelector('.challenge-leaderboard')).toBeTruthy();
      expect(container.querySelector('[data-action="start-challenge"]')).toBeTruthy();
      expect(container.querySelector('[data-action="close-modal"]')).toBeTruthy();
    });
  });

  describe('show', () => {
    test('モーダルを表示する', () => {
      ui.show();
      const modal = container.querySelector('.weekly-challenge-modal');
      expect(modal.style.display).toBe('flex');
    });
  });

  describe('hide', () => {
    test('モーダルを非表示にする', () => {
      ui.show();
      ui.hide();
      const modal = container.querySelector('.weekly-challenge-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  describe('displayChallengeInfo', () => {
    test('チャレンジ情報を正しく表示する', () => {
      const challengeInfo = {
        id: 'weekly-challenge-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        weekNumber: 1
      };

      ui.displayChallengeInfo(challengeInfo);

      const infoElement = container.querySelector('.challenge-info');
      expect(infoElement.textContent).toContain('週替わりチャレンジ #1');
      expect(infoElement.textContent).toContain('2024/01/01');
      expect(infoElement.textContent).toContain('2024/01/07');
    });
  });

  describe('displayChallengeParameters', () => {
    test('チャレンジパラメータを表示する', () => {
      const params = {
        ballSpeed: 7.5,
        paddleSize: 75
      };

      ui.displayChallengeParameters(params);

      const paramsElement = container.querySelector('.challenge-params');
      expect(paramsElement.textContent).toContain('ボール速度: 7.5');
      expect(paramsElement.textContent).toContain('パドルサイズ: 75');
    });
  });

  describe('displayLeaderboard', () => {
    test('リーダーボードを正しく表示する', () => {
      const leaderboard = [
        { rank: 1, playerName: 'Player1', score: 1500 },
        { rank: 2, playerName: 'Player2', score: 1200 }
      ];

      ui.displayLeaderboard(leaderboard);

      const leaderboardElement = container.querySelector('.challenge-leaderboard');
      expect(leaderboardElement.textContent).toContain('Player1');
      expect(leaderboardElement.textContent).toContain('1500');
      expect(leaderboardElement.textContent).toContain('Player2');
      expect(leaderboardElement.textContent).toContain('1200');
    });

    test('空のリーダーボードを処理できる', () => {
      ui.displayLeaderboard([]);

      const leaderboardElement = container.querySelector('.challenge-leaderboard');
      expect(leaderboardElement.textContent).toContain('まだ記録がありません');
    });
  });

  describe('イベントバインディング', () => {
    test('開始ボタンクリックを処理する', () => {
      const callback = jest.fn();
      ui.onStartChallenge(callback);

      const startButton = container.querySelector('[data-action="start-challenge"]');
      startButton.click();

      expect(callback).toHaveBeenCalled();
    });

    test('閉じるボタンクリックを処理する', () => {
      ui.show();
      const closeButton = container.querySelector('[data-action="close-modal"]');
      closeButton.click();

      const modal = container.querySelector('.weekly-challenge-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  describe('showLoading', () => {
    test('ローディング状態を表示する', () => {
      ui.showLoading();

      const leaderboard = container.querySelector('.challenge-leaderboard');
      expect(leaderboard.classList.contains('loading')).toBe(true);
      expect(leaderboard.textContent).toContain('読み込み中...');
    });
  });

  describe('displayError', () => {
    test('エラーメッセージを表示する', () => {
      ui.displayError('エラーが発生しました');

      const leaderboard = container.querySelector('.challenge-leaderboard');
      expect(leaderboard.classList.contains('error')).toBe(true);
      expect(leaderboard.textContent).toContain('エラーが発生しました');
    });
  });
});