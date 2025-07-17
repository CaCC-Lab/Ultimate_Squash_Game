// Ultimate Squash Game - ランキングシステム
class RankingSystem {
    constructor() {
        this.apiBaseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}/api/scores`
            : '/api/scores'; // ローカル開発用
        
        this.currentPeriod = 'daily';
        this.currentGameMode = 'all';
        this.rankings = {
            daily: [],
            weekly: [],
            monthly: [],
            allTime: []
        };
        
        this.secretKey = 'default-secret-key-change-in-production'; // 本番環境では環境変数から取得
    }
    
    // ゲームハッシュの生成
    async generateGameHash(gameData) {
        const { playerName, score, gameMode, duration, timestamp } = gameData;
        const dataString = `${playerName}:${score}:${gameMode}:${duration}:${timestamp}`;
        
        // Web Crypto APIを使用したHMAC生成
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.secretKey),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', key, data);
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    }
    
    // スコアの送信
    async submitScore(playerName, score, gameMode, duration) {
        try {
            const timestamp = Date.now();
            const gameData = {
                playerName,
                score,
                gameMode,
                duration,
                timestamp
            };
            
            const gameHash = await this.generateGameHash(gameData);
            
            const response = await fetch(`${this.apiBaseUrl}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameData,
                    gameHash
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'スコア送信に失敗しました');
            }
            
            const result = await response.json();
            console.log('Score submitted successfully:', result);
            
            // 送信成功後、ランキングを更新
            await this.fetchRankings(this.currentPeriod, this.currentGameMode);
            
            return result;
        } catch (error) {
            console.error('Error submitting score:', error);
            throw error;
        }
    }
    
    // ランキングの取得
    async fetchRankings(period = 'daily', gameMode = 'all') {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/get?period=${period}&gameMode=${gameMode}&limit=10`
            );
            
            if (!response.ok) {
                throw new Error('ランキング取得に失敗しました');
            }
            
            const data = await response.json();
            this.rankings[period] = data.rankings;
            this.currentPeriod = period;
            this.currentGameMode = gameMode;
            
            return data.rankings;
        } catch (error) {
            console.error('Error fetching rankings:', error);
            // エラー時はモックデータを返す
            return this.getMockRankings(period, gameMode);
        }
    }
    
    // モックランキングデータ（オフライン時用）
    getMockRankings(period, gameMode) {
        const mockData = {
            daily: [
                { rank: 1, playerName: 'Player1', score: 1000, gameMode: 'normal' },
                { rank: 2, playerName: 'Player2', score: 900, gameMode: 'hard' },
                { rank: 3, playerName: 'Player3', score: 800, gameMode: 'expert' }
            ],
            weekly: [
                { rank: 1, playerName: 'Champion', score: 5000, gameMode: 'expert' },
                { rank: 2, playerName: 'Master', score: 4500, gameMode: 'hard' },
                { rank: 3, playerName: 'Expert', score: 4000, gameMode: 'normal' }
            ],
            monthly: [
                { rank: 1, playerName: 'Legend', score: 20000, gameMode: 'expert' },
                { rank: 2, playerName: 'Hero', score: 18000, gameMode: 'expert' },
                { rank: 3, playerName: 'Star', score: 16000, gameMode: 'hard' }
            ],
            allTime: [
                { rank: 1, playerName: 'God', score: 99999, gameMode: 'expert' },
                { rank: 2, playerName: 'Titan', score: 80000, gameMode: 'expert' },
                { rank: 3, playerName: 'Giant', score: 70000, gameMode: 'hard' }
            ]
        };
        
        const rankings = mockData[period] || [];
        if (gameMode === 'all') {
            return rankings;
        } else {
            return rankings.filter(r => r.gameMode === gameMode);
        }
    }
    
    // ランキングUIの作成
    createRankingUI() {
        const rankingContainer = document.createElement('div');
        rankingContainer.id = 'rankingContainer';
        rankingContainer.className = 'ranking-container';
        rankingContainer.style.display = 'none';
        
        rankingContainer.innerHTML = `
            <div class="ranking-header">
                <h2>🏆 オンラインランキング</h2>
                <button class="close-button" onclick="rankingSystem.hideRanking()">✖</button>
            </div>
            
            <div class="ranking-controls">
                <div class="period-selector">
                    <button class="period-btn active" data-period="daily">日間</button>
                    <button class="period-btn" data-period="weekly">週間</button>
                    <button class="period-btn" data-period="monthly">月間</button>
                    <button class="period-btn" data-period="allTime">全期間</button>
                </div>
                
                <div class="mode-selector">
                    <select id="gameModeSelect">
                        <option value="all">すべて</option>
                        <option value="normal">ノーマル</option>
                        <option value="hard">ハード</option>
                        <option value="expert">エキスパート</option>
                    </select>
                </div>
            </div>
            
            <div class="ranking-list" id="rankingList">
                <div class="loading">読み込み中...</div>
            </div>
            
            <div class="ranking-footer">
                <button class="refresh-button" onclick="rankingSystem.refreshRankings()">
                    🔄 更新
                </button>
            </div>
        `;
        
        document.body.appendChild(rankingContainer);
        
        // イベントリスナーの設定
        const periodButtons = rankingContainer.querySelectorAll('.period-btn');
        periodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                periodButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.fetchAndDisplayRankings(e.target.dataset.period, this.currentGameMode);
            });
        });
        
        const gameModeSelect = rankingContainer.querySelector('#gameModeSelect');
        gameModeSelect.addEventListener('change', (e) => {
            this.fetchAndDisplayRankings(this.currentPeriod, e.target.value);
        });
        
        // スタイルの追加
        this.addRankingStyles();
    }
    
    // ランキングスタイルの追加
    addRankingStyles() {
        const style = document.createElement('style');
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
            
            #gameModeSelect {
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
            
            .loading {
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
    
    // ランキングの表示
    async showRanking() {
        const container = document.getElementById('rankingContainer');
        if (!container) {
            this.createRankingUI();
        }
        
        document.getElementById('rankingContainer').style.display = 'block';
        await this.fetchAndDisplayRankings(this.currentPeriod, this.currentGameMode);
    }
    
    // ランキングを非表示
    hideRanking() {
        const container = document.getElementById('rankingContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    // ランキングデータの取得と表示
    async fetchAndDisplayRankings(period, gameMode) {
        const rankingList = document.getElementById('rankingList');
        rankingList.innerHTML = '<div class="loading">読み込み中...</div>';
        
        try {
            const rankings = await this.fetchRankings(period, gameMode);
            this.displayRankings(rankings);
        } catch (error) {
            rankingList.innerHTML = '<div class="loading">ランキングの取得に失敗しました</div>';
        }
    }
    
    // ランキングの表示
    displayRankings(rankings) {
        const rankingList = document.getElementById('rankingList');
        
        if (rankings.length === 0) {
            rankingList.innerHTML = '<div class="loading">ランキングデータがありません</div>';
            return;
        }
        
        rankingList.innerHTML = rankings.map(item => `
            <div class="ranking-item">
                <div class="rank-number rank-${item.rank}">#${item.rank}</div>
                <div class="player-name">${this.escapeHtml(item.playerName)}</div>
                <div class="player-score">${item.score.toLocaleString()}</div>
                <div class="player-mode">${this.getGameModeLabel(item.gameMode)}</div>
            </div>
        `).join('');
    }
    
    // ランキングの更新
    async refreshRankings() {
        await this.fetchAndDisplayRankings(this.currentPeriod, this.currentGameMode);
    }
    
    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ゲームモードのラベル取得
    getGameModeLabel(mode) {
        const labels = {
            normal: 'ノーマル',
            hard: 'ハード',
            expert: 'エキスパート'
        };
        return labels[mode] || mode;
    }
}

// グローバルインスタンスの作成
window.rankingSystem = new RankingSystem();