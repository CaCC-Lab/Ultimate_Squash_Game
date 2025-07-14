# Ultimate Squash Game - デプロイメントガイド

## 概要

このガイドでは、Ultimate Squash GameのPygame-CE版をGitHub Pagesにデプロイする手順を説明します。

## 前提条件

- Git/GitHubアカウント
- Python 3.12環境
- 基本的なコマンドライン操作の知識

## デプロイ手順

### 1. 自動デプロイ（推奨）

GitHub Actionsを使用した自動デプロイが設定されています。

#### 有効化手順

1. GitHubリポジトリの **Settings** タブを開く
2. 左サイドバーから **Pages** を選択
3. **Source** セクションで以下を設定：
   - Source: `Deploy from a branch`
   - Branch: `main` または `feature/pygame-wasm-migration`
   - Folder: `/docs`
4. **Save** をクリック

#### 自動デプロイのトリガー

以下の条件で自動デプロイが実行されます：

- `main`ブランチへのプッシュ（`pygame_version/`内の変更時）
- `feature/pygame-wasm-migration`ブランチへのプッシュ
- 手動トリガー（Actions → Deploy Pygame Version → Run workflow）

### 2. 手動デプロイ

ローカル環境でビルドしてデプロイする場合：

```bash
# 1. プロジェクトディレクトリに移動
cd pygame_version

# 2. ビルドスクリプトを実行
./build.sh

# 3. 生成されたファイルをコミット
git add docs/
git commit -m "Deploy: Update game files"
git push origin main
```

### 3. デプロイの確認

1. **GitHub Actions**タブで、ワークフローの実行状況を確認
2. デプロイ完了後、以下のURLでアクセス可能：
   ```
   https://[your-username].github.io/Ultimate_Squash_Game/
   ```

## ディレクトリ構造

```
pygame_version/
├── docs/                    # GitHub Pages用ディレクトリ
│   ├── index.html          # ランディングページ
│   ├── game.html           # ゲーム本体
│   └── build-info.json     # ビルド情報
├── distribution/            # 配布用ファイル
│   ├── index.html          # 最適化済みゲーム
│   └── *.tar.gz           # 圧縮バンドル
└── build.sh                # ビルドスクリプト
```

## ビルドプロセス

`build.sh`スクリプトは以下の処理を実行します：

1. **環境確認**: Python/pipバージョン確認
2. **テスト実行**: すべてのテストが成功することを確認
3. **最適化処理**:
   - バンドルサイズ最適化
   - アセット最適化（SVG、Web Audio）
   - エラーハンドリング強化
4. **バンドル作成**: 最終配布ファイル生成
5. **GitHub Pages準備**: `docs/`ディレクトリへファイルコピー
6. **ビルド情報生成**: バージョン、日時などのメタデータ

## カスタムドメイン設定（オプション）

独自ドメインを使用する場合：

1. `docs/CNAME`ファイルを作成
2. ドメイン名を記入（例: `game.example.com`）
3. DNSレコードを設定：
   - Aレコード: `185.199.108.153`
   - Aレコード: `185.199.109.153`
   - Aレコード: `185.199.110.153`
   - Aレコード: `185.199.111.153`

## トラブルシューティング

### ビルドエラー

```bash
# テストのみ実行して確認
cd tests
python -m pytest -v

# 個別の最適化スクリプトを実行
python optimize_assets.py
python enhance_error_handling.py
```

### デプロイが反映されない

1. GitHub Pages設定を確認
2. キャッシュをクリア（ブラウザ）
3. 数分待つ（GitHub Pagesの反映に時間がかかる場合がある）

### パフォーマンス問題

- Lighthouse CIの結果を確認
- Chrome DevToolsでパフォーマンスプロファイリング
- ネットワークタブで読み込み時間を確認

## パフォーマンス指標

目標値：

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Performance Score**: > 90
- **ファイルサイズ**: < 10KB（圧縮）

## セキュリティ考慮事項

- すべてのアセットは自己完結型（外部CDN不要）
- HTTPSで配信（GitHub Pages標準）
- CSP（Content Security Policy）対応済み
- XSS対策実装済み

## 更新とメンテナンス

### 定期更新

1. 依存関係の更新確認
2. セキュリティパッチの適用
3. パフォーマンステストの実施

### バージョン管理

- セマンティックバージョニング使用
- `build-info.json`にビルド情報記録
- GitHubリリース機能の活用

## 関連リンク

- [GitHub Pages公式ドキュメント](https://docs.github.com/pages)
- [GitHub Actions公式ドキュメント](https://docs.github.com/actions)
- [Pyodide公式サイト](https://pyodide.org)
- [Pygame-CE公式サイト](https://pyga.me)

---

最終更新: 2025-07-15