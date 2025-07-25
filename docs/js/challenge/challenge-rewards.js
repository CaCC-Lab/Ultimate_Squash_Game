/**
 * 週替わりチャレンジ報酬システム
 * 
 * チャレンジ達成時の報酬計算と管理を行う
 */
class ChallengeRewards {
    constructor() {
        this.rewardTiers = {
            'basic': {
                points: 100,
                title: 'チャレンジャー',
                multiplier: 1.0
            },
            'intermediate': {
                points: 200,
                title: 'チャレンジマスター',
                multiplier: 1.5
            },
            'advanced': {
                points: 350,
                title: 'チャレンジエキスパート',
                multiplier: 2.0
            },
            'expert': {
                points: 500,
                title: 'チャレンジレジェンド',
                multiplier: 2.5
            }
        };
        
        this.badges = this.initializeBadges();
        this.achievements = this.loadAchievements();
        this.streakCounter = 0;
        this.initializeStreak();
    }
    
    /**
     * チャレンジ難易度に基づいた基本報酬を計算
     * 
     * @param {string} difficulty - 難易度
     * @returns {Object} 報酬情報
     */
    calculateReward(difficulty) {
        const tier = this.rewardTiers[difficulty] || this.rewardTiers['basic'];
        
        return {
            points: tier.points,
            title: tier.title,
            multiplier: tier.multiplier,
            bonusEligible: true
        };
    }
    
    /**
     * プレイヤーに報酬を適用
     * 
     * @param {Object} player - プレイヤー情報
     * @param {Object} reward - 報酬情報
     */
    applyReward(player, reward) {
        if (!player || !reward) {
            throw new Error('Player and reward are required');
        }
        
        // ポイント加算
        player.totalPoints = (player.totalPoints || 0) + reward.points;
        
        // 称号追加
        if (reward.title && !player.titles) {
            player.titles = [];
        }
        if (reward.title && !player.titles.includes(reward.title)) {
            player.titles.push(reward.title);
        }
        
        // 実績追加
        if (!player.achievements) {
            player.achievements = [];
        }
        
        const achievement = {
            type: 'challenge_completed',
            title: reward.title,
            points: reward.points,
            earnedAt: new Date().toISOString()
        };
        
        player.achievements.push(achievement);
        
        return player;
    }
    
    /**
     * ボーナス報酬を計算
     * 
     * @param {Object} challenge - チャレンジ情報
     * @param {Object} gameStats - ゲーム統計
     * @param {Object} baseReward - 基本報酬
     * @returns {Object} ボーナス付き報酬
     */
    calculateBonusReward(challenge, gameStats, baseReward) {
        let bonusPoints = 0;
        let bonusReasons = [];
        
        // 早期達成ボーナス
        if (gameStats.gameDuration < challenge.timeLimit * 0.5) {
            bonusPoints += Math.floor(baseReward.points * 0.5);
            bonusReasons.push('早期達成ボーナス');
        }
        
        // 超過達成ボーナス（スコアチャレンジ）
        if (challenge.type === 'score' && gameStats.score > challenge.target * 1.5) {
            bonusPoints += Math.floor(baseReward.points * 0.3);
            bonusReasons.push('超過達成ボーナス');
        }
        
        // 連続ヒットボーナス
        if (challenge.type === 'consecutive_hits' && gameStats.consecutiveHits > challenge.target * 1.2) {
            bonusPoints += Math.floor(baseReward.points * 0.2);
            bonusReasons.push('連続ヒットボーナス');
        }
        
        // 特殊アクションボーナス
        if (challenge.type === 'special_action' && gameStats.specialActions && gameStats.specialActions.length > 1) {
            bonusPoints += Math.floor(baseReward.points * 0.4);
            bonusReasons.push('特殊アクション多重実行');
        }
        
        return {
            ...baseReward,
            bonusPoints,
            bonusReasons,
            totalPoints: baseReward.points + bonusPoints
        };
    }
    
    /**
     * 連続クリア報酬を計算
     * 
     * @param {number} streakCount - 連続クリア数
     * @returns {Object} 連続クリア報酬
     */
    calculateStreakReward(streakCount) {
        const streakBonuses = {
            3: { points: 50, title: '3週連続クリア' },
            5: { points: 100, title: '5週連続クリア' },
            7: { points: 200, title: '7週連続クリア' },
            10: { points: 500, title: '10週連続クリア' }
        };
        
        const bonus = streakBonuses[streakCount];
        if (bonus) {
            return {
                points: bonus.points,
                title: bonus.title,
                type: 'streak_bonus',
                streakCount
            };
        }
        
        return null;
    }
    
    /**
     * 週間ランキング報酬を計算
     * 
     * @param {number} rank - ランキング順位
     * @param {number} totalPlayers - 総プレイヤー数
     * @returns {Object} ランキング報酬
     */
    calculateRankingReward(rank, totalPlayers) {
        const percentile = (rank / totalPlayers) * 100;
        
        if (percentile <= 1) {
            return {
                points: 1000,
                title: 'トップ1%',
                badge: 'top_1_percent',
                type: 'ranking_reward'
            };
        } else if (percentile <= 5) {
            return {
                points: 500,
                title: 'トップ5%',
                badge: 'top_5_percent',
                type: 'ranking_reward'
            };
        } else if (percentile <= 10) {
            return {
                points: 250,
                title: 'トップ10%',
                badge: 'top_10_percent',
                type: 'ranking_reward'
            };
        }
        
        return null;
    }
    
