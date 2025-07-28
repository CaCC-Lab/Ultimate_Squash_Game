export class RankingUI {
  constructor(container) {
    this.container = container;
    this.container.style.display = 'none';
    this.container.classList.add('ranking-container');

    this._createUI();
    this._addStyles();
    this._setupEventListeners();

    this.callbacks = {
      onPeriodChange: null,
      onGameModeChange: null,
      onRefresh: null,
      onClose: null
    };
  }

  _createUI() {
    this.container.innerHTML = `
            <div class="ranking-header">
                <h2>🏆 オンラインランキング</h2>
                <button class="close-button">✖</button>
            </div>
            
            <div class="ranking-controls">
                <div class="period-selector">
                    <button class="period-btn active" data-period="daily">日間</button>
                    <button class="period-btn" data-period="weekly">週間</button>
                    <button class="period-btn" data-period="monthly">月間</button>
                    <button class="period-btn" data-period="allTime">全期間</button>
                </div>
                
                <div class="mode-selector">
                    <select class="game-mode-select">
                        <option value="all">すべて</option>
                        <option value="normal">ノーマル</option>
                        <option value="hard">ハード</option>
                        <option value="expert">エキスパート</option>
                    </select>
                </div>
            </div>
            
            <div class="ranking-list">
                <div class="loading">読み込み中...</div>
            </div>
            
            <div class="ranking-footer">
                <button class="refresh-button">
                    🔄 更新
                </button>
            </div>
        `;

    this.rankingList = this.container.querySelector('.ranking-list');
    this.periodButtons = this.container.querySelectorAll('.period-btn');
    this.gameModeSelect = this.container.querySelector('.game-mode-select');
    this.refreshButton = this.container.querySelector('.refresh-button');
    this.closeButton = this.container.querySelector('.close-button');
  }

  _addStyles() {
    const styleId = 'ranking-ui-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
            .ranking-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #004274;
                border-radius: 10px;
                padding: 20px;
                color: white;
                font-family: 'Courier New', monospace;
                z-index: 1000;
                overflow-y: auto;
                box-sizing: border-box;
            }
            
            .ranking-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #004274;
            }
            
            .ranking-header h2 {
                margin: 0;
                color: #00ff00;
                font-size: 24px;
            }
            
            .close-button {
                background: none;
                border: none;
                color: #ff0000;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .ranking-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .period-selector {
                display: flex;
                gap: 10px;
            }
            
            .period-btn {
                background: #004274;
                border: 1px solid #0066aa;
                color: white;
                padding: 8px 16px;
                cursor: pointer;
                font-family: inherit;
                border-radius: 5px;
                transition: background 0.3s;
            }
            
            .period-btn:hover {
                background: #0066aa;
            }
            
            .period-btn.active {
                background: #00ff00;
                color: #000;
            }
            
            .game-mode-select {
                background: #004274;
                border: 1px solid #0066aa;
                color: white;
                padding: 8px 16px;
                font-family: inherit;
                border-radius: 5px;
                cursor: pointer;
            }
            
            .ranking-list {
                min-height: 300px;
                margin-bottom: 20px;
            }
            
            .ranking-item {
                display: grid;
                grid-template-columns: 50px 1fr 100px 100px;
                gap: 10px;
                padding: 10px;
                border-bottom: 1px solid #333;
                align-items: center;
            }
            
            .ranking-item:hover {
                background: rgba(0, 66, 116, 0.3);
            }
            
            .rank-number {
                font-size: 20px;
                font-weight: bold;
                text-align: center;
            }
            
            .rank-1 { color: #ffd700; }
            .rank-2 { color: #c0c0c0; }
            .rank-3 { color: #cd7f32; }
            
            .player-name {
                font-size: 16px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .player-score {
                font-size: 18px;
                text-align: right;
                color: #00ff00;
            }
            
            .player-mode {
                font-size: 14px;
                text-align: right;
                color: #888;
            }
            
            .loading, .error-message, .no-data {
                text-align: center;
                padding: 50px;
                color: #888;
            }
            
            .refresh-button {
                background: #004274;
                border: 1px solid #0066aa;
                color: white;
                padding: 10px 20px;
                cursor: pointer;
                font-family: inherit;
                border-radius: 5px;
                width: 100%;
                font-size: 16px;
                transition: background 0.3s;
            }
            
            .refresh-button:hover {
                background: #0066aa;
            }
            
            @media (max-width: 600px) {
                .ranking-container {
                    width: 95%;
                    padding: 15px;
                }
                
                .period-selector {
                    flex-wrap: wrap;
                }
                
                .period-btn {
                    padding: 6px 12px;
                    font-size: 14px;
                }
                
                .ranking-item {
                    grid-template-columns: 40px 1fr 80px;
                    font-size: 14px;
                }
                
                .player-mode {
                    display: none;
                }
            }
        `;
    document.head.appendChild(style);
  }

  _setupEventListeners() {
    this.periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.callbacks.onPeriodChange) {
          this.callbacks.onPeriodChange(e.target.dataset.period);
        }
      });
    });

    this.gameModeSelect.addEventListener('change', (e) => {
      if (this.callbacks.onGameModeChange) {
        this.callbacks.onGameModeChange(e.target.value);
      }
    });

    this.refreshButton.addEventListener('click', () => {
      if (this.callbacks.onRefresh) {
        this.callbacks.onRefresh();
      }
    });

    this.closeButton.addEventListener('click', () => {
      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }
    });
  }

  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }

  showLoading() {
    this.rankingList.innerHTML = '<div class="loading">読み込み中...</div>';
  }

  hideLoading() {
    // It's assumed that displayRankings or displayError will replace the loading indicator.
  }

  displayRankings(rankings) {
    if (!rankings || rankings.length === 0) {
      this.rankingList.innerHTML = '<div class="no-data">ランキングデータがありません</div>';
      return;
    }

    this.rankingList.innerHTML = rankings.map(item => `
            <div class="ranking-item">
                <div class="rank-number rank-${item.rank || ''}">${item.rank ? `#${item.rank}` : '-'}</div>
                <div class="player-name">${this._escapeHtml(item.playerName)}</div>
                <div class="player-score">${item.score.toLocaleString()}</div>
                <div class="player-mode">${this._getGameModeLabel(item.gameMode)}</div>
            </div>
        `).join('');
  }

  displayError(message) {
    this.rankingList.innerHTML = `<div class="error-message">${this._escapeHtml(message)}</div>`;
  }

  setPeriod(period) {
    this.periodButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
  }

  setGameMode(gameMode) {
    this.gameModeSelect.value = gameMode;
  }

  onPeriodChange(callback) {
    this.callbacks.onPeriodChange = callback;
  }

  onGameModeChange(callback) {
    this.callbacks.onGameModeChange = callback;
  }

  onRefresh(callback) {
    this.callbacks.onRefresh = callback;
  }

  onClose(callback) {
    this.callbacks.onClose = callback;
  }

  _escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _getGameModeLabel(mode) {
    const labels = {
      'normal': 'ノーマル',
      'hard': 'ハード',
      'expert': 'エキスパート'
    };
    return labels[mode] || mode;
  }

  // テストで使用する現在の期間を取得
  getCurrentPeriod() {
    const activeBtn = this.container.querySelector('.period-btn.active');
    return activeBtn ? activeBtn.dataset.period : 'daily';
  }

  // テストで使用する現在のゲームモードを取得
  getCurrentGameMode() {
    return this.gameModeSelect.value;
  }
}
