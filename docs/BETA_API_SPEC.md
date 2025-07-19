# ベータテストAPI仕様書

## 概要

Ultimate Squash Gameのベータテストシステムで使用するバックエンドAPIの仕様を定義します。
このAPIは、フィードバックの収集、ベータユーザーの管理、統計データの集計を担当します。

## エンドポイント一覧

### 1. ベータ登録

#### POST /api/beta/enroll
ベータテストへの参加登録

**リクエスト:**
```json
{
  "userId": "beta_1234567890_abc123",
  "email": "user@example.com",  // optional
  "browserInfo": {
    "userAgent": "Mozilla/5.0...",
    "language": "ja",
    "platform": "Win32"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "enrollment": {
    "id": "enr_abc123",
    "userId": "beta_1234567890_abc123",
    "enrolledAt": "2025-01-20T10:00:00Z",
    "expiresAt": "2025-02-19T10:00:00Z",
    "features": ["weekly_challenge", "ai_adaptive", "custom_paddles"]
  }
}
```

### 2. フィードバック送信

#### POST /api/beta/feedback
ベータテスターからのフィードバック送信

**リクエスト:**
```json
{
  "feedbackId": "fb_1234567890_xyz",
  "userId": "beta_1234567890_abc123",
  "category": "bug",
  "severity": "major",
  "title": "AIが突然動かなくなる",
  "description": "詳細な説明...",
  "frequency": "always",
  "systemInfo": {
    "browser": "Chrome 120",
    "resolution": "1920x1080",
    "platform": "Windows"
  },
  "gameState": {
    "score": [10, 5],
    "gameTime": 180,
    "difficulty": "normal"
  },
  "screenshot": "data:image/png;base64,..."  // optional
}
```

**レスポンス:**
```json
{
  "success": true,
  "feedbackId": "fb_1234567890_xyz",
  "message": "フィードバックを受け付けました",
  "ticketNumber": "BETA-2025-0042"
}
```

### 3. フィードバック一覧取得

#### GET /api/beta/feedback/:userId
特定ユーザーのフィードバック履歴を取得

**レスポンス:**
```json
{
  "feedbacks": [
    {
      "id": "fb_1234567890_xyz",
      "title": "AIが突然動かなくなる",
      "category": "bug",
      "severity": "major",
      "status": "investigating",
      "createdAt": "2025-01-20T10:30:00Z",
      "response": {
        "message": "ご報告ありがとうございます。現在調査中です。",
        "updatedAt": "2025-01-20T11:00:00Z"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

### 4. ベータ統計取得

#### GET /api/beta/stats/:userId
ベータテスターの統計情報を取得

**レスポンス:**
```json
{
  "userId": "beta_1234567890_abc123",
  "stats": {
    "daysActive": 7,
    "feedbackCount": 15,
    "bugReports": 8,
    "featureRequests": 5,
    "gamesPlayed": 142,
    "totalPlayTime": 7200,
    "challengesCompleted": 3
  },
  "badges": ["early_adopter", "bug_hunter", "feedback_champion"],
  "rank": 42
}
```

### 5. ベータ機能設定

#### GET /api/beta/features
利用可能なベータ機能の一覧と設定を取得

**レスポンス:**
```json
{
  "features": {
    "weekly_challenge": {
      "enabled": true,
      "name": "ウィークリーチャレンジ",
      "description": "毎週更新される特別なゲームモード",
      "rolloutPercentage": 100
    },
    "ai_adaptive": {
      "enabled": true,
      "name": "AI適応難易度",
      "description": "プレイヤーのスキルに応じて動的に調整",
      "rolloutPercentage": 100
    },
    "multiplayer": {
      "enabled": false,
      "name": "マルチプレイヤー",
      "description": "オンライン対戦機能（開発中）",
      "rolloutPercentage": 0
    }
  }
}
```

### 6. フィードバックへの返信

#### POST /api/beta/feedback/:feedbackId/response
開発チームからのフィードバックへの返信（管理者用）

**リクエスト:**
```json
{
  "message": "ご報告ありがとうございます。次回のアップデートで修正予定です。",
  "status": "accepted",
  "expectedFix": "v1.2.0"
}
```

### 7. ベータ終了

#### POST /api/beta/exit
ベータテストからの離脱

**リクエスト:**
```json
{
  "userId": "beta_1234567890_abc123",
  "reason": "time_constraints",  // optional
  "feedback": "とても楽しかったです"  // optional
}
```

## エラーレスポンス

標準的なエラーレスポンス形式：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FEEDBACK",
    "message": "フィードバックの形式が正しくありません",
    "details": {
      "field": "title",
      "issue": "必須項目です"
    }
  }
}
```

