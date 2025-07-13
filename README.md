# Ultimate Squash Game

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
git clone https://github.com/yourusername/ultimate-squash-game.git
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

```bash
# すべてのテストを実行
python -m pytest

# 特定のテストを実行
python -m pytest tests/test_game_state.py -v

# カバレッジレポート
python -m pytest --cov=src tests/
```

### テスト構成
- **特性化テスト**: 既存動作の記録（11テスト）
- **ユニットテスト**: 各コンポーネントの単体テスト
  - GameState: 18テスト
  - GameController: 5テスト
- **統合テスト**: MVC連携の検証

### 開発規約
- **TDD必須**: テストファースト開発
- **モック禁止**: 実環境でのテスト実施
- **エラー3要素**: エラーメッセージに「何が・なぜ・どうすれば」を含める

## 🎯 プロジェクトステータス

### 完了フェーズ
- ✅ **フェーズ1**: プロジェクト基盤整備
- ✅ **フェーズ1.5**: MVCパターンリファクタリング

### 進行中・予定
- 🔄 **フェーズ2**: コアゲームのTDD実装
- 📅 **フェーズ3**: AI接続機能
- 📅 **フェーズ4**: AI統合とエンハンサー
- 📅 **フェーズ5**: 最終品質確認

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