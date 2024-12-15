# Ultimate Squash Game

AIパワーアップ機能を搭載したクラシックなスカッシュゲームの進化版です。

## 機能

- 複数の難易度レベル
- パワーアップアイテム
- AIによるコメンタリー
- ダイナミックなチャレンジ
- カスタムパワーアップ
- スコアトラッキング
- パーティクルエフェクト
- サウンドエフェクト

## 必要条件

- Python 3.8以上
- Ollama（AIモード用）

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

## 操作方法

- マウス移動: ラケットの操作
- 左クリック: 新規ゲーム開始
- スペースキー: 一時停止/再開
- サイドパネル: 難易度とサウンド設定の変更

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 貢献

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 開発者向け情報

バグ報告や機能リクエストは、GitHubのIssuesページからお願いします。