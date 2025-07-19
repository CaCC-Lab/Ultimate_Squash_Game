import { RankingUI } from '../../docs/js/ranking-ui.js';

describe('RankingUI', () => {
  let container;
  let rankingUI;

  beforeEach(() => {
    // Create a clean DOM environment for each test
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'testContainer';
    document.body.appendChild(container);
    
    rankingUI = new RankingUI(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should initialize with container element', () => {
      expect(rankingUI.container).toBe(container);
    });

    test('should create ranking container structure', () => {
      expect(container.classList.contains('ranking-container')).toBe(true);
      expect(container.style.display).toBe('none');
    });

    test('should create period buttons', () => {
      const periodButtons = container.querySelectorAll('.period-btn');
      expect(periodButtons.length).toBe(4);
      
      const buttonTexts = Array.from(periodButtons).map(btn => btn.textContent.trim());
      expect(buttonTexts).toEqual(['日間', '週間', '月間', '全期間']);
    });

    test('should create game mode select', () => {
      const gameModeSelect = container.querySelector('.game-mode-select');
      expect(gameModeSelect).toBeTruthy();
      
      const options = Array.from(gameModeSelect.options);
      expect(options.length).toBe(4);
      expect(options.map(opt => opt.value)).toEqual(['all', 'normal', 'hard', 'expert']);
    });

    test('should create ranking list container', () => {
      const rankingList = container.querySelector('.ranking-list');
      expect(rankingList).toBeTruthy();
    });

    test('should create refresh button', () => {
      const refreshButton = container.querySelector('.refresh-button');
      expect(refreshButton).toBeTruthy();
    });

    test('should create close button', () => {
      const closeButton = container.querySelector('.close-button');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('show', () => {
    test('should make container visible', () => {
      rankingUI.show();
      
      expect(container.style.display).toBe('block');
    });

    test('should set active period to daily by default', () => {
      const dailyButton = container.querySelector('.period-btn[data-period="daily"]');
      expect(dailyButton.classList.contains('active')).toBe(true);
    });
  });

  describe('hide', () => {
    test('should hide container', () => {
      // First show the container
      rankingUI.show();
      
      // Then hide it
      rankingUI.hide();
      
      expect(container.style.display).toBe('none');
    });
  });

  describe('displayRankings', () => {
    const mockRankings = [
      { rank: 1, playerName: 'Player1', score: 1000, gameMode: 'normal' },
      { rank: 2, playerName: 'Player2', score: 900, gameMode: 'hard' },
      { rank: 3, playerName: 'Player3', score: 800, gameMode: 'expert' }
    ];

    test('should display rankings correctly', () => {
      rankingUI.displayRankings(mockRankings);
      
      const rankingList = container.querySelector('.ranking-list');
      const items = rankingList.querySelectorAll('.ranking-item');
      
      expect(items.length).toBe(3);
      
      // Check first item
      expect(items[0].textContent).toContain('#1');
      expect(items[0].textContent).toContain('Player1');
      expect(items[0].textContent).toContain('1,000');
    });

    test('should clear previous rankings', () => {
      // Add some initial rankings
      rankingUI.displayRankings(mockRankings);
      expect(container.querySelectorAll('.ranking-item').length).toBe(3);
      
      // Display new rankings
      const newRankings = [
        { rank: 1, playerName: 'NewPlayer', score: 1500, gameMode: 'normal' }
      ];
      rankingUI.displayRankings(newRankings);
      
      const items = container.querySelectorAll('.ranking-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('NewPlayer');
    });

    test('should handle empty rankings array', () => {
      rankingUI.displayRankings([]);
      
      const rankingList = container.querySelector('.ranking-list');
      const items = rankingList.querySelectorAll('.ranking-item');
      
      expect(items.length).toBe(0);
      expect(rankingList.textContent).toContain('ランキングデータがありません');
    });

    test('should remove loading state', () => {
      // Add loading state
      const rankingList = container.querySelector('.ranking-list');
      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.textContent = 'Loading...';
      rankingList.appendChild(loading);
      
      rankingUI.displayRankings(mockRankings);
      
      expect(rankingList.querySelector('.loading')).toBeFalsy();
    });
  });

  describe('displayError', () => {
    test('should display error message', () => {
      const errorMessage = 'データの読み込みに失敗しました';
      
      rankingUI.displayError(errorMessage);
      
      const rankingList = container.querySelector('.ranking-list');
      const errorElement = rankingList.querySelector('.error-message');
      
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain(errorMessage);
    });

    test('should remove loading state when showing error', () => {
      // Add loading state
      const rankingList = container.querySelector('.ranking-list');
      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.textContent = 'Loading...';
      rankingList.appendChild(loading);
      
      rankingUI.displayError('Error occurred');
      
      expect(rankingList.querySelector('.loading')).toBeFalsy();
    });

    test('should clear previous content when showing error', () => {
      // Add some rankings first
      const mockRankings = [
        { rank: 1, playerName: 'Player1', score: 1000, gameMode: 'normal' }
      ];
      rankingUI.displayRankings(mockRankings);
      
      // Then show error
      rankingUI.displayError('Error occurred');
      
      const rankingList = container.querySelector('.ranking-list');
      expect(rankingList.querySelectorAll('.ranking-item').length).toBe(0);
      expect(rankingList.querySelector('.error-message')).toBeTruthy();
    });
  });

  describe('event binding', () => {
    test('should handle period button clicks', () => {
      const mockCallback = jest.fn();
      rankingUI.onPeriodChange(mockCallback);
      
      const weeklyButton = container.querySelector('.period-btn[data-period="weekly"]');
      weeklyButton.click();
      
      expect(mockCallback).toHaveBeenCalledWith('weekly');
    });

    test('should handle game mode select change', () => {
      const mockCallback = jest.fn();
      rankingUI.onGameModeChange(mockCallback);
      
      const gameModeSelect = container.querySelector('.game-mode-select');
      gameModeSelect.value = 'hard';
      gameModeSelect.dispatchEvent(new Event('change'));
      
      expect(mockCallback).toHaveBeenCalledWith('hard');
    });

    test('should handle refresh button click', () => {
      const mockCallback = jest.fn();
      rankingUI.onRefresh(mockCallback);
      
      const refreshButton = container.querySelector('.refresh-button');
      refreshButton.click();
      
      expect(mockCallback).toHaveBeenCalled();
    });

    test('should handle close button click', () => {
      const mockCallback = jest.fn();
      rankingUI.onClose(mockCallback);
      
      const closeButton = container.querySelector('.close-button');
      closeButton.click();
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('getCurrentPeriod', () => {
    test('should return current period', () => {
      expect(rankingUI.getCurrentPeriod()).toBe('daily');
      
      // Click weekly button
      const weeklyButton = container.querySelector('.period-btn[data-period="weekly"]');
      
      // Simulate the active state change that would happen in the real UI
      container.querySelector('.period-btn.active').classList.remove('active');
      weeklyButton.classList.add('active');
      
      expect(rankingUI.getCurrentPeriod()).toBe('weekly');
    });
  });

  describe('getCurrentGameMode', () => {
    test('should return current game mode', () => {
      expect(rankingUI.getCurrentGameMode()).toBe('all');
      
      // Change game mode
      const gameModeSelect = container.querySelector('.game-mode-select');
      gameModeSelect.value = 'normal';
      gameModeSelect.dispatchEvent(new Event('change'));
      
      expect(rankingUI.getCurrentGameMode()).toBe('normal');
    });
  });

  describe('showLoading', () => {
    test('should show loading state', () => {
      rankingUI.showLoading();
      
      const rankingList = container.querySelector('.ranking-list');
      const loading = rankingList.querySelector('.loading');
      
      expect(loading).toBeTruthy();
      expect(loading.textContent).toContain('読み込み中');
    });

    test('should clear previous content when showing loading', () => {
      // Add some content first
      const mockRankings = [
        { rank: 1, playerName: 'Player1', score: 1000 }
      ];
      rankingUI.displayRankings(mockRankings);
      
      // Then show loading
      rankingUI.showLoading();
      
      const rankingList = container.querySelector('.ranking-list');
      expect(rankingList.querySelectorAll('.ranking-item').length).toBe(0);
      expect(rankingList.querySelector('.loading')).toBeTruthy();
    });
  });
});