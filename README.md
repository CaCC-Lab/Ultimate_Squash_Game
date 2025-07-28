# Ultimate Squash Game

![E2E Tests](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/E2E%20Tests/badge.svg)
![Code Quality](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/Code%20Quality%20&%20Security/badge.svg)
![Deploy](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)

ブラウザで動作するスカッシュゲーム。AIパワーアップ機能、WebSocket対応のリアルタイムマルチプレイヤー、チャレンジシステムなど多彩な機能を搭載。

## 🎮 プレイ方法

[ゲームをプレイする](https://cacc-lab.github.io/ultimate-squash-game/)

### 操作方法
- **マウス移動**: ラケットを左右に移動
- **クリック**: ゲームリセット
- **スペースキー**: ポーズ/再開
- **Shift+P**: パフォーマンスダッシュボード表示

## 🚀 主な機能

### ゲームプレイ
- **コンボシステム**: 連続ヒットでボーナススコアとスピードブースト
- **適応的難易度調整**: プレイヤーのスキルに応じて自動調整
- **チャレンジシステム**: 日替わり・週替わりチャレンジに挑戦
- **ランキング**: オンラインランキングで世界中のプレイヤーと競争

### 技術的特徴
- **AIコメンタリー**: Ollamaを使用したリアルタイムゲーム解説
- **WebSocketマルチプレイヤー**: リアルタイム対戦機能
- **パフォーマンス最適化**: Web Worker使用で60FPS維持
- **セキュリティ**: CSP実装、XSS対策済み

## 🛠️ 開発環境のセットアップ

### 必要な環境
- Node.js 16以上
- npm または yarn
- モダンブラウザ（Chrome, Firefox, Safari, Edge）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/CaCC-Lab/ultimate-squash-game.git
cd ultimate-squash-game

# 依存関係のインストール
npm install

# Playwright ブラウザのインストール（E2Eテスト用）
npx playwright install
```

### 開発サーバーの起動

```bash
# Python を使用
python -m http.server 8000

# または Node.js を使用
npx http-server docs -p 8000

# ブラウザで開く
open http://localhost:8000
```

### AI機能の有効化（オプション）

```bash
# Ollama のインストール
# https://ollama.ai/ から手順に従ってインストール

# 必要なモデルのダウンロード
ollama pull mistral
```

## 🧪 テスト

### E2Eテスト

```bash
# すべてのE2Eテストを実行
npm test

# 特定のテストスイートを実行
npm run test:e2e:websocket
npm run test:e2e:challenge
npm run test:e2e:integration

# UIモードで実行（デバッグ用）
npm run test:ui

# 特定のブラウザでテスト
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### 単体テスト

```bash
# 単体テストを実行
npm run test:unit

# ウォッチモードで実行
npm run test:unit:watch

# カバレッジレポート生成
npm run test:unit:coverage
```

### コード品質

```bash
# Linting
npm run lint
npm run lint:fix

# フォーマット
npm run format
npm run format:check

# 型チェック
npm run type-check
```

## 🏗️ アーキテクチャ

### ディレクトリ構造

```
docs/
├── index.html          # メインゲームページ
├── js/
│   ├── game.js        # コアゲームエンジン
│   ├── ai/            # AIシステムコンポーネント
│   ├── analytics/     # 分析・モニタリング
│   ├── challenge/     # チャレンジシステム
│   ├── ranking/       # ランキングシステム
│   ├── security/      # セキュリティ機能
│   ├── utils/         # ユーティリティ関数
│   └── websocket/     # WebSocket統合
└── assets/            # ゲームアセット

tests/
├── e2e/              # E2Eテスト
├── unit/             # 単体テスト
└── integration/      # 統合テスト
```

### 主要コンポーネント

- **Game Engine**: Canvas APIを使用したゲームロジック
- **AI System**: Ollamaを使用したゲームコメンタリー
- **Challenge System**: 動的なチャレンジ生成と進捗管理
- **WebSocket**: リアルタイム通信とマルチプレイヤー機能
- **Security**: CSP、XSS対策、入力検証

## 🚀 CI/CD

### GitHub Actions

- **E2E Tests**: プッシュ・PR時に自動実行
- **Code Quality**: ESLint、セキュリティ監査
- **Deploy**: mainブランチへのマージ時にGitHub Pagesへ自動デプロイ

### 品質基準

- E2Eテスト: 95%以上合格
- 単体テストカバレッジ: 80%以上
- パフォーマンス: 60FPS維持
- Lighthouse スコア: 90以上

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発規約

- ES6+ JavaScript
- JSDoc による型アノテーション
- テストファースト開発
- コミットメッセージは日本語可

## 🙏 謝辞

- 開発支援: Claude Code
- テストフレームワーク: Playwright, Jest
- ホスティング: GitHub Pages

---

**注**: 詳細な開発ガイドは `docs/CLAUDE.md` を参照してください。