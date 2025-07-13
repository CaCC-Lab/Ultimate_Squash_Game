# Directory Structure

このドキュメントは、Ultimate Squash Gameプロジェクトのディレクトリ構造と配置ルールを定義します。
**重要: この構造は厳守してください。変更には事前承認必須。**

## 1. 目標ディレクトリ構造

```
ultimate_squash_game/
├── src/                    # メインソースコードルート
│   ├── __init__.py        # Pythonパッケージ識別
│   ├── game/              # コアゲームロジック（Model）
│   │   ├── __init__.py
│   │   ├── engine.py      # ゲーム物理演算、状態管理、ルール
│   │   └── assets.py      # ゲームオブジェクト（ボール、ラケット、コート）
│   │
│   ├── ui/                # UIコンポーネント（View）
│   │   ├── __init__.py
│   │   ├── main_window.py # メインアプリケーションウィンドウとキャンバス
│   │   └── renderer.py    # ゲーム状態をキャンバスに描画
│   │
│   ├── ai/                # AI関連ロジック
│   │   ├── __init__.py
│   │   ├── client.py      # Ollamaサーバーとの通信クライアント
│   │   └── enhancer.py    # AI駆動ゲーム拡張（相手の動き、解説等）
│   │
│   └── main.py            # アプリケーションエントリーポイント（Controller）
│
├── tests/                 # 全テストファイル
│   ├── __init__.py
│   ├── test_game/         # コアゲームロジックのテスト
│   │   ├── __init__.py
│   │   ├── test_engine.py
│   │   └── test_assets.py
│   ├── test_ui/           # UI関連のテスト
│   │   ├── __init__.py
│   │   └── test_renderer.py
│   └── test_ai/           # AI機能の統合テスト
│       ├── __init__.py
│       ├── test_client.py
│       └── test_enhancer.py
│
├── docs/                  # プロジェクトドキュメント
│   ├── CLAUDE.md         # Claude Code開発ガイド
│   ├── technologystack.md
│   ├── directorystructure.md
│   └── test-strategy.md
│
├── config/                # 設定ファイル
│   └── game_settings.json # ゲーム設定（難易度、サウンド等）
│
├── .gitignore
├── LICENSE
├── README.md
├── TODO.md
├── requirements.txt
├── run.sh                 # 実行用スクリプト
└── venv/                  # Python仮想環境（.gitignore対象）
```

## 2. 現在から目標への移行計画

### 移行手順（優先度順）

#### フェーズ1: ディレクトリ作成
```bash
mkdir -p src/game src/ui src/ai
mkdir -p tests/test_game tests/test_ui tests/test_ai  
mkdir -p docs config
```

#### フェーズ2: 既存ファイルの移行
- `game_engine.py` → `src/game/engine.py`
- `ai_enhancer.py` → `src/ai/enhancer.py` + `src/ai/client.py`
- `main.py` → `src/main.py`
- `CLAUDE.md` → `docs/CLAUDE.md`

#### フェーズ3: 新規ファイル作成
- `src/game/assets.py` （ゲームオブジェクト抽出）
- `src/ui/main_window.py` （UI分離）
- `src/ui/renderer.py` （描画ロジック分離）

## 3. 命名規則

### ファイル命名
- **Pythonファイル**: snake_case（例: `game_engine.py`）
- **クラス名**: PascalCase（例: `GameEngine`）
- **関数・変数**: snake_case（例: `update_ball_position`）
- **定数**: UPPER_SNAKE_CASE（例: `DEFAULT_BALL_SPEED`）

### ディレクトリ命名
- **小文字のみ**: `game`, `ui`, `ai`
- **単語区切り**: アンダースコア使用（例: `test_game`）
- **略称禁止**: 完全な名前を使用（`ui`は例外として許可）

## 4. モジュール間の責任分界

### src/game/ - ゲームロジック（Model）
**責任範囲:**
- ゲーム状態の管理
- 物理演算（衝突検出、移動計算）
- スコア管理とルール適用
- ゲームイベントの発生

**依存関係:**
- 他モジュールに依存してはならない（Pure Model）
- UIやAIの詳細を知ってはならない

### src/ui/ - ユーザーインターフェース（View）
**責任範囲:**
- tkinterウィンドウ管理
- ユーザー入力の受付
- ゲーム状態の視覚的表示
- サウンド再生

**依存関係:**
- `src/game/` からゲーム状態を受け取る
- `src/ai/` に依存してはならない

### src/ai/ - AI機能
**責任範囲:**
- Ollamaサーバーとの通信
- ゲーム状態からAI判断への変換
- AI応答の解析と適用

**依存関係:**
- `src/game/` からゲーム状態を受け取る
- UIの詳細を知ってはならない

### src/main.py - アプリケーション制御（Controller）
**責任範囲:**
- 各モジュールの初期化
- モジュール間の連携調整
- アプリケーションライフサイクル管理

## 5. インポート規則

### 推奨インポートパターン
```python
# 標準ライブラリ
import os
import json
from typing import Dict, List, Optional

# サードパーティライブラリ  
import requests
import ollama

# プロジェクト内モジュール
from src.game.engine import GameEngine
from src.ui.main_window import MainWindow
from src.ai.client import OllamaClient
```

### 禁止パターン
```python
# ❌ 相対インポート
from ..game import engine

# ❌ wildcard インポート  
from src.game import *

# ❌ 循環インポート
# src/game/engine.py で src/ai をインポート
```

## 6. ファイル配置ルール

### 新規ファイル作成時の判断基準

**src/game/ に配置する場合:**
- ゲームルール、物理法則に関する処理
- 状態管理、スコア計算
- UI、AI機能から独立した処理

**src/ui/ に配置する場合:**
- tkinter関連の処理
- 描画、イベントハンドリング
- ユーザーインタラクション

**src/ai/ に配置する場合:**
- Ollama通信処理
- AI判断ロジック
- ゲーム拡張・演出機能

**tests/ に配置する場合:**
- 対応するsrcディレクトリと同じ構造
- テストファイル名は `test_` プレフィックス必須

## 7. 品質保証のためのルール

### コードレビュー時の確認事項
- [ ] ファイルが適切なディレクトリに配置されているか
- [ ] 命名規則に従っているか
- [ ] インポート規則に違反していないか
- [ ] 責任分界が適切に守られているか
- [ ] 新規ファイルに対応するテストファイルが存在するか

### 例外規則
- 一時的なプロトタイプファイルは `temp/` ディレクトリに配置可能
- 設定ファイルは `config/` ディレクトリに配置
- ドキュメントは `docs/` ディレクトリに配置

---

**重要**: この構造への移行は段階的に行い、各フェーズでテストが通ることを確認してください。
構造の変更は、必ず事前承認を得てから実施してください。