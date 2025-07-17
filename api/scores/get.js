// Vercel Function: ランキング取得API
import { kv } from '@vercel/kv';

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// モックデータ（データベース実装までの仮データ）
const mockRankings = {
  daily: [
    { rank: 1, playerName: 'マスター', score: 15000, gameMode: 'expert', timestamp: Date.now() - 3600000 },
    { rank: 2, playerName: 'プロ選手', score: 12000, gameMode: 'expert', timestamp: Date.now() - 7200000 },
    { rank: 3, playerName: 'エース', score: 10000, gameMode: 'hard', timestamp: Date.now() - 10800000 },
    { rank: 4, playerName: 'チャンピオン', score: 8500, gameMode: 'hard', timestamp: Date.now() - 14400000 },
    { rank: 5, playerName: 'ベテラン', score: 7000, gameMode: 'normal', timestamp: Date.now() - 18000000 },
  ],
  weekly: [
    { rank: 1, playerName: 'レジェンド', score: 50000, gameMode: 'expert', timestamp: Date.now() - 86400000 },
    { rank: 2, playerName: 'マスター', score: 45000, gameMode: 'expert', timestamp: Date.now() - 172800000 },
    { rank: 3, playerName: 'グランドマスター', score: 40000, gameMode: 'expert', timestamp: Date.now() - 259200000 },
    { rank: 4, playerName: 'エキスパート', score: 35000, gameMode: 'hard', timestamp: Date.now() - 345600000 },
    { rank: 5, playerName: 'スペシャリスト', score: 30000, gameMode: 'hard', timestamp: Date.now() - 432000000 },
  ],
  monthly: [
    { rank: 1, playerName: '神', score: 200000, gameMode: 'expert', timestamp: Date.now() - 604800000 },
    { rank: 2, playerName: 'レジェンド', score: 180000, gameMode: 'expert', timestamp: Date.now() - 1209600000 },
    { rank: 3, playerName: 'ヒーロー', score: 160000, gameMode: 'expert', timestamp: Date.now() - 1814400000 },
    { rank: 4, playerName: 'マスター', score: 140000, gameMode: 'hard', timestamp: Date.now() - 2419200000 },
    { rank: 5, playerName: 'チャンピオン', score: 120000, gameMode: 'hard', timestamp: Date.now() - 3024000000 },
  ],
  allTime: [
    { rank: 1, playerName: '伝説のプレイヤー', score: 999999, gameMode: 'expert', timestamp: Date.now() - 31536000000 },
    { rank: 2, playerName: '不滅の王者', score: 850000, gameMode: 'expert', timestamp: Date.now() - 15768000000 },
    { rank: 3, playerName: '永遠のチャンピオン', score: 750000, gameMode: 'expert', timestamp: Date.now() - 7884000000 },
    { rank: 4, playerName: '伝説', score: 650000, gameMode: 'expert', timestamp: Date.now() - 3942000000 },
    { rank: 5, playerName: 'マスター', score: 500000, gameMode: 'hard', timestamp: Date.now() - 1971000000 },
  ]
};

// キャッシュキーの生成
function getCacheKey(period, gameMode) {
  return `ranking:${period}:${gameMode}`;
}

// ランキングデータの取得
async function getRankings(period, gameMode, limit = 10) {
  try {
    // Vercel KVが利用可能な場合
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const cacheKey = getCacheKey(period, gameMode);
      const cached = await kv.get(cacheKey);
      
      if (cached) {
        return cached.slice(0, limit);
      }
      
      // キャッシュがない場合はモックデータを使用（本番では実データベースから取得）
      const rankings = mockRankings[period] || [];
      const filtered = gameMode === 'all' 
        ? rankings 
        : rankings.filter(r => r.gameMode === gameMode);
      
      // キャッシュに保存（5分間）
      await kv.setex(cacheKey, 300, filtered);
      
      return filtered.slice(0, limit);
    } else {
      // KVが利用できない場合はモックデータを返す
      const rankings = mockRankings[period] || [];
      const filtered = gameMode === 'all' 
        ? rankings 
        : rankings.filter(r => r.gameMode === gameMode);
      
      return filtered.slice(0, limit);
    }
  } catch (error) {
    console.error('Error fetching rankings:', error);
    // エラー時はモックデータを返す
    const rankings = mockRankings[period] || [];
    const filtered = gameMode === 'all' 
      ? rankings 
      : rankings.filter(r => r.gameMode === gameMode);
    
    return filtered.slice(0, limit);
  }
}

// 入力パラメータの検証
function validateParams(period, gameMode, limit) {
  const errors = [];
  
  // 期間の検証
  if (!['daily', 'weekly', 'monthly', 'allTime'].includes(period)) {
    errors.push('無効な期間が指定されました');
  }
  
  // ゲームモードの検証
  if (!['all', 'normal', 'hard', 'expert'].includes(gameMode)) {
    errors.push('無効なゲームモードが指定されました');
  }
  
  // 取得件数の検証
  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push('取得件数は1〜100の間で指定してください');
  }
  
  return errors;
}

export default async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).headers(corsHeaders).end();
  }
  
  // GETメソッドのみ受け付ける
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // クエリパラメータの取得
    const { period = 'daily', gameMode = 'all', limit = '10' } = req.query;
    
    // パラメータの検証
    const validationErrors = validateParams(period, gameMode, limit);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: '無効なパラメータです',
        details: validationErrors 
      });
    }
    
    // ランキングデータの取得
    const rankings = await getRankings(period, gameMode, parseInt(limit));
    
    // 成功レスポンス
    return res.status(200).headers(corsHeaders).json({
      success: true,
      period,
      gameMode,
      rankings,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in get rankings:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました' 
    });
  }
}