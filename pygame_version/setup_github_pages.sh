#!/bin/bash
# GitHub Pages セットアップヘルパースクリプト

echo "🚀 GitHub Pages セットアップガイド"
echo "===================================="
echo ""
echo "このスクリプトは、GitHub Pagesの設定手順をガイドします。"
echo ""

# リポジトリ情報取得
REPO_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REPO_URL" ]; then
    echo "❌ Gitリポジトリが見つかりません"
    exit 1
fi

# GitHubユーザー名とリポジトリ名を抽出
if [[ $REPO_URL =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    REPONAME="${BASH_REMATCH[2]}"
else
    echo "⚠️ GitHubリポジトリURLの解析に失敗しました"
    USERNAME="[your-username]"
    REPONAME="Ultimate_Squash_Game"
fi

echo "📋 検出されたリポジトリ情報:"
echo "  ユーザー名: $USERNAME"
echo "  リポジトリ名: $REPONAME"
echo ""

# 現在のブランチ確認
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 現在のブランチ: $CURRENT_BRANCH"
echo ""

# docsディレクトリ確認
if [ -d "docs" ] && [ -f "docs/index.html" ] && [ -f "docs/game.html" ]; then
    echo "✅ docsディレクトリの準備完了"
else
    echo "⚠️ docsディレクトリが不完全です"
    echo "  './build.sh' を実行してください"
fi

echo ""
echo "📌 GitHub Pages 設定手順:"
echo ""
echo "1. ブラウザで以下のURLを開く:"
echo "   https://github.com/$USERNAME/$REPONAME/settings/pages"
echo ""
echo "2. 'Source' セクションで以下を設定:"
echo "   - Source: Deploy from a branch"
echo "   - Branch: $CURRENT_BRANCH"
echo "   - Folder: /docs"
echo ""
echo "3. 'Save' をクリック"
echo ""
echo "4. 数分待つと、以下のURLでゲームにアクセス可能:"
echo "   🌐 https://$USERNAME.github.io/$REPONAME/"
echo ""

# GitHub CLI 確認
if command -v gh &> /dev/null; then
    echo "💡 GitHub CLIがインストールされています"
    echo "   自動設定を試みますか？ (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "GitHub Pages を有効化中..."
        gh api \
            --method PUT \
            -H "Accept: application/vnd.github+json" \
            "/repos/$USERNAME/$REPONAME/pages" \
            -f source='{"branch":"'$CURRENT_BRANCH'","path":"/docs"}' \
            2>/dev/null && echo "✅ GitHub Pages が有効化されました" || echo "❌ 自動設定に失敗しました。手動で設定してください"
    fi
else
    echo "💡 ヒント: GitHub CLIをインストールすると自動設定が可能です"
    echo "   brew install gh  # macOS"
    echo "   詳細: https://cli.github.com/"
fi

echo ""
echo "📊 デプロイ後の確認項目:"
echo "  - [ ] GitHub Actions タブでビルド状況確認"
echo "  - [ ] Settings > Pages でデプロイURL確認"
echo "  - [ ] ゲームページが正常に表示されるか確認"
echo "  - [ ] モバイルデバイスでの動作確認"
echo ""
echo "🎮 Happy Gaming!"