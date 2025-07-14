# Ultimate Squash Game - 配布バンドル

## 概要
Ultimate Squash GameのPython/WebAssembly版最終配布バンドルです。

## ファイル構成
- `index.html` - メインゲームファイル（自己完結型）

## 特徴
- **軽量**: 約24KB（圧縮なし）
- **自己完結**: 外部依存なし
- **PWA対応**: オフライン動作可能
- **効果音内蔵**: Web Audio API
- **レスポンシブ**: モバイル対応

## デプロイ方法

### 1. 基本的なWebサーバー
```bash
# index.htmlを静的ファイルとして配信
```

### 2. GitHub Pages
```bash
git add distribution/index.html
git commit -m "Deploy game"
git push origin main
```

### 3. CDN/ホスティングサービス
- Vercel
- Netlify  
- CloudFlare Pages

## 技術仕様
- **Python**: 3.12 (Pyodide)
- **WebAssembly**: あり
- **音声**: Web Audio API（外部ファイル不要）
- **アイコン**: SVG（スケーラブル）
- **キャッシュ**: ブラウザキャッシュ対応

---
作成日時: 2025-07-15 05:53:08