### エラーコード一覧

| コード | 説明 | HTTPステータス |
|-------|------|---------------|
| BETA_NOT_ENROLLED | ベータ未登録 | 403 |
| BETA_EXPIRED | ベータ期限切れ | 403 |
| INVALID_FEEDBACK | 無効なフィードバック | 400 |
| RATE_LIMIT_EXCEEDED | レート制限超過 | 429 |
| SERVER_ERROR | サーバーエラー | 500 |

## 認証

### ヘッダー
```
X-Beta-User-ID: beta_1234567890_abc123
X-Beta-Session: session_token_here
```

## レート制限

- フィードバック送信: 10件/時間
- API全体: 100リクエスト/時間

## Webhook

### フィードバック受信通知
重要なフィードバックが送信された際に、開発チームのSlackに通知

```json
{
  "event": "feedback.received",
  "data": {
    "feedbackId": "fb_1234567890_xyz",
    "userId": "beta_1234567890_abc123",
    "category": "bug",
    "severity": "critical",
    "title": "ゲームがクラッシュする"
  },
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## データベーススキーマ

### beta_enrollments
```sql
CREATE TABLE beta_enrollments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255),
  enrolled_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  active BOOLEAN DEFAULT true,
  browser_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### beta_feedbacks
```sql
CREATE TABLE beta_feedbacks (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  frequency VARCHAR(50),
  system_info JSONB,
  game_state JSONB,
  screenshot TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES beta_enrollments(user_id)
);
```

### beta_feedback_responses
```sql
CREATE TABLE beta_feedback_responses (
  id SERIAL PRIMARY KEY,
  feedback_id VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50),
  expected_fix VARCHAR(50),
  responded_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES beta_feedbacks(id)
);
```

## 実装例（Node.js/Express）

```javascript
const express = require('express');
const router = express.Router();

// ベータ登録
router.post('/beta/enroll', async (req, res) => {
  try {
    const { userId, email, browserInfo } = req.body;
    
    // 既存の登録チェック
    const existing = await db.query(
      'SELECT * FROM beta_enrollments WHERE user_id = $1',
      [userId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: '既にベータテストに参加しています'
        }
      });
    }
    
    // 新規登録
    const enrollment = await db.query(
      `INSERT INTO beta_enrollments 
       (id, user_id, email, browser_info, enrolled_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days')
       RETURNING *`,
      [`enr_${Date.now()}`, userId, email, browserInfo]
    );
    
    res.json({
      success: true,
      enrollment: enrollment.rows[0]
    });
    
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
});

// フィードバック送信
router.post('/beta/feedback', rateLimiter, async (req, res) => {
  try {
    const feedback = req.body;
    
    // バリデーション
    if (!feedback.title || !feedback.description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK',
          message: '必須項目が入力されていません'
        }
      });
    }
    
    // 保存
    await db.query(
      `INSERT INTO beta_feedbacks 
       (id, user_id, category, severity, title, description, 
        frequency, system_info, game_state, screenshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        feedback.feedbackId,
        feedback.userId,
        feedback.category,
        feedback.severity,
        feedback.title,
        feedback.description,
        feedback.frequency,
        feedback.systemInfo,
        feedback.gameState,
        feedback.screenshot
      ]
    );
    
    // Webhook通知（重要なフィードバックの場合）
    if (feedback.severity === 'critical') {
      await notifySlack(feedback);
    }
    
    res.json({
      success: true,
      feedbackId: feedback.feedbackId,
      message: 'フィードバックを受け付けました',
      ticketNumber: `BETA-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
    });
    
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'フィードバックの送信に失敗しました'
      }
    });
  }
});

module.exports = router;
```

## セキュリティ考慮事項

1. **入力検証**: すべての入力データをサニタイズ
2. **レート制限**: DoS攻撃を防ぐためのレート制限
3. **認証**: ベータユーザーIDの検証
4. **データ暗号化**: HTTPSでの通信必須
5. **スクリーンショット**: サイズ制限（最大5MB）

## 監視とメトリクス

### 監視項目
- APIレスポンスタイム
- エラー率
- フィードバック送信数/日
- アクティブベータユーザー数

### アラート設定
- エラー率 > 5%
- レスポンスタイム > 1秒
- フィードバック送信失敗率 > 10%

---

最終更新: 2025年1月
バージョン: 1.0.0