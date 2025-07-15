# Ultimate Squash Game - Production Bundle

## 概要
Ultimate Squash GameのPyodide/WebAssembly版本番配布用バンドルです。

## バンドル情報
- **展開サイズ**: 118,002 bytes
- **圧縮サイズ**: 25,373 bytes  
- **圧縮率**: 78.5%

## ファイル構成
```
production/
├── optimized_bundle.html    # メインHTMLファイル（最適化済み）
├── src/                     # 最適化されたPythonソースコード
└── ultimate_squash_production.tar.gz  # 圧縮バンドル
```

## デプロイ方法

### 1. 基本的なWebサーバー
```bash
# 静的ファイルとして配信
cp optimized_bundle.html index.html
# Webサーバーのドキュメントルートに配置
```

### 2. GitHub Pages
```bash
# リポジトリのpublicブランチに配置
git checkout -b public
cp optimized_bundle.html index.html
git add index.html
git commit -m "Deploy production bundle"
git push origin public
```

### 3. CDN配信
- CloudFlare Pages
- Vercel
- Netlify

## 最適化内容
1. **Pythonコード最適化**: コメント・空行除去 (-14.3%)
2. **HTML最小化**: 空白・コメント除去 (-32.9%)
3. **依存関係最適化**: 必要最小限のコードのみ
4. **gzip圧縮**: 追加で約70%サイズ削減可能

## 技術仕様
- **Python**: 3.12
- **Pyodide**: 0.26.4+
- **Pygame-CE**: 2.5.0
- **WebAssembly**: ✅
- **クロスブラウザ**: Chrome, Firefox, Safari対応

## パフォーマンス
- **ロード時間**: < 3秒 (高速回線)
- **メモリ使用量**: < 2MB (実測値: 1.21MB)
- **FPS**: 60 FPS (アダプティブ品質制御)

## 更新履歴
- v1.0.0: 初回リリース
- 最適化日: 2025-07-14 23:41:55
