// Vercel Function: スコア送信API
import crypto from 'crypto';

// 環境変数から秘密鍵を取得
const SECRET_KEY = process.env.RANKING_SECRET_KEY || 'default-secret-key-change-in-production';

// レート制限用のメモリストレージ（本番環境ではRedisを使用推奨）
const rateLimitMap = new Map();

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ゲームハッシュの検証
function validateGameHash(gameData, providedHash) {
  const { playerName, score, gameMode, duration, timestamp } = gameData;
  const dataString = `${playerName}:${score}:${gameMode}:${duration}:${timestamp}`;
  const expectedHash = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(dataString)
    .digest('hex');
  
  return expectedHash === providedHash;
}

// レート制限のチェック
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // 1分以内のリクエストをフィルタ
  const recentRequests = userRequests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 10) {
    return false; // レート制限に達した
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
  // メモリクリーンアップ（1時間ごと）
  if (Math.random() < 0.01) {
    const oneHourAgo = now - 3600000;
    for (const [key, times] of rateLimitMap.entries()) {
      const filtered = times.filter(time => time > oneHourAgo);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }
  
  return true;
}

// 入力データの検証
function validateInput(data) {
  const errors = [];
  
  // プレイヤー名
  if (!data.playerName || typeof data.playerName !== 'string') {
    errors.push('プレイヤー名が無効です');
  } else if (data.playerName.length < 1 || data.playerName.length > 20) {
    errors.push('プレイヤー名は1〜20文字である必要があります');
  } else if (!/^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(data.playerName)) {
    errors.push('プレイヤー名に使用できない文字が含まれています');
  }
  
  // スコア
  if (typeof data.score !== 'number' || data.score < 0 || data.score > 999999) {
    errors.push('スコアが無効です');
  }
  
  // ゲームモード
  if (!['normal', 'hard', 'expert'].includes(data.gameMode)) {
    errors.push('ゲームモードが無効です');
  }
  
  // プレイ時間
  if (typeof data.duration !== 'number' || data.duration < 0 || data.duration > 86400) {
    errors.push('プレイ時間が無効です');
  }
  
  // タイムスタンプ
  if (typeof data.timestamp !== 'number') {
    errors.push('タイムスタンプが無効です');
  } else {
    const now = Date.now();
    const diff = Math.abs(now - data.timestamp);
    if (diff > 300000) { // 5分以上の差
      errors.push('タイムスタンプが古すぎるか新しすぎます');
    }
  }
  
  return errors;
}

export default async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).headers(corsHeaders).end();
  }
  
  // POSTメソッドのみ受け付ける
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // IPアドレスを取得（Vercelの場合）
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // レート制限チェック
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ 
        error: 'レート制限に達しました。1分後に再試行してください。' 
      });
    }
    
    // リクエストボディの解析
    const { gameData, gameHash } = req.body;
    
    if (!gameData || !gameHash) {
      return res.status(400).json({ 
        error: '必要なデータが不足しています' 
      });
    }
    
    // 入力検証
    const validationErrors = validateInput(gameData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: '入力データが無効です',
        details: validationErrors 
      });
    }
    
    // ゲームハッシュの検証
    if (!validateGameHash(gameData, gameHash)) {
      return res.status(400).json({ 
        error: 'ゲームデータの検証に失敗しました' 
      });
    }
    
    // TODO: ここでデータベースに保存
    // 現在は仮実装として成功レスポンスを返す
    console.log('Score submission:', gameData);
    
    // 成功レスポンス
    return res.status(200).headers(corsHeaders).json({
      success: true,
      message: 'スコアが正常に登録されました',
      scoreId: crypto.randomBytes(16).toString('hex'),
      rank: Math.floor(Math.random() * 100) + 1 // 仮のランク
    });
    
  } catch (error) {
    console.error('Score submission error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました' 
    });
  }
}