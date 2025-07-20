/**
 * ウィークリーチャレンジ進捗永続化モジュール
 * localStorageを使用してチャレンジの進捗を保存・復元する
 */

// ストレージキーのプレフィックス
const STORAGE_KEY_PREFIX = 'ultimateSquashGame.weeklyChallenge.';

// デバウンス用のタイマー
let saveDebounceTimer = null;

/**
 * 現在の週のIDを取得（ISO 8601形式: YYYY-Www）
 * @param {Date} date - 日付（デフォルトは現在）
 * @returns {string} 週ID（例: "2025-W30"）
 */
function getWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * 週の終了時刻（日曜日の23:59:59）を取得
 * @returns {number} タイムスタンプ（ミリ秒）
 */
function getWeekExpiryTimestamp() {
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7;
    const expiryDate = new Date(now);
    expiryDate.setDate(now.getDate() + daysUntilSunday);
    expiryDate.setHours(23, 59, 59, 999);
    return expiryDate.getTime();
}

/**
 * localStorage が使用可能かチェック
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__localStorage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.warn('localStorage is not available:', e);
        return false;
    }
}

/**
 * チャレンジ進捗をlocalStorageに保存
 * @param {object} challengeData - チャレンジの定義
 * @param {object} progressData - 進捗データ
 * @param {boolean} immediate - true の場合、デバウンスせずに即座に保存
 */
function saveChallengeProgress(challengeData, progressData, immediate = false) {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage is not available. Progress will not be saved.');
        return;
    }

    const saveFunction = () => {
        try {
            const weekId = getWeekId();
            const key = `${STORAGE_KEY_PREFIX}${weekId}`;
            
            const dataToStore = {
                challengeId: weekId,
                challengeDefinition: challengeData,
                progress: progressData,
                timestamp: Date.now(),
                expiryTimestamp: getWeekExpiryTimestamp()
            };
            
            localStorage.setItem(key, JSON.stringify(dataToStore));
            console.log('Challenge progress saved successfully');
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded. Cannot save progress.');
                // 古いデータをクリーンアップ
                cleanupOldChallengeData();
            } else {
                console.error('Failed to save progress to localStorage:', e);
            }
        }
    };

    if (immediate) {
        // デバウンスタイマーをクリアして即座に保存
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
            saveDebounceTimer = null;
        }
        saveFunction();
    } else {
        // デバウンス: 1秒間の遅延後に保存
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
        }
        saveDebounceTimer = setTimeout(saveFunction, 1000);
    }
}

/**
 * localStorageからチャレンジ進捗を読み込み
 * @returns {object|null} 復元されたデータ、または無効な場合はnull
 */
function loadChallengeProgress() {
    if (!isLocalStorageAvailable()) {
        return null;
    }

    const weekId = getWeekId();
    const key = `${STORAGE_KEY_PREFIX}${weekId}`;
    
    try {
        const savedData = localStorage.getItem(key);
        if (!savedData) {
            console.log('No saved progress found for current week');
            return null;
        }

        const parsedData = JSON.parse(savedData);

        // データ検証
        if (parsedData.challengeId !== weekId) {
            console.log('Saved progress is for a different week. Removing it.');
            localStorage.removeItem(key);
            return null;
        }

        if (parsedData.expiryTimestamp < Date.now()) {
            console.log('Saved progress has expired. Removing it.');
            localStorage.removeItem(key);
            return null;
        }

        console.log('Successfully loaded progress from localStorage');
        return parsedData;
    } catch (e) {
        console.error('Failed to parse saved progress. Removing corrupted data.', e);
        try {
            localStorage.removeItem(key);
        } catch (removeError) {
            console.error('Failed to remove corrupted data:', removeError);
        }
        return null;
    }
}

/**
 * 古いチャレンジデータをクリーンアップ
 */
function cleanupOldChallengeData() {
    if (!isLocalStorageAvailable()) {
        return;
    }

    const currentWeekId = getWeekId();
    const keysToRemove = [];

    try {
        // localStorageのすべてのキーをチェック
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    // 期限切れまたは現在の週以外のデータを削除対象に
                    if (data.expiryTimestamp < Date.now() || data.challengeId !== currentWeekId) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    // パースできないデータも削除対象に
                    keysToRemove.push(key);
                }
            }
        }

        // 削除実行
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed old challenge data: ${key}`);
        });
    } catch (e) {
        console.error('Error during cleanup:', e);
    }
}

/**
 * チャレンジ進捗をリセット
 */
function resetChallengeProgress() {
    if (!isLocalStorageAvailable()) {
        return;
    }

    const weekId = getWeekId();
    const key = `${STORAGE_KEY_PREFIX}${weekId}`;
    
    try {
        localStorage.removeItem(key);
        console.log('Challenge progress reset successfully');
    } catch (e) {
        console.error('Failed to reset progress:', e);
    }
}

/**
 * ページ離脱時の自動保存設定
 */
function setupAutoSave() {
    // ページの可視性が変わったとき（タブ切り替えなど）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // タブが非表示になったら即座に保存
            const currentChallenge = window.currentWeeklyChallenge;
            const currentProgress = window.currentChallengeProgress;
            if (currentChallenge && currentProgress) {
                saveChallengeProgress(currentChallenge, currentProgress, true);
            }
        }
    });

    // ページを離れる前
    window.addEventListener('beforeunload', () => {
        const currentChallenge = window.currentWeeklyChallenge;
        const currentProgress = window.currentChallengeProgress;
        if (currentChallenge && currentProgress) {
            saveChallengeProgress(currentChallenge, currentProgress, true);
        }
    });

    // 初回起動時にクリーンアップ
    cleanupOldChallengeData();
}

// エクスポート（グローバルスコープに公開）
window.WeeklyChallengeStorage = {
    getWeekId,
    saveChallengeProgress,
    loadChallengeProgress,
    resetChallengeProgress,
    cleanupOldChallengeData,
    setupAutoSave
};