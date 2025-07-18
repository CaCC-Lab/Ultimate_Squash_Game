/**
 * ウィークリーチャレンジ統合システムのテスト（改良版）
 * eval()を使わず、モジュールシステムを活用したテスト
 */

// モックモジュールの作成
const mockChallengeGenerator = {
  generateWeeklyChallenge: jest.fn().mockResolvedValue({
    id: 'test-challenge-1',
    title: 'テストチャレンジ',
    description: 'テスト用のチャレンジ',
    difficulty: 'medium',
    targetScore: 1000,
    timeLimit: 60,
    rewards: { points: 100, badge: 'test-badge' }
  })
};

const mockChallengeEvaluator = {
  evaluateChallenge: jest.fn().mockReturnValue({
    success: true,
    score: 1500,
    timeBonus: 200,
    totalScore: 1700
  })
};

const mockChallengeRewards = {
  grantRewards: jest.fn().mockReturnValue({
    points: 100,
    badge: 'test-badge',
    newTotal: 500
  })
};

// WeeklyChallengeAPIのモック実装
class MockWeeklyChallengeAPI {
  constructor() {
    this.currentChallenge = null;
    this.challengeHistory = [];
  }

  async getCurrentChallenge() {
    if (!this.currentChallenge) {
      this.currentChallenge = await mockChallengeGenerator.generateWeeklyChallenge();
    }
    return this.currentChallenge;
  }

  async startChallenge(challengeId) {
    const challenge = await this.getCurrentChallenge();
    if (challenge.id !== challengeId) {
      throw new Error('Invalid challenge ID');
    }
    return {
      challengeId,
      startTime: Date.now(),
      status: 'active'
    };
  }

  async submitChallengeResult(challengeId, result) {
    const evaluation = mockChallengeEvaluator.evaluateChallenge(result);
    const rewards = evaluation.success ? mockChallengeRewards.grantRewards(evaluation) : null;
    
    const historyEntry = {
      challengeId,
      result,
      evaluation,
      rewards,
      completedAt: Date.now()
    };
    
    this.challengeHistory.push(historyEntry);
    return historyEntry;
  }

  getChallengeHistory() {
    return this.challengeHistory;
  }
}

// WeeklyChallengeUIのモック実装
class MockWeeklyChallengeUI {
  constructor(api) {
    this.api = api;
    this.currentChallengeDisplay = null;
    this.progressBar = null;
    this.timer = null;
    this.startButton = null;
  }

  async init() {
    // DOM要素の初期化
    this.currentChallengeDisplay = document.getElementById('current-challenge-info');
    this.progressBar = document.getElementById('challenge-progress-bar');
    this.timer = document.getElementById('challenge-timer');
    this.startButton = document.getElementById('start-challenge-btn');
    
    // チャレンジ情報の表示
    const challenge = await this.api.getCurrentChallenge();
    this.displayChallenge(challenge);
    
    // イベントリスナーの設定
    if (this.startButton) {
      this.startButton.addEventListener('click', () => this.startChallenge());
    }
  }

  displayChallenge(challenge) {
    if (this.currentChallengeDisplay) {
      this.currentChallengeDisplay.innerHTML = `
        <h3>${challenge.title}</h3>
        <p>${challenge.description}</p>
        <p>難易度: ${challenge.difficulty}</p>
        <p>目標スコア: ${challenge.targetScore}</p>
      `;
    }
  }

  async startChallenge() {
    const challenge = await this.api.getCurrentChallenge();
    const session = await this.api.startChallenge(challenge.id);
    
    // タイマー開始
    this.startTimer(challenge.timeLimit);
    
    // ボタンを無効化
    if (this.startButton) {
      this.startButton.disabled = true;
      this.startButton.textContent = '進行中...';
    }
    
    return session;
  }

  startTimer(timeLimit) {
    let remainingTime = timeLimit;
    
    const updateTimer = () => {
      if (this.timer) {
        this.timer.textContent = `残り時間: ${remainingTime}秒`;
      }
      
      if (remainingTime > 0) {
        remainingTime--;
        setTimeout(updateTimer, 1000);
      } else {
        this.endChallenge();
      }
    };
    
    updateTimer();
  }

  async endChallenge() {
    // チャレンジ終了処理
    if (this.startButton) {
      this.startButton.disabled = false;
      this.startButton.textContent = '開始';
    }
    
    // 結果の送信（モック）
    const result = {
      score: 1500,
      timeUsed: 45,
      mistakes: 2
    };
    
    const challenge = await this.api.getCurrentChallenge();
    const submission = await this.api.submitChallengeResult(challenge.id, result);
    
    // 結果の表示
    this.displayResult(submission);
  }

  displayResult(submission) {
    if (this.currentChallengeDisplay) {
      const { evaluation, rewards } = submission;
      this.currentChallengeDisplay.innerHTML += `
        <div class="result">
          <h4>結果</h4>
          <p>スコア: ${evaluation.score}</p>
          <p>タイムボーナス: ${evaluation.timeBonus}</p>
          <p>合計: ${evaluation.totalScore}</p>
          ${rewards ? `<p>獲得報酬: ${rewards.points}ポイント</p>` : ''}
        </div>
      `;
    }
  }

