# Progressive Web App (PWA) 実装ドキュメント

## 概要

Ultimate Squash GameはProgressive Web App (PWA)として実装されており、以下の機能を提供します：

- オフライン動作
- アプリのインストール
- ホーム画面への追加
- フルスクリーンモード
- 自動アップデート

## 実装された機能

### 1. Service Worker (`sw.js`)

Service Workerは以下の機能を提供します：

#### キャッシュ戦略
- **ネットワークファースト**: HTMLファイルとAPIリクエスト
- **キャッシュファースト**: 静的アセット（画像、CSS、JavaScript）
- **動的キャッシュ**: Pyodideおよび.wasmファイル

#### キャッシュ管理
```javascript
const CACHE_NAME = 'ultimate-squash-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';
```

#### 自動更新
- バックグラウンドでの新バージョン検出
- ユーザーへの更新通知
- ワンクリックでのアップデート

### 2. Web App Manifest (`manifest.json`)

マニフェストファイルは以下を定義します：

#### 基本情報
- **名前**: Ultimate Squash Game
- **短縮名**: UltimateSquash
- **説明**: ブラウザで動作する軽量スカッシュゲーム
- **テーマカラー**: #004274
- **背景色**: #0c0c0c

#### 表示設定
- **display**: fullscreen（フルスクリーンモード）
- **orientation**: landscape（横向き固定）
- **start_url**: /game.html

#### アイコン
- 192x192px（ホーム画面用）
- 512x512px（スプラッシュスクリーン用）
- SVG形式でスケーラブル

#### ショートカット
1. **新しいゲーム**: ゲームを即座に開始
2. **ランキング**: ランキング画面を表示

### 3. インストール機能

#### インストールボタン
- beforeinstallpromptイベントを検出時に表示
- ワンクリックでインストールプロンプトを表示

#### インストールフロー
1. ブラウザがPWA対応を検出
2. インストールボタンが表示される
3. ユーザーがボタンをクリック
4. ブラウザのインストールダイアログが表示
5. インストール完了後、アプリとして起動可能

### 4. iOS対応

iOSデバイス向けの特別な対応：

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Ultimate Squash">
<link rel="apple-touch-icon" href="...">
```

## 使用方法

### PWAのインストール

#### デスクトップ（Chrome/Edge）
1. ゲームページにアクセス
2. アドレスバーの右側にインストールアイコンが表示
3. アイコンをクリックしてインストール

#### モバイル（Android）
1. ゲームページにアクセス
2. 「インストール」ボタンが表示される
3. ボタンをタップしてインストール

#### iOS
1. Safariでゲームページにアクセス
2. 共有ボタンをタップ
3. 「ホーム画面に追加」を選択

### オフライン動作

インストール後は以下の状況でも動作します：
- インターネット接続なし
- 機内モード
- 不安定なネットワーク環境

### アップデート

新しいバージョンが利用可能な場合：
1. 自動的に検出されます
2. 更新通知が表示されます
3. 「更新」をクリックで最新版に

## 技術仕様

### Service Worker ライフサイクル

```
install → activate → fetch/message → update
```

### キャッシュ無効化

開発時やトラブルシューティング時：

```javascript
// コンソールで実行
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
```

### 対応ブラウザ

- Chrome/Edge: 完全対応
- Firefox: 完全対応
- Safari: 部分対応（インストール機能なし）
- iOS Safari: 部分対応（ホーム画面追加のみ）

## トラブルシューティング

### Service Workerが登録されない
1. HTTPSまたはlocalhostでアクセスしているか確認
2. ブラウザの開発者ツールでエラーを確認
3. キャッシュをクリアして再試行

### インストールボタンが表示されない
1. すでにインストール済みでないか確認
2. ブラウザがPWA対応か確認
3. マニフェストファイルが正しく読み込まれているか確認

### オフラインで動作しない
1. Service Workerが有効か確認
2. 必要なファイルがキャッシュされているか確認
3. ネットワークタブでキャッシュ状況を確認

## 将来の拡張

### 計画中の機能
- プッシュ通知（週替わりチャレンジの通知）
- バックグラウンド同期（スコアの自動アップロード）
- 共有機能（スコアのSNS共有）

### パフォーマンス最適化
- キャッシュサイズの最適化
- 画像の遅延読み込み
- リソースの事前キャッシュ