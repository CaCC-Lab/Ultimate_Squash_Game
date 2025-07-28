/**
 * ウィークリーチャレンジの永続化システム
 * localStorage を使用してチャレンジの進捗を保存・復元
 */

class WeeklyChallengePersistence {
    constructor() {
        this.storageKey = 'ultimate_squash_weekly_challenges';
        this.userProgressKey = 'ultimate_squash_user_progress';
        this.achievementsKey = 'ultimate_squash_achievements';
    }

    /**
     * チャレンジデータを保存
     * @param {Object} challengeData - チャレンジデータ
     */
    saveChallengeData(challengeData) {
        try {
            const existingData = this.loadAllChallenges() || {};
            const challengeId = challengeData.id || this.generateChallengeId();
            
            existingData[challengeId] = {
                ...challengeData,
                id: challengeId,
                savedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            return challengeId;
        } catch (error) {
            console.error('Failed to save challenge data:', error);
            return null;
        }
    }

    /**
     * 全てのチャレンジデータを読み込み
     * @returns {Object} チャレンジデータのオブジェクト
     */
    loadAllChallenges() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load challenge data:', error);
            return {};
        }
    }

    /**
     * 特定のチャレンジデータを読み込み
     * @param {string} challengeId - チャレンジID
     * @returns {Object|null} チャレンジデータ
     */
    loadChallenge(challengeId) {
        const allChallenges = this.loadAllChallenges();
        return allChallenges[challengeId] || null;
    }

    /**
     * チャレンジの進捗を保存
     * @param {string} challengeId - チャレンジID
     * @param {Object} progress - 進捗データ
     */
    saveProgress(challengeId, progress) {
        try {
            const userProgress = this.loadUserProgress();
            
            if (!userProgress[challengeId]) {
                userProgress[challengeId] = {
                    attempts: 0,
                    bestScore: 0,
                    completedAt: null,
                    history: []
                };
            }
            
            userProgress[challengeId] = {
                ...userProgress[challengeId],
                ...progress,
                lastUpdated: new Date().toISOString()
            };
            
            // 履歴に追加
            if (progress.score) {
                userProgress[challengeId].history.push({
                    score: progress.score,
                    completedAt: new Date().toISOString(),
                    metadata: progress.metadata || {}
                });
                
                // 履歴は最新10件まで保持
                if (userProgress[challengeId].history.length > 10) {
                    userProgress[challengeId].history = userProgress[challengeId].history.slice(-10);
                }
            }
            
            localStorage.setItem(this.userProgressKey, JSON.stringify(userProgress));
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    /**
     * ユーザーの全進捗データを読み込み
     * @returns {Object} 進捗データ
     */
    loadUserProgress() {
        try {
            const data = localStorage.getItem(this.userProgressKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load user progress:', error);
            return {};
        }
    }

    /**
     * 特定のチャレンジの進捗を読み込み
     * @param {string} challengeId - チャレンジID
     * @returns {Object|null} 進捗データ
     */
    loadChallengeProgress(challengeId) {
        const userProgress = this.loadUserProgress();
        return userProgress[challengeId] || null;
    }

    /**
     * アチーブメントを保存
     * @param {Object} achievement - アチーブメントデータ
     */
    saveAchievement(achievement) {
        try {
            const achievements = this.loadAchievements();
            const achievementId = achievement.id || this.generateAchievementId();
            
            achievements[achievementId] = {
                ...achievement,
                id: achievementId,
                unlockedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.achievementsKey, JSON.stringify(achievements));
            return achievementId;
        } catch (error) {
            console.error('Failed to save achievement:', error);
            return null;
        }
    }

    /**
     * 全てのアチーブメントを読み込み
     * @returns {Object} アチーブメントデータ
     */
    loadAchievements() {
        try {
            const data = localStorage.getItem(this.achievementsKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load achievements:', error);
            return {};
        }
    }

    /**
     * データの統計情報を取得
     * @returns {Object} 統計データ
     */
    getStatistics() {
        const userProgress = this.loadUserProgress();
        const achievements = this.loadAchievements();
        
        const stats = {
            totalChallengesAttempted: Object.keys(userProgress).length,
            totalChallengesCompleted: 0,
            totalAchievements: Object.keys(achievements).length,
            bestScores: {},
            totalPlayTime: 0,
            averageScore: 0
        };
        
        let totalScore = 0;
        let scoreCount = 0;
        
        for (const [challengeId, progress] of Object.entries(userProgress)) {
            if (progress.completedAt) {
                stats.totalChallengesCompleted++;
            }
            
            if (progress.bestScore) {
                stats.bestScores[challengeId] = progress.bestScore;
                totalScore += progress.bestScore;
                scoreCount++;
            }
            
            if (progress.history && progress.history.length > 0) {
                // 履歴からプレイ時間を推定（仮）
                stats.totalPlayTime += progress.history.length * 2; // 平均2分/プレイと仮定
            }
        }
        
        if (scoreCount > 0) {
            stats.averageScore = Math.round(totalScore / scoreCount);
        }
        
        return stats;
    }

    /**
     * 今週のチャレンジを取得
     * @returns {Array} 今週のチャレンジリスト
     */
    getWeeklyChallenges() {
        const allChallenges = this.loadAllChallenges();
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return Object.values(allChallenges).filter(challenge => {
            if (!challenge.weeklyPeriod) return false;
            
            const challengeStart = new Date(challenge.weeklyPeriod.start);
            const challengeEnd = new Date(challenge.weeklyPeriod.end);
            
            return challengeStart <= weekEnd && challengeEnd >= weekStart;
        });
    }

    /**
     * データをエクスポート
     * @returns {Object} 全データ
     */
    exportData() {
        return {
            challenges: this.loadAllChallenges(),
            userProgress: this.loadUserProgress(),
            achievements: this.loadAchievements(),
            statistics: this.getStatistics(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * データをインポート
     * @param {Object} data - インポートするデータ
     * @returns {boolean} 成功フラグ
     */
    importData(data) {
        try {
            if (data.challenges) {
                localStorage.setItem(this.storageKey, JSON.stringify(data.challenges));
            }
            
            if (data.userProgress) {
                localStorage.setItem(this.userProgressKey, JSON.stringify(data.userProgress));
            }
            
            if (data.achievements) {
                localStorage.setItem(this.achievementsKey, JSON.stringify(data.achievements));
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * 全データをクリア
     * @param {boolean} confirm - 確認フラグ
     */
    clearAllData(confirm = false) {
        if (!confirm) {
            console.warn('clearAllData requires confirm=true to execute');
            return false;
        }
        
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.userProgressKey);
            localStorage.removeItem(this.achievementsKey);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * チャレンジIDを生成
     * @returns {string} ユニークなチャレンジID
     */
    generateChallengeId() {
        return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * アチーブメントIDを生成
     * @returns {string} ユニークなアチーブメントID
     */
    generateAchievementId() {
        return 'achievement_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * データの整合性をチェック
     * @returns {Object} チェック結果
     */
    validateData() {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        try {
            // チャレンジデータの検証
            const challenges = this.loadAllChallenges();
            for (const [id, challenge] of Object.entries(challenges)) {
                if (!challenge.id || !challenge.savedAt) {
                    result.errors.push(`Challenge ${id} is missing required fields`);
                    result.valid = false;
                }
            }
            
            // 進捗データの検証
            const userProgress = this.loadUserProgress();
            for (const [challengeId, progress] of Object.entries(userProgress)) {
                if (!challenges[challengeId]) {
                    result.warnings.push(`Progress exists for unknown challenge: ${challengeId}`);
                }
            }
            
        } catch (error) {
            result.errors.push(`Data validation failed: ${error.message}`);
            result.valid = false;
        }
        
        return result;
    }
}

// グローバルインスタンスを作成
window.weeklyChallengePersistence = new WeeklyChallengePersistence();

// 既存のチャレンジシステムとの統合用ヘルパー関数
window.saveChallengeProgress = function(challengeId, progressData) {
    return window.weeklyChallengePersistence.saveProgress(challengeId, progressData);
};

window.loadChallengeProgress = function(challengeId) {
    return window.weeklyChallengePersistence.loadChallengeProgress(challengeId);
};

window.getChallengeStatistics = function() {
    return window.weeklyChallengePersistence.getStatistics();
};

// コンソールでデバッグ用に使用可能
console.log('Weekly Challenge Persistence system loaded');