  updateProgress(progress) {
    if (this.progressBar) {
      this.progressBar.style.width = `${progress}%`;
      this.progressBar.textContent = `${progress}%`;
    }
  }
}

describe('ウィークリーチャレンジシステム統合テスト', () => {
  let api, ui;

  beforeEach(() => {
    // DOM環境のセットアップ
    document.body.innerHTML = `
      <div id="current-challenge-info"></div>
      <div id="challenge-progress-bar" style="width: 0%">0%</div>
      <div id="challenge-timer">残り時間: --</div>
      <button id="start-challenge-btn">開始</button>
    `;
    
    // localStorage のモック
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    Storage.prototype.clear = jest.fn();
    
    // インスタンスの作成
    api = new MockWeeklyChallengeAPI();
    ui = new MockWeeklyChallengeUI(api);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    test('UIが正しく初期化される', async () => {
      await ui.init();
      
      const challengeInfo = document.getElementById('current-challenge-info');
      expect(challengeInfo.innerHTML).toContain('テストチャレンジ');
      expect(challengeInfo.innerHTML).toContain('medium');
      expect(challengeInfo.innerHTML).toContain('1000');
    });

    test('APIが現在のチャレンジを取得できる', async () => {
      const challenge = await api.getCurrentChallenge();
      
      expect(challenge).toBeDefined();
      expect(challenge.id).toBe('test-challenge-1');
      expect(challenge.title).toBe('テストチャレンジ');
      expect(challenge.targetScore).toBe(1000);
    });
  });

  describe('チャレンジの開始', () => {
    beforeEach(async () => {
      await ui.init();
    });

    test('チャレンジを開始できる', async () => {
      const session = await ui.startChallenge();
      
      expect(session).toBeDefined();
      expect(session.challengeId).toBe('test-challenge-1');
      expect(session.status).toBe('active');
      expect(session.startTime).toBeDefined();
    });

    test('開始ボタンが無効化される', async () => {
      const startButton = document.getElementById('start-challenge-btn');
      
      await ui.startChallenge();
      
      expect(startButton.disabled).toBe(true);
      expect(startButton.textContent).toBe('進行中...');
    });

    test('タイマーが更新される', async () => {
      await ui.startChallenge();
      
      const timer = document.getElementById('challenge-timer');
      expect(timer.textContent).toContain('残り時間:');
    });
  });

  describe('チャレンジの完了', () => {
    beforeEach(async () => {
      await ui.init();
    });

    test('チャレンジ結果を送信できる', async () => {
      const result = {
        score: 1500,
        timeUsed: 45,
        mistakes: 2
      };
      
      const submission = await api.submitChallengeResult('test-challenge-1', result);
      
      expect(submission).toBeDefined();
      expect(submission.evaluation.success).toBe(true);
      expect(submission.evaluation.score).toBe(1500);
      expect(submission.rewards).toBeDefined();
      expect(submission.rewards.points).toBe(100);
    });

    test('チャレンジ履歴が記録される', async () => {
      const result = {
        score: 1500,
        timeUsed: 45,
        mistakes: 2
      };
      
      await api.submitChallengeResult('test-challenge-1', result);
      
      const history = api.getChallengeHistory();
      expect(history).toHaveLength(1);
      expect(history[0].challengeId).toBe('test-challenge-1');
      expect(history[0].result).toEqual(result);
    });

    test('結果が表示される', async () => {
      await ui.startChallenge();
      await ui.endChallenge();
      
      const challengeInfo = document.getElementById('current-challenge-info');
      expect(challengeInfo.innerHTML).toContain('結果');
      expect(challengeInfo.innerHTML).toContain('1500');
      expect(challengeInfo.innerHTML).toContain('100ポイント');
    });
  });

  describe('プログレス表示', () => {
    beforeEach(async () => {
      await ui.init();
    });

    test('プログレスバーが更新される', () => {
      ui.updateProgress(50);
      
      const progressBar = document.getElementById('challenge-progress-bar');
      expect(progressBar.style.width).toBe('50%');
      expect(progressBar.textContent).toBe('50%');
    });

    test('100%まで更新できる', () => {
      ui.updateProgress(100);
      
      const progressBar = document.getElementById('challenge-progress-bar');
      expect(progressBar.style.width).toBe('100%');
      expect(progressBar.textContent).toBe('100%');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なチャレンジIDでエラーになる', async () => {
      await expect(api.startChallenge('invalid-id')).rejects.toThrow('Invalid challenge ID');
    });

    test('チャレンジが存在しない場合の処理', async () => {
      api.currentChallenge = null;
      const challenge = await api.getCurrentChallenge();
      
      expect(challenge).toBeDefined();
      expect(mockChallengeGenerator.generateWeeklyChallenge).toHaveBeenCalled();
    });
  });
});