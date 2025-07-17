# オンラインランキングシステム

## 概要

Ultimate Squash Gameのオンラインランキングシステムは、Vercel Functionsを使用したサーバーレスAPIとして実装されています。プレイヤーのスコアをリアルタイムで集計し、日間、週間、月間、全期間のランキングを提供します。

## 機能

### 1. スコア送信

- プレイヤー名、スコア、ゲームモード、プレイ時間を送信
- HMAC-SHA256によるゲームデータの検証
- レート制限（1分間に10回まで）
- 入力検証とサニタイズ

### 2. ランキング取得

- 期間別ランキング（日間、週間、月間、全期間）
- ゲームモード別フィルタリング
- トップ10表示（設定可能）
- キャッシュによる高速レスポンス

### 3. セキュリティ機能

- ゲームハッシュによる不正スコア防止
- レート制限
- 入力検証
- XSS対策

## 技術仕様

### API エンドポイント

#### スコア送信
```
POST /api/scores/submit
```

リクエストボディ:
```json
{
  "gameData": {
    "playerName": "プレイヤー名",
    "score": 1000,
    "gameMode": "normal",
    "duration": 120,
    "timestamp": 1234567890123
  },
  "gameHash": "SHA256ハッシュ値"
}
```

レスポンス:
```json
{
  "success": true,
  "message": "スコアが正常に登録されました",
  "scoreId": "一意のID",
  "rank": 5
}
```

#### ランキング取得
```
GET /api/scores/get?period=daily&gameMode=all&limit=10
```

パラメータ:
- `period`: daily, weekly, monthly, allTime
- `gameMode`: all, normal, hard, expert
- `limit`: 1-100（デフォルト: 10）

レスポンス:
```json
{
  "success": true,
  "period": "daily",
  "gameMode": "all",
  "rankings": [
    {
      "rank": 1,
      "playerName": "プレイヤー名",
      "score": 15000,
      "gameMode": "expert",
      "timestamp": 1234567890123
    }
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### ゲームハッシュの生成

```javascript
// ゲームデータの文字列化
const dataString = `${playerName}:${score}:${gameMode}:${duration}:${timestamp}`;

// HMAC-SHA256でハッシュ生成
const hash = crypto.createHmac('sha256', SECRET_KEY)
  .update(dataString)
  .digest('hex');
```

### データベース構造

#### Vercel KV（Redis）
```
// スコアデータ
score:{scoreId} = {
  playerName: string,
  score: number,
  gameMode: string,
  duration: number,
  timestamp: number,
  ipAddress: string
}

// ランキングキャッシュ
ranking:{period}:{gameMode} = [
  { rank: 1, playerName: string, score: number, ... }
]
```

#### PostgreSQL（代替案）
```sql
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  game_mode VARCHAR(10) NOT NULL,
  duration INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_period ON scores(created_at, game_mode, score DESC);
```

## 使用方法

### 1. ゲーム内での統合

```javascript
// ゲーム終了時にスコアを送信
async function submitScore() {
  const playerName = document.getElementById('playerNameInput').value;
  const score = pendingScoreData.score;
  const gameMode = 'normal'; // または 'hard', 'expert'
  const duration = Math.floor((Date.now() - gameStartTime) / 1000);
  
  try {
    await rankingSystem.submitScore(playerName, score, gameMode, duration);
    console.log('スコアを送信しました');
  } catch (error) {
    console.error('スコア送信エラー:', error);
  }
}
```

### 2. ランキングの表示

```javascript
// ランキングモーダルを表示
rankingSystem.showRanking();

// 特定の期間・モードのランキングを取得
const rankings = await rankingSystem.fetchRankings('weekly', 'expert');
```

## デプロイ方法

### 1. Vercel CLIを使用

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトのデプロイ
vercel

# 環境変数の設定
vercel env add RANKING_SECRET_KEY
```

### 2. GitHubとの連携

1. GitHubリポジトリをVercelに接続
2. 自動デプロイを設定
3. 環境変数をVercelダッシュボードで設定

### 3. 環境変数

必須:
- `RANKING_SECRET_KEY`: ゲームハッシュ生成用の秘密鍵

オプション（Vercel KV使用時）:
- `KV_REST_API_URL`: Vercel KVのAPIエンドポイント
- `KV_REST_API_TOKEN`: Vercel KVのアクセストークン

## トラブルシューティング

### スコアが送信されない

1. ブラウザのコンソールでエラーを確認
2. ネットワークタブでAPIリクエストを確認
3. CORSエラーの場合は、Vercel設定を確認

### ランキングが表示されない

1. APIエンドポイントが正しいか確認
2. Vercel Functionsが正常に動作しているか確認
3. キャッシュをクリアして再試行

### レート制限エラー

- 1分間に10回以上のリクエストは制限されます
- 時間をおいて再試行してください

## 今後の拡張計画

1. **リアルタイムランキング**
   - WebSocketによるリアルタイム更新
   - ライブランキング表示

2. **詳細統計**
   - プレイヤーごとの統計情報
   - ゲームモード別の分析

3. **ソーシャル機能**
   - フレンドランキング
   - スコアのシェア機能

4. **不正対策の強化**
   - 機械学習による異常検知
   - より高度な検証システム