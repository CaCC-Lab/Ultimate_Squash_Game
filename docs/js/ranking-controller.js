export class RankingController {
  constructor(rankingApi, rankingUI) {
    this.api = rankingApi;
    this.ui = rankingUI;
    this.currentPeriod = 'daily';
    this.currentGameMode = 'all';
    
    this._setupEventHandlers();
    
    // Set UI controller reference
    this.ui.controller = this;
  }

  _setupEventHandlers() {
    this.ui.onPeriodChange((period) => {
      this.changePeriod(period);
    });

    this.ui.onGameModeChange((gameMode) => {
      this.changeGameMode(gameMode);
    });

    this.ui.onRefresh(() => {
      this.refreshRankings();
    });

    this.ui.onClose(() => {
      this.ui.hide();
    });
  }

  async loadRankings(period = null, gameMode = null, limit = 10) {
    const selectedPeriod = period || this.currentPeriod;
    const selectedGameMode = gameMode || this.currentGameMode;
    
    try {
      this.ui.showLoading();
      const rankings = await this.api.fetchRankings(selectedPeriod, selectedGameMode, limit);
      this.ui.displayRankings(rankings || []);
    } catch (error) {
      console.error('Error loading rankings:', error);
      this.ui.displayError('ランキングの読み込みに失敗しました');
    }
  }

  async submitScore(playerName, score, gameMode, duration) {
    try {
      const gameData = {
        playerName: playerName,
        score: score,
        gameMode: gameMode,
        duration: duration,
        timestamp: Date.now()
      };

      const gameHash = await this.api.generateGameHash(gameData);
      const result = await this.api.submitScore(gameData, gameHash);
      
      return result;
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }

  async showRanking() {
    // Update current state from UI
    this.currentPeriod = this.ui.getCurrentPeriod();
    this.currentGameMode = this.ui.getCurrentGameMode();
    
    this.ui.show();
  }

  async refreshRankings() {
    await this.loadRankings();
  }

  async changePeriod(period) {
    this.currentPeriod = period;
    await this.loadRankings();
  }

  async changeGameMode(gameMode) {
    this.currentGameMode = gameMode;
    await this.loadRankings();
  }
}