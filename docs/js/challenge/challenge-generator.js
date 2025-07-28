/**
 * 週替わりチャレンジジェネレーター
 *
 * 決定論的なチャレンジ生成により、同じ週には同じチャレンジが提供される
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

    this.challengeTemplates = {
      score: {
        basic: { target: 1000, timeLimit: 120, title: 'スコアチャレンジ', description: '{}点以上を{}秒以内に獲得せよ' },
        intermediate: { target: 2000, timeLimit: 90, title: 'スコアマスター', description: '{}点以上を{}秒以内に獲得せよ' },
        advanced: { target: 3500, timeLimit: 60, title: 'スコアエキスパート', description: '{}点以上を{}秒以内に獲得せよ' },
        expert: { target: 5000, timeLimit: 45, title: 'スコアレジェンド', description: '{}点以上を{}秒以内に獲得せよ' }
      },
      consecutive_hits: {
        basic: { target: 10, timeLimit: 60, title: '連続ヒット', description: '{}回連続でヒットを決めよ' },
        intermediate: { target: 20, timeLimit: 90, title: '連続ヒットマスター', description: '{}回連続でヒットを決めよ' },
        advanced: { target: 35, timeLimit: 120, title: '連続ヒットエキスパート', description: '{}回連続でヒットを決めよ' },
        expert: { target: 50, timeLimit: 180, title: '連続ヒットレジェンド', description: '{}回連続でヒットを決めよ' }
      },
      time_survival: {
        basic: { target: 60, timeLimit: 300, title: '生存チャレンジ', description: '{}秒間生き残れ' },
        intermediate: { target: 120, timeLimit: 300, title: '生存マスター', description: '{}秒間生き残れ' },
        advanced: { target: 180, timeLimit: 300, title: '生存エキスパート', description: '{}秒間生き残れ' },
        expert: { target: 240, timeLimit: 300, title: '生存レジェンド', description: '{}秒間生き残れ' }
      },
      special_action: {
        basic: { target: 'multi_ball_activated', timeLimit: 120, title: '特殊アクション', description: 'マルチボールを発動せよ' },
        intermediate: { target: 'powerup_collected', timeLimit: 90, title: '特殊アクションマスター', description: 'パワーアップを3回収集せよ' },
        advanced: { target: 'ada_difficulty_increased', timeLimit: 60, title: '特殊アクションエキスパート', description: 'ADA難易度を上昇させよ' },
        expert: { target: 'perfect_combo', timeLimit: 180, title: '特殊アクションレジェンド', description: 'パーフェクトコンボを達成せよ' }
      }
    };
  }

  /**
     * 指定された日付の週替わりチャレンジを生成
     *
     * @param {Date} date - 基準日付
     * @returns {Object} 生成されたチャレンジ
     */
  generateWeeklyChallenge(date) {
    // 週の開始日（月曜日）を取得
    const weekStart = this.getWeekStart(date);

    // 週の開始日をシードとして使用
    const seed = this.dateToSeed(weekStart);

    // 決定論的な疑似乱数ジェネレーターを使用
    const rng = this.createSeededRNG(seed);

    // チャレンジタイプを選択
    const challengeType = this.challengeTypes[Math.floor(rng() * this.challengeTypes.length)];

    // 難易度を選択
    const difficulty = this.difficulties[Math.floor(rng() * this.difficulties.length)];

    // テンプレートを取得
    const template = this.challengeTemplates[challengeType][difficulty];

    // チャレンジオブジェクトを作成
    const challenge = {
      id: this.generateChallengeId(weekStart),
      week: this.getWeekNumber(weekStart),
      type: challengeType,
      difficulty: difficulty,
      target: template.target,
      timeLimit: template.timeLimit,
      title: template.title,
      description: template.description.replace('{}', template.target).replace('{}', template.timeLimit),
      startDate: weekStart.toISOString(),
      endDate: this.getWeekEnd(weekStart).toISOString(),
      metadata: {
        seed: seed,
        generatedAt: new Date().toISOString()
      }
    };

    return challenge;
  }

  /**
     * 週の開始日（月曜日）を取得
     *
     * @param {Date} date - 基準日付
     * @returns {Date} 週の開始日
     */
  getWeekStart(date) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始とする
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
     * 週の終了日（日曜日）を取得
     *
     * @param {Date} weekStart - 週の開始日
     * @returns {Date} 週の終了日
     */
  getWeekEnd(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
     * 週番号を取得
     *
     * @param {Date} date - 基準日付
     * @returns {number} 週番号
     */
  getWeekNumber(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  /**
     * 日付をシード値に変換
     *
     * @param {Date} date - 基準日付
     * @returns {number} シード値
     */
  dateToSeed(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 年、月、日を組み合わせてシード値を生成
    return year * 10000 + month * 100 + day;
  }

  /**
     * シード値を使用した疑似乱数ジェネレーターを作成
     *
     * @param {number} seed - シード値
     * @returns {Function} 疑似乱数ジェネレーター関数
     */
  createSeededRNG(seed) {
    let x = seed;

    return function() {
      // Linear Congruential Generator (LCG)
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x7fffffff;
    };
  }

  /**
     * チャレンジIDを生成
     *
     * @param {Date} weekStart - 週の開始日
     * @returns {string} チャレンジID
     */
  generateChallengeId(weekStart) {
    const year = weekStart.getFullYear();
    const week = this.getWeekNumber(weekStart);
    return `challenge_${year}_w${week.toString().padStart(2, '0')}`;
  }

  /**
     * 複数週のチャレンジを一括生成
     *
     * @param {Date} startDate - 開始日
     * @param {number} weeks - 週数
     * @returns {Array} チャレンジ配列
     */
  generateMultipleWeeklyChallenges(startDate, weeks) {
    const challenges = [];

    for (let i = 0; i < weeks; i++) {
      const challengeDate = new Date(startDate);
      challengeDate.setDate(challengeDate.getDate() + (i * 7));

      challenges.push(this.generateWeeklyChallenge(challengeDate));
    }

    return challenges;
  }

  /**
     * 現在の週のチャレンジを取得
     *
     * @returns {Object} 現在のチャレンジ
     */
  getCurrentWeekChallenge() {
    return this.generateWeeklyChallenge(new Date());
  }

  /**
     * 次の週のチャレンジをプレビュー
     *
     * @returns {Object} 来週のチャレンジ
     */
  getNextWeekChallenge() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return this.generateWeeklyChallenge(nextWeek);
  }

  /**
     * チャレンジの妥当性を検証
     *
     * @param {Object} challenge - 検証するチャレンジ
     * @returns {boolean} 妥当性
     */
  validateChallenge(challenge) {
    const requiredFields = ['id', 'type', 'difficulty', 'target', 'timeLimit', 'title', 'description'];

    for (const field of requiredFields) {
      if (!challenge.hasOwnProperty(field)) {
        return false;
      }
    }

    return (
      this.challengeTypes.includes(challenge.type) &&
            this.difficulties.includes(challenge.difficulty) &&
            typeof challenge.target === 'number' || typeof challenge.target === 'string' &&
            typeof challenge.timeLimit === 'number' &&
            challenge.timeLimit > 0
    );
  }

  /**
     * 単純な API 用の generate メソッド（テスト用）
     *
     * @param {number} seed - シード値
     * @returns {Object} 生成されたチャレンジ
     */
  generate(seed) {
    // シード値の検証
    if (seed == null || typeof seed !== 'number' || seed <= 0) {
      throw new Error('Invalid seed value');
    }

    // シード値を使用した疑似乱数ジェネレーターを作成
    const rng = this.createSeededRNG(seed);

    // チャレンジタイプを選択
    const challengeType = this.challengeTypes[Math.floor(rng() * this.challengeTypes.length)];

    // 難易度を選択
    const difficulty = this.difficulties[Math.floor(rng() * this.difficulties.length)];

    // テンプレートを取得
    const template = this.challengeTemplates[challengeType][difficulty];

    // 週番号を計算（シード値から）
    const weekNumber = Math.floor(seed / 10000) % 100 || 1;

    // チャレンジオブジェクトを作成
    const challenge = {
      id: `week_${weekNumber}_${challengeType}_${template.target}${challengeType === 'time_survival' ? 's' : ''}`,
      week: weekNumber,
      type: challengeType,
      difficulty: this.difficulties.indexOf(difficulty),
      target: template.target,
      timeLimit: template.timeLimit,
      title: template.title,
      description: template.description.replace('{}', template.target).replace('{}', template.timeLimit),
      goal: {
        maxDuration: template.target
      },
      metadata: {
        seed: seed,
        generatedAt: new Date().toISOString()
      }
    };

    // 特定のチャレンジタイプの場合、goalを調整
    if (challengeType === 'time_survival') {
      challenge.goal = {
        maxDuration: template.target
      };
    } else if (challengeType === 'score') {
      challenge.goal = {
        targetScore: template.target
      };
    }

    return challenge;
  }
}

// グローバルに公開
// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeGenerator;
}

// ブラウザ環境でのグローバル利用
if (typeof window !== 'undefined') {
  window.ChallengeGenerator = ChallengeGenerator;
}
