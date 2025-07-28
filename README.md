# Ultimate Squash Game

![E2E Tests](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/E2E%20Tests/badge.svg)
![Code Quality](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/Code%20Quality%20&%20Security/badge.svg)
![Deploy](https://github.com/CaCC-Lab/ultimate-squash-game/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)

AI パワーアップ機能を搭載したクラシックなスカッシュゲーム。MVCパターンで実装され、TDDで開発されています。

## 🎮 ゲーム概要

ラケットでボールを打ち返すクラシックなスカッシュゲーム。コンボシステムとAI統合機能（開発中）を特徴としています。

### 主な機能
- **コンボシステム**: 連続ヒットでボーナススコア獲得
- **難易度設定**: Easy / Normal / Hard（開発予定）
- **サウンドエフェクト**: Windows環境でビープ音対応
- **AI機能**: Ollamaと連携したゲームアシスタント（開発予定）

## 🚀 必要環境

- Python 3.6 以上
- tkinter（通常はPythonに含まれています）
- Ollama（AI機能使用時のみ）

## セットアップ

1. リポジトリのクローン:
```bash
git clone https://github.com/CaCC-Lab/ultimate-squash-game.git
cd ultimate-squash-game
```

2. 必要なパッケージのインストール:
```bash
pip install -r requirements.txt
```

3. Ollamaのインストール（AIモード用）:
- [Ollama公式サイト](https://ollama.ai/)の手順に従ってインストール

4. 必要なモデルのダウンロード:
```bash
ollama pull mistral
```

## 実行方法

```bash
python main.py
```

または:

```bash
./run.sh
```

## 🎮 操作方法

- **マウス移動**: ラケットを左右に移動
- **クリック**: ゲームリセット
- **スペースキー**: ポーズ/再開

## 🏗️ アーキテクチャ

### MVCパターン実装

```
src/
├── model/          # Model層（ゲーム状態管理）
│   └── game_state.py   - ゲームロジック、物理演算
├── view/           # View層（UI描画）
│   └── game_view.py    - tkinter描画、Observerパターン
├── controller/     # Controller層（制御）
│   └── game_controller.py - イベント処理、Model-View協調
└── game/           # レガシーコード
    └── engine.py       - 元のモノリシック実装
```

### Observerパターン
- `GameState`（Model）が状態変更時に`GameView`（View）へ自動通知
- Model-View間の疎結合を実現
- 拡張性とテスタビリティの向上

## 🧪 開発

### テスト駆動開発（TDD）

#### 最新テスト状況（2025-07-28更新）
**単体テスト**: ✅ 100%成功 (9/9ファイル修正完了)  
**E2Eテスト**: ✅ 96.7%成功 (1/30失敗)  
**パフォーマンス**: ✅ 3.4秒完了 (82%改善達成)

#### Python単体テスト

```bash
# すべてのテストを実行
python -m pytest

# 特定のテストを実行
python -m pytest tests/test_game_state.py -v

# カバレッジレポート
python -m pytest --cov=src tests/
```

#### E2Eテスト（Playwright）

```bash
# E2Eテストの実行
npm test

# ヘッドフルモード（ブラウザ表示）
npm run test:headed

# UIモード（テストデバッガー）
npm run test:ui

# 特定のブラウザでテスト
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### テスト構成

#### Python単体テスト
- **特性化テスト**: 既存動作の記録（11テスト）
- **ユニットテスト**: 各コンポーネントの単体テスト
  - GameState: 18テスト
  - GameController: 5テスト
- **統合テスト**: MVC連携の検証

#### E2Eテスト（WebAssembly版）
- **ゲーム起動テスト**: HTML読み込み、Pyodide初期化の確認
- **インタラクションテスト**: キーボード操作、マウス操作の確認
- **サウンドシステムテスト**: AudioContext、BGM、効果音の確認
- **ADAシステムテスト**: 適応的難易度調整の確認
- **UIコントロールテスト**: ランキング、設定保存の確認
- **レスポンシブテスト**: 異なる画面サイズでの動作確認
- **クロスブラウザテスト**: Chromium、Firefox、WebKitでの確認
- **パフォーマンステスト**: FPS、メモリリーク、安定性の確認

### CI/CDパイプライン

プロジェクトは包括的なCI/CDパイプラインを備えています：

#### 自動テスト（GitHub Actions）
- **E2E Tests**: すべてのプッシュとPRで自動実行
- **Code Quality & Security**: 依存関係監査、コード品質メトリクス
- **クロスブラウザ・Node.jsマトリックステスト**: 複数環境での検証

#### 自動デプロイ
- **GitHub Pages**: mainブランチへのマージ時にE2Eテスト通過後の自動デプロイ
- **スモークテスト**: デプロイ後の本番環境での動作確認

#### 品質監視
- **セキュリティ監査**: 週次での脆弱性チェック
- **パフォーマンス監視**: ファイルサイズ、読み込み時間の追跡
- **テストカバレッジ**: 自動的なカバレッジレポート生成

### 開発規約
- **TDD必須**: テストファースト開発
- **モック禁止**: 実環境でのテスト実施
- **エラー3要素**: エラーメッセージに「何が・なぜ・どうすれば」を含める

## 🎯 プロジェクトステータス

### 完了フェーズ
- ✅ **フェーズ1**: プロジェクト基盤整備
- ✅ **フェーズ1.5**: MVCパターンリファクタリング
- ✅ **テスト修正フェーズ**: 単体テスト100%修正、E2E最適化完了
- ✅ **「クリーンな前進」戦略**: Gemini協議による品質プロセス確立

### 進行中・予定
- 🔄 **フェーズ2**: コアゲームのTDD実装
- 📅 **フェーズ3**: AI接続機能
- 📅 **フェーズ4**: AI統合とエンハンサー
- 📅 **フェーズ5**: 最終品質確認

### 最新の成果（2025-07-28）
- **テスト安定化**: E2E実行時間を18.8s→3.4sに82%改善
- **品質向上**: 単体テスト9ファイル完全修正、100%成功率達成
- **開発プロセス**: 緊急修復手順とテスト前実行の徹底確立

詳細は [TODO.md](TODO.md) を参照してください。

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約
- Python PEP 8 準拠
- 日本語コメント推奨
- TDD実践必須
- 個人開発規約の遵守

## 🙏 謝辞

- 開発支援: Claude Code + Gemini CLI [AI-PAIRED]
- アーキテクチャ設計: MVCパターン + Observerパターン
- テスト手法: 特性化テスト（Characterization Testing）

---

**注**: このプロジェクトは個人開発規約に基づいて開発されています。詳細は `.claude/CLAUDE.md` を参照してください。