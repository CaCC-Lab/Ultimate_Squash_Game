#!/bin/bash
# Ultimate Squash Game - ビルドスクリプト
# GitHub Pages デプロイ用の自動ビルド

set -e  # エラー時に停止

echo "🚀 Ultimate Squash Game - ビルド開始"
echo "========================================"

# 1. 環境確認
echo "📋 環境確認..."
python --version
pip --version

# 2. テスト実行
echo ""
echo "🧪 テスト実行..."
cd tests
python -m pytest -v --tb=short || {
    echo "❌ テスト失敗！ビルドを中止します。"
    exit 1
}
cd ..

# 3. 最適化スクリプト実行
echo ""
echo "🔧 最適化処理..."

# バンドルサイズ最適化
if [ -f "simple_bundle_optimizer.py" ]; then
    echo "  📦 バンドルサイズ最適化..."
    python simple_bundle_optimizer.py
fi

# アセット最適化
if [ -f "optimize_assets.py" ]; then
    echo "  🎨 アセット最適化..."
    python optimize_assets.py
fi

# エラーハンドリング強化
if [ -f "enhance_error_handling.py" ]; then
    echo "  🛡️ エラーハンドリング強化..."
    python enhance_error_handling.py
fi

# 4. 最終バンドル作成
echo ""
echo "📦 最終バンドル作成..."
if [ -f "create_optimized_production.py" ]; then
    python create_optimized_production.py
else
    echo "⚠️ 最終バンドル作成スクリプトが見つかりません"
fi

# 5. GitHub Pages用ディレクトリ準備
echo ""
echo "📁 GitHub Pages用ディレクトリ準備..."

# docsディレクトリ作成（存在しない場合）
mkdir -p docs

# ゲームファイルコピー
if [ -f "distribution/index.html" ]; then
    cp distribution/index.html docs/game.html
    echo "  ✅ ゲームファイルコピー完了"
else
    echo "  ❌ 配布ファイルが見つかりません"
    exit 1
fi

# ランディングページ確認
if [ ! -f "docs/index.html" ]; then
    echo "  ⚠️ ランディングページが見つかりません"
fi

# 6. ビルド情報生成
echo ""
echo "📊 ビルド情報生成..."
BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

cat > docs/build-info.json << EOF
{
    "buildDate": "$BUILD_DATE",
    "commitHash": "$BUILD_HASH",
    "version": "1.0.0",
    "pythonVersion": "3.12",
    "pygameVersion": "2.5.0",
    "pyodideVersion": "0.26.4"
}
EOF

# 7. サイズ情報
echo ""
echo "📏 ビルドサイズ情報:"
if [ -f "docs/game.html" ]; then
    GAME_SIZE=$(du -h docs/game.html | cut -f1)
    echo "  ゲームファイル: $GAME_SIZE"
fi

if [ -f "distribution/ultimate_squash_final.tar.gz" ]; then
    BUNDLE_SIZE=$(du -h distribution/ultimate_squash_final.tar.gz | cut -f1)
    echo "  圧縮バンドル: $BUNDLE_SIZE"
fi

echo ""
echo "========================================"
echo "✅ ビルド完了！"
echo ""
echo "📌 次のステップ:"
echo "  1. git add docs/"
echo "  2. git commit -m 'Deploy to GitHub Pages'"
echo "  3. git push"
echo "  4. GitHub Settings > Pages > Source: /docs"
echo ""
echo "🌐 デプロイ後のURL:"
echo "  https://[username].github.io/Ultimate_Squash_Game/"