    /**
     * 特別実績報酬を計算
     * 
     * @param {Object} gameStats - ゲーム統計
     * @param {Object} challenge - チャレンジ情報
     * @returns {Array} 特別実績報酬配列
     */
    calculateAchievementRewards(gameStats, challenge) {
        const achievements = [];
        
        // パーフェクトクリア
        if (gameStats.missCount === 0 && gameStats.powerupsUsed === 0) {
            achievements.push({
                type: 'perfect_clear',
                title: 'パーフェクトクリア',
                points: 100,
                description: 'ノーミスでチャレンジをクリア'
            });
        }
        
        // スピードクリア
        if (gameStats.gameDuration < challenge.timeLimit * 0.25) {
            achievements.push({
                type: 'speed_clear',
                title: 'スピードクリア',
                points: 150,
                description: '制限時間の1/4以下でクリア'
            });
        }
        
        // コンボマスター
        if (gameStats.maxCombo && gameStats.maxCombo >= 50) {
            achievements.push({
                type: 'combo_master',
                title: 'コンボマスター',
                points: 80,
                description: '50コンボ以上を達成'
            });
        }
        
        // マルチタスク
        if (gameStats.specialActions && gameStats.specialActions.length >= 3) {
            achievements.push({
                type: 'multitask',
                title: 'マルチタスク',
                points: 120,
                description: '3種類以上の特殊アクションを実行'
            });
        }
        
        return achievements;
    }
    
    /**
     * 総合報酬を計算
     * 
     * @param {Object} challenge - チャレンジ情報
     * @param {Object} gameStats - ゲーム統計
     * @param {Object} additionalData - 追加データ（ランキング等）
     * @returns {Object} 総合報酬
     */
    calculateTotalReward(challenge, gameStats, additionalData = {}) {
        const baseReward = this.calculateReward(challenge.difficulty);
        const bonusReward = this.calculateBonusReward(challenge, gameStats, baseReward);
        const achievements = this.calculateAchievementRewards(gameStats, challenge);
        
        let totalPoints = bonusReward.totalPoints;
        let allTitles = [bonusReward.title];
        let allBadges = [];
        
        // 実績ポイント加算
        achievements.forEach(achievement => {
            totalPoints += achievement.points;
            allTitles.push(achievement.title);
        });
        
        // 連続クリア報酬
        if (additionalData.streakCount) {
            const streakReward = this.calculateStreakReward(additionalData.streakCount);
            if (streakReward) {
                totalPoints += streakReward.points;
                allTitles.push(streakReward.title);
            }
        }
        
        // ランキング報酬
        if (additionalData.rank && additionalData.totalPlayers) {
            const rankingReward = this.calculateRankingReward(additionalData.rank, additionalData.totalPlayers);
            if (rankingReward) {
                totalPoints += rankingReward.points;
                allTitles.push(rankingReward.title);
                if (rankingReward.badge) {
                    allBadges.push(rankingReward.badge);
                }
            }
        }
        
        return {
            baseReward,
            bonusReward,
            achievements,
            totalPoints,
            titles: allTitles,
            badges: allBadges,
            summary: {
                basePoints: baseReward.points,
                bonusPoints: bonusReward.bonusPoints,
                achievementPoints: achievements.reduce((sum, a) => sum + a.points, 0),
                streakPoints: additionalData.streakCount ? (this.calculateStreakReward(additionalData.streakCount)?.points || 0) : 0,
                rankingPoints: additionalData.rank ? (this.calculateRankingReward(additionalData.rank, additionalData.totalPlayers)?.points || 0) : 0
            }
        };
    }
    
    /**
     * バッジを初期化
     * 
     * @returns {Object} バッジ定義
     */
    initializeBadges() {
        return {
            'first-challenge': {
                id: 'first-challenge',
                name: '初めてのチャレンジ',
                description: '初めて週替わりチャレンジをクリア',
                icon: '🏆',
                rarity: 'COMMON'
            },
            'perfect-clear': {
                id: 'perfect-clear',
                name: 'パーフェクトクリア',
                description: 'ノーミスでチャレンジをクリア',
                icon: '⭐',
                rarity: 'RARE'
            },
            'speedrun': {
                id: 'speedrun',
                name: 'スピードラン',
                description: '予想時間の半分以下でクリア',
                icon: '⚡',
                rarity: 'EPIC'
            },
            'week-streak-3': {
                id: 'week-streak-3',
                name: '3週連続',
                description: '3週連続でチャレンジをクリア',
                icon: '🔥',
                rarity: 'RARE'
            },
            'top-1-percent': {
                id: 'top-1-percent',
                name: 'トップ1%',
                description: '週間ランキングでトップ1%に入る',
                icon: '👑',
                rarity: 'LEGENDARY'
            }
        };
    }
    
    /**
     * 実績を読み込み
     * 
     * @returns {Array} 実績配列
     */
    loadAchievements() {
        try {
            const saved = localStorage.getItem('challenge_achievements');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
        return [];
    }
    
    /**
     * 連続クリア数を初期化
     */
    initializeStreak() {
        // 実績から連続クリア数を計算
        const clearedWeeks = this.achievements
            .filter(a => a.type === 'challenge_completed')
            .map(a => a.weekNumber || 0)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort((a, b) => b - a);
        
        if (clearedWeeks.length > 0) {
            this.streakCounter = 1;
            for (let i = 1; i < clearedWeeks.length; i++) {
                if (clearedWeeks[i] === clearedWeeks[i-1] - 1) {
                    this.streakCounter++;
                } else {
                    break;
                }
            }
        }
    }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeRewards;
}

// ブラウザ環境でのグローバル利用
if (typeof window !== 'undefined') {
  window.ChallengeRewards = new ChallengeRewards();
}

