# Ultimate Squash Game - アナリティクスシステムガイド

## 概要

Ultimate Squash Gameのアナリティクスシステムは、プライバシーに配慮しながらゲーム体験の向上に必要なデータを収集・分析します。GDPR/CCPA準拠の同意管理システムを実装し、ユーザーのプライバシーを最優先に設計されています。

## 主な機能

### 1. プライバシーファーストの設計
- **同意ベースの収集**: ユーザーの明示的な同意なしにデータは収集されません
- **GDPR/CCPA準拠**: 国際的なプライバシー規制に準拠
- **データ削除権**: ユーザーはいつでもデータの削除を要求できます
- **透明性**: 収集するデータと利用目的を明確に開示

### 2. 収集するデータ

#### ゲームプレイ統計
- ゲーム開始/終了イベント
- スコア進行
- プレイ時間
- アクション数（キー入力回数）
- ゲームモード（通常、チャレンジ等）

#### 技術情報
- ブラウザ情報（種類、バージョン）
- 画面解像度
- 言語設定
- デバイスタイプ（デスクトップ/モバイル）

#### パフォーマンスメトリクス
- ページ読み込み時間
- フレームレート（FPS）
- ネットワーク品質

### 3. 収集しないデータ
- 個人識別可能情報（名前、メールアドレス等）
- 正確な位置情報
- 他サイトの閲覧履歴
- デバイス内の個人ファイル

## 実装詳細

### ファイル構成
```
docs/
├── js/
│   └── analytics.js        # アナリティクスモジュール
└── game.html              # 統合済みのメインゲームファイル
```

### 主要クラス

#### GameAnalytics
メインのアナリティクスクラス。以下の機能を提供：

```javascript
class GameAnalytics {
    // 同意管理
    checkConsent()          // 同意状態の確認
    acceptConsent()         // 同意の受け入れ
    rejectConsent()         // 同意の拒否
    
    // イベントトラッキング
    trackEvent(eventName, parameters)
    trackGameStart(difficulty, gameMode)
    trackGameEnd(finalScore, duration, winner)
    trackAction(actionType, success)
    trackScoreChange(playerScore, aiScore)
    
    // プライバシー管理
    showPrivacySettings()   // 詳細設定UIの表示
    clearAllData()         // すべてのデータ削除
}
```

### 統合ポイント

#### 1. ゲーム開始時
```python
js.gameAnalytics.trackGameStart("normal", "single_player")
```

#### 2. スコア変更時
```python
js.gameAnalytics.trackScoreChange(self.score.player_score, self.score.ai_score)
```

#### 3. キー入力時
```python
js.gameAnalytics.trackAction("paddle_move", True)
```

#### 4. ゲーム終了時
```python
js.gameAnalytics.trackGameEnd(json.dumps(final_score), duration, winner)
```

## 同意管理フロー

### 初回訪問時
1. ページ読み込み時に同意バナーが表示される
2. ユーザーは以下の選択肢から選ぶ：
   - 「同意する」: データ収集を許可
   - 「拒否する」: データ収集を拒否
   - 「詳細設定」: 詳細なプライバシー設定画面を表示

### 同意状態の保存
- ローカルストレージに保存: `analytics_consent`
- 値: `"granted"` または `"denied"`

### プライバシー設定UI
詳細設定ボタンから以下の情報にアクセス可能：
- 収集するデータの詳細説明
- データの利用目的
- ユーザーの権利（GDPR/CCPA）
- データ削除オプション

## A/Bテスト機能

システムは自動的にユーザーを異なる実験グループに割り当てます：

```javascript
experiments: {
    'difficulty_algorithm': ['classic', 'adaptive'],
    'sound_effects': ['enabled', 'disabled'],
    'ui_theme': ['light', 'dark']
}
```

## パフォーマンス最適化

### バッチ処理
- アクションイベントは100回ごとにバッチ送信
- ネットワーク負荷を軽減

### 条件付きトラッキング
- 低FPS（30未満）の場合のみパフォーマンス問題を記録
- マイルストーンスコア（10点ごと）でのみスコア進行を記録

## セキュリティ考慮事項

### データの匿名化
- ユーザーIDは生成されず、セッションIDのみ使用
- IPアドレスは匿名化される（Google Analyticsの設定）

### HTTPS通信
- すべてのデータ送信はHTTPS経由
- 中間者攻撃からの保護

## トラブルシューティング

### 同意バナーが表示されない
1. ブラウザの開発者ツールでコンソールエラーを確認
2. `analytics.js`が正しく読み込まれているか確認
3. ローカルストレージをクリアして再試行

### データが送信されない
1. 同意状態を確認: `localStorage.getItem('analytics_consent')`
2. ネットワークタブでリクエストを確認
3. Google Analytics測定IDが正しく設定されているか確認

## 今後の拡張計画

### 計画中の機能
- カスタムダッシュボードの実装
- リアルタイムレポート機能
- 週次/月次サマリーメール
- プレイヤー行動のヒートマップ

### データ活用例
- ゲームバランスの調整（難易度曲線の最適化）
- 人気機能の特定と優先開発
- バグの早期発見（エラー率の監視）
- UX改善（離脱ポイントの特定）

## 開発者向け情報

### テスト環境での無効化
```javascript
// デバッグモードをオフにする
gameAnalytics.debug = false;

// または同意を拒否状態にする
localStorage.setItem('analytics_consent', 'denied');
```

### カスタムイベントの追加
```javascript
// 新しいイベントタイプを追加
gameAnalytics.trackEvent('custom_event', {
    category: 'gameplay',
    action: 'special_move',
    value: 100
});
```

## 法的コンプライアンス

### GDPR（EU一般データ保護規則）
- 明示的な同意の取得
- データポータビリティの権利
- 忘れられる権利（データ削除）
- データ処理の透明性

### CCPA（カリフォルニア州消費者プライバシー法）
- オプトアウトの権利
- 個人情報の販売禁止
- データ収集の開示
- 差別の禁止

## サポート

問題や質問がある場合は、以下の方法でサポートを受けられます：
- GitHubイシューの作成
- プライバシーポリシーページの確認
- ゲーム内の「プライバシー設定」から詳細情報にアクセス

---

最終更新: 2025年1月
バージョン: 1.0.0