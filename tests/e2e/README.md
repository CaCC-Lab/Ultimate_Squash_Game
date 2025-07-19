# Phase 3: 週替わりチャレンジシステム E2Eテスト

## 概要

このディレクトリには、週替わりチャレンジシステムの統合テスト（E2Eテスト）が含まれています。Phase 1とPhase 2で実装されたコンポーネントの統合的な動作を検証します。

## テストファイル構成

### 1. `weekly-challenge-integration.spec.js`
- **目的**: 基本的な統合テスト
- **テスト内容**:
  - ChallengeGeneratorの動作確認
  - ChallengeEvaluatorの評価機能
  - ChallengeRewardsの報酬計算
  - 完全な統合フロー
  - 性能テスト

### 2. `weekly-challenge-ui-flow.spec.js`
- **目的**: UI操作フローのテスト
- **テスト内容**:
  - チャレンジ表示ボタン
  - チャレンジモーダル
  - 進捗表示オーバーレイ
  - 完了通知
  - ランキング統合
  - レスポンシブデザイン

### 3. `weekly-challenge-accessibility.spec.js`
- **目的**: アクセシビリティテスト
- **テスト内容**:
  - キーボードナビゲーション
  - スクリーンリーダー対応
  - 色覚異常対応
  - 高コントラストモード
  - フォーカス管理
  - ARIAライブリージョン

## 実行方法

### 全テストの実行
```bash
# すべてのE2Eテストを実行
npx playwright test tests/e2e/

# 特定のテストファイルを実行
npx playwright test tests/e2e/weekly-challenge-integration.spec.js
```

### ヘッドフルモードでの実行
```bash
# ブラウザを表示してテストを実行
npx playwright test tests/e2e/ --headed

# 特定のブラウザで実行
npx playwright test tests/e2e/ --project=chromium
```

### デバッグモード
```bash
# デバッグモードで実行
npx playwright test tests/e2e/ --debug

# UIモードで実行
npx playwright test tests/e2e/ --ui
```

## 前提条件

### 必要なファイル
テストを実行する前に、以下のファイルが存在することを確認してください：

1. **Phase 1のユニットテスト** (完了済み)
   - `tests/unit/challenge-generator.test.js`
   - `tests/unit/challenge-evaluator.test.js`
   - `tests/unit/challenge-rewards.test.js`

2. **Phase 2の実装ファイル** (完了済み)
   - `docs/js/challenge-generator.js`
   - `docs/js/challenge-evaluator.js`
   - `docs/js/challenge-rewards.js`

3. **メインゲームファイル**
   - `docs/game.html`
   - `docs/index.html`

### 開発サーバーの起動
```bash
# docs/フォルダで開発サーバーを起動
cd docs
python -m http.server 8000
```

## テスト結果の確認

### HTMLレポート
```bash
# HTMLレポートを生成
npx playwright test tests/e2e/
npx playwright show-report
```

### JSONレポート
```bash
# JSONレポートを生成
npx playwright test tests/e2e/ --reporter=json
```

### スクリーンショット
失敗時のスクリーンショットは `test-results/` ディレクトリに保存されます。

## 期待される結果

### 統合テスト
- ✅ ChallengeGenerator: 決定論的なチャレンジ生成
- ✅ ChallengeEvaluator: 正確な評価機能
- ✅ ChallengeRewards: 適切な報酬計算
- ✅ 性能テスト: 100チャレンジ/1秒以内

### UIフローテスト
- ✅ チャレンジ表示ボタンの動作
- ✅ モーダルの適切な表示
- ✅ 進捗表示の更新
- ✅ 完了通知の表示
- ✅ ランキング統合
- ✅ レスポンシブデザイン

### アクセシビリティテスト
- ✅ キーボードナビゲーション
- ✅ ARIA属性の適切な設定
- ✅ 色覚異常対応
- ✅ 高コントラストモード
- ✅ フォーカス管理
- ✅ ライブリージョン

## トラブルシューティング

### よくある問題

1. **ローディングタイムアウト**
   ```bash
   # タイムアウトを延長
   npx playwright test tests/e2e/ --timeout=60000
   ```

2. **開発サーバーが起動していない**
   ```bash
   # 開発サーバーを起動
   cd docs && python -m http.server 8000
   ```

3. **JavaScriptエラー**
   - ブラウザのコンソールログを確認
   - 必要なファイルが存在するか確認

### デバッグ方法

1. **ブラウザコンソールの確認**
   ```javascript
   // テスト中にコンソールログを監視
   page.on('console', (msg) => {
     console.log('Browser console:', msg.text());
   });
   ```

2. **スクリーンショットの取得**
   ```javascript
   // 任意のタイミングでスクリーンショットを取得
   await page.screenshot({ path: 'debug-screenshot.png' });
   ```

3. **要素の待機**
   ```javascript
   // 要素が表示されるまで待機
   await page.waitForSelector('#challengeElement', { state: 'visible' });
   ```

## 今後の拡張

### 追加テストの提案
1. **パフォーマンステスト**
   - 大量データでの動作確認
   - メモリリーク検出
   - ネットワーク遅延対応

2. **多言語対応テスト**
   - 国際化対応の確認
   - 文字エンコーディング
   - 右から左への言語対応

3. **セキュリティテスト**
   - XSS対策の確認
   - データバリデーション
   - ローカルストレージのセキュリティ

### 継続的インテグレーション
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test tests/e2e/
```

## 結論

Phase 3のE2Eテストにより、週替わりチャレンジシステムの統合的な動作が確認されます。これにより、ユーザーエクスペリエンスの品質とアクセシビリティが保証されます。