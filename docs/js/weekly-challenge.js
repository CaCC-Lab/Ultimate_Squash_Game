/**
 * 週替わりチャレンジ（PCG）システム
 * プロシージャル生成によるチャレンジレベルの実装
 */

// チャレンジの起算日（2024年1月1日月曜日）
const CHALLENGE_EPOCH = new Date('2024-01-01T00:00:00.000Z');

/**
 * 指定された日付が何週目のチャレンジかを計算する
 * @param {Date} currentDate - 計算対象の日付
 * @param {Date} epochDate - 起算日
 * @returns {number} 週番号（1以上）、起算日より前の場合は0
 */
function calculateWeekNumber(currentDate, epochDate) {
  if (currentDate < epochDate) {
    return 0;
  }
  const diff = currentDate.getTime() - epochDate.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return Math.floor(days / 7) + 1;
}

class WeeklyChallenge {
  constructor(date = new Date()) {
    this.currentDate = date;
    this.epoch = CHALLENGE_EPOCH;
    this.weekNumber = calculateWeekNumber(this.currentDate, this.epoch);
  }

  /**
   * 週番号に基づいて決定論的なシード値を生成する
   * @returns {number} シード値（週番号0の場合は0）
   */
  getSeed() {
    if (this.weekNumber === 0) return 0;
    // 週番号に基づく簡単なハッシュ関数
    // より高度な実装では、より良い乱数生成器を使用すべき
    return this.weekNumber * 314159 % 100000;
  }

  /**
   * シード値に基づいてゲームのレベルパラメータを生成する
   * @returns {Object} レベルパラメータ（ballSpeed, paddleSize等）
   */
  getLevelParameters() {
    const seed = this.getSeed();
    if (seed === 0) {
      return { ballSpeed: 5, paddleSize: 100 }; // デフォルト値
    }

    // シード値から決定論的な疑似乱数を生成
    // Math.sinを使った簡単な疑似乱数生成（実際のゲームではより良い方法を使用すべき）
    const pseudoRandom = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    // パラメータの生成
    const ballSpeed = 5 + pseudoRandom(seed) * 5; // 5〜10の範囲
    const paddleSize = 100 - pseudoRandom(seed * 2) * 50; // 50〜100の範囲

    return {
      ballSpeed: parseFloat(ballSpeed.toFixed(2)),
      paddleSize: parseFloat(paddleSize.toFixed(2))
    };
  }

  /**
   * チャレンジの識別情報を取得する
   * @returns {Object|null} チャレンジ情報（id, startDate, endDate）、週番号0の場合はnull
   */
  getChallengeInfo() {
    if (this.weekNumber === 0) return null;

    // 開始日の計算
    const startDate = new Date(this.epoch);
    startDate.setDate(startDate.getDate() + (this.weekNumber - 1) * 7);

    // 終了日の計算（開始日から6日後）
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return {
      id: `weekly-challenge-${this.weekNumber}`,
      startDate,
      endDate
    };
  }
}

/**
 * 週替わりチャレンジ生成システム
 * 
 * 決定論的な週替わりチャレンジを生成する
 */
class ChallengeGenerator {
    constructor() {
        this.challengeTypes = [
            'score',
            'consecutive_hits',
            'time_survival',
            'special_action'
        ];
        
        this.difficulties = ['basic', 'intermediate', 'advanced', 'expert'];
        
        // チャレンジテンプレート
        this.challengeTemplates = {
            score: {
                titles: ['スコアマスター', 'ハイスコアチャレンジ', '得点王への道', 'スコアブレイカー'],
                descriptions: [
                    '点以上のスコアを獲得してください',
                    '点を目指して頑張りましょう',
                    '点のスコアを達成せよ',
                    '点以上を獲得してスコアマスターになろう'
                ],
                targets: [1000, 1500, 2000, 2500, 3000]
            },
            consecutive_hits: {
                titles: ['連続ヒット王', 'コンボマスター', '連打チャレンジ', 'ヒットストリーク'],
                descriptions: [
                    '回連続でボールを打ち返してください',
                    '回のコンボを達成しよう',
                    '連続ヒット回数を競おう',
                    'ミスせずに連続でヒットしよう'
                ],
                targets: [10, 15, 20, 25, 30]
            },
            time_survival: {
                titles: ['生存マスター', 'タイムアタック', 'サバイバルモード', '時間との戦い'],
                descriptions: [
                    '秒間生き残ってください',
                    '秒間プレイを続けよう',
                    '秒間ゲームオーバーにならないようにしよう',
                    '秒間の持久戦に挑戦'
                ],
                targets: [60, 90, 120, 150, 180]
            },
            special_action: {
                titles: ['スペシャルアクション', '特殊技能', '技術の証明', 'エキスパートチャレンジ'],
                descriptions: [
                    'を発動してください',
                    'の技術を使いこなそう',
                    'を成功させよう',
                    'を実行してマスターになろう'
                ],
                targets: [
                    'multi_ball_activated',
                    'powerup_collected',
                    'ada_difficulty_increased',
                    'perfect_combo'
                ]
            }
        };
    }
    
    /**
     * 週替わりチャレンジを生成
     * 
     * @param {Date} date - 対象の日付
     * @returns {Object} 生成されたチャレンジ
     */
    generateWeeklyChallenge(date) {
        // 週の開始日を取得（月曜日を週の開始とする）
        const weekStart = this.getWeekStart(date);
        
        // 週番号を計算（2024年1月1日からの週数）
        const epochDate = new Date('2024-01-01');
        const weekNumber = Math.floor((weekStart - epochDate) / (7 * 24 * 60 * 60 * 1000));
        
        // 決定論的な乱数シード
        const seed = this.hashCode(`week-${weekNumber}`);
        const rng = this.createSeededRandom(seed);
        
        // チャレンジタイプを選択
        const challengeType = this.challengeTypes[Math.floor(rng() * this.challengeTypes.length)];
        
        // 難易度を選択
        const difficulty = this.difficulties[Math.floor(rng() * this.difficulties.length)];
        
        // チャレンジの詳細を生成
        const challenge = this.generateChallengeDetails(challengeType, difficulty, rng);
        
        return {
            weekNumber: weekNumber,
            weekStart: weekStart.toISOString(),
            type: challengeType,
            difficulty: difficulty,
            title: challenge.title,
            description: challenge.description,
            target: challenge.target,
            timeLimit: challenge.timeLimit,
            condition: challenge.condition,
            metadata: {
                seed: seed,
                generatedAt: new Date().toISOString()
            }
        };
    }
    
    /**
     * 週の開始日を取得（月曜日）
     * 
     * @param {Date} date - 対象の日付
     * @returns {Date} 週の開始日
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }
    
    /**
     * 文字列からハッシュ値を生成
     * 
     * @param {string} str - ハッシュ化する文字列
     * @returns {number} ハッシュ値
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return Math.abs(hash);
    }
    
    /**
     * シード値から決定論的な乱数ジェネレータを作成
     * 
     * @param {number} seed - シード値
     * @returns {Function} 乱数ジェネレータ
     */
    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    /**
     * チャレンジの詳細を生成
     * 
     * @param {string} type - チャレンジタイプ
     * @param {string} difficulty - 難易度
     * @param {Function} rng - 乱数ジェネレータ
     * @returns {Object} チャレンジの詳細
     */
    generateChallengeDetails(type, difficulty, rng) {
        const template = this.challengeTemplates[type];
        
        // タイトルと説明を選択
        const titleIndex = Math.floor(rng() * template.titles.length);
        const descIndex = Math.floor(rng() * template.descriptions.length);
        const title = template.titles[titleIndex];
        const description = template.descriptions[descIndex];
        
        // 目標値を選択
        const targetIndex = Math.floor(rng() * template.targets.length);
        const target = template.targets[targetIndex];
        
        // 難易度による調整
        const difficultyMultiplier = {
            basic: 1.0,
            intermediate: 1.3,
            advanced: 1.6,
            expert: 2.0
        };
        
        const multiplier = difficultyMultiplier[difficulty];
        
        // 制限時間を設定
        const baseTimeLimit = this.getBaseTimeLimit(type);
        const timeLimit = Math.floor(baseTimeLimit / multiplier);
        
        // 条件を生成
        const condition = this.generateCondition(type, target, timeLimit, multiplier);
        
        return {
            title: title,
            description: `${Math.floor(typeof target === 'number' ? target * multiplier : target)}${description}`,
            target: typeof target === 'number' ? Math.floor(target * multiplier) : target,
            timeLimit: timeLimit,
            condition: condition
        };
    }
    
    /**
     * チャレンジタイプに基づく基本制限時間を取得
     * 
     * @param {string} type - チャレンジタイプ
     * @returns {number} 基本制限時間（秒）
     */
    getBaseTimeLimit(type) {
        const timeLimits = {
            score: 120,
            consecutive_hits: 60,
            time_survival: 300,
            special_action: 180
        };
        
        return timeLimits[type] || 120;
    }
    
    /**
     * チャレンジの条件を生成
     * 
     * @param {string} type - チャレンジタイプ
     * @param {*} target - 目標値
     * @param {number} timeLimit - 制限時間
     * @param {number} multiplier - 難易度倍率
     * @returns {Object} チャレンジ条件
     */
    generateCondition(type, target, timeLimit, multiplier) {
        const conditions = {
            score: {
                type: 'score',
                requirement: `${Math.floor(target * multiplier)}点以上獲得`,
                timeLimit: `${timeLimit}秒以内`
            },
            consecutive_hits: {
                type: 'consecutive_hits',
                requirement: `${Math.floor(target * multiplier)}回連続ヒット`,
                timeLimit: `${timeLimit}秒以内`
            },
            time_survival: {
                type: 'time_survival',
                requirement: `${Math.floor(target * multiplier)}秒間生存`,
                timeLimit: `制限時間なし`
            },
            special_action: {
                type: 'special_action',
                requirement: `${target}を実行`,
                timeLimit: `${timeLimit}秒以内`
            }
        };
        
        return conditions[type];
    }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChallengeGenerator;
}

// ブラウザ環境でのグローバル利用
if (typeof window !== 'undefined') {
    window.ChallengeGenerator = new ChallengeGenerator();
}