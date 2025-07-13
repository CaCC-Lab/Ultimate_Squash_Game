# Test Strategy

このドキュメントは、Ultimate Squash Gameプロジェクトのテスト戦略を定義します。
個人開発規約の「TDD必須」「モック禁止」「エラー3要素」に厳密に準拠します。

## 1. テスト原則

### 必須原則（個人開発規約準拠）
- **TDD実践**: テスト作成 → 実装 → リファクタリングサイクル厳守
- **モック禁止**: すべてのテストは実環境で実行
- **エラー3要素**: 何が起きた・なぜ起きた・どうすれば良いか必須
- **カバレッジ目標**: 80%以上（ユニットテスト）

### 品質基準
- **自動化**: 手動テストは最小限（E2Eのみ）
- **独立性**: テスト間の依存関係禁止
- **再現性**: 毎回同じ結果が得られること
- **実行速度**: ユニットテスト1秒以内、統合テスト10秒以内

## 2. テストレベル定義

### Level 1: ユニットテスト（高速・頻繁実行）

**対象範囲:**
- `src/game/` 内の純粋関数とクラスメソッド
- 衝突検出、スコア計算、状態更新など

**実行頻度:** 
- コード変更毎に自動実行
- 全体で1秒以内完了

**具体例:**
```python
# tests/test_game/test_engine.py
def test_ball_collision_detection():
    """ボールとラケットの衝突検出テスト"""
    engine = GameEngine()
    # 実際のボールとラケット位置でテスト
    assert engine.check_collision(ball_pos, racket_pos) == True

def test_score_calculation():
    """スコア計算ロジックテスト"""
    engine = GameEngine()
    initial_score = engine.get_score()
    engine.process_point()
    assert engine.get_score() == initial_score + 1
```

### Level 2: 統合テスト（実環境必須）

**対象範囲:**
- モジュール間の連携（game ↔ ui, game ↔ ai）
- Ollama API との実際の通信
- ファイルI/O操作

**実行環境:**
- **Ollama必須**: ローカルで稼働するOllamaサーバー
- **モデル要件**: mistralモデルがダウンロード済み
- **ネットワーク**: localhost:11434 にアクセス可能

**マーカー機能:**
```python
import pytest

@pytest.mark.integration
def test_ollama_connection():
    """Ollama実サーバーとの接続テスト"""
    client = OllamaClient()
    response = client.send_prompt("Hello")
    assert response is not None
    assert len(response) > 0
```

**実行方法:**
```bash
# ユニットテストのみ
pytest tests/ -m "not integration"

# 統合テストのみ（Ollama必須）
pytest tests/ -m integration

# 全テスト実行
pytest tests/
```

### Level 3: End-to-End テスト（手動チェックリスト）

**理由:** tkinter GUIの自動化は複雑で不安定。手動検証で品質確保。

**チェックリスト:**
- [ ] アプリケーション起動（エラーなし）
- [ ] ボール移動の視覚確認
- [ ] マウス操作でラケット移動
- [ ] スコア表示更新
- [ ] ゲームオーバー処理
- [ ] AI機能（Ollama接続時）
  - [ ] AI応答の表示
  - [ ] ゲーム動作への影響確認
- [ ] エラー処理
  - [ ] Ollama未接続時の適切な処理
  - [ ] 不正入力への対応

## 3. TDD実装サイクル

### 標準フロー
```bash
# 1. 失敗するテストを作成
# tests/test_game/test_new_feature.py
def test_new_feature():
    assert new_feature() == expected_result  # 未実装なので失敗

# 2. テスト実行（失敗確認）
pytest tests/test_game/test_new_feature.py::test_new_feature

# 3. 最小限の実装
# src/game/engine.py
def new_feature():
    return expected_result  # テストをパスする最小実装

# 4. テスト実行（成功確認）
pytest tests/test_game/test_new_feature.py::test_new_feature

# 5. リファクタリング（テスト成功を保ちながら）
# コード品質向上、重複除去など

# 6. 全テスト実行（リグレッション確認）
pytest tests/
```

### 実装順序ガイドライン
1. **コアロジック優先**: game/ → ui/ → ai/ の順序
2. **依存関係考慮**: 依存される側から先に実装
3. **段階的機能追加**: 基本動作 → 高度な機能

## 4. エラーハンドリングテスト（3要素必須）

### エラーメッセージ標準形式
```python
class GameError(Exception):
    def __init__(self, what: str, why: str, how: str):
        self.what = what  # 何が起きたか
        self.why = why    # なぜ起きたか
        self.how = how    # どうすれば良いか
        super().__init__(f"{what}。{why}。{how}")

# 使用例
raise GameError(
    what="ボール移動計算に失敗しました",
    why="座標値が無効範囲です", 
    how="座標値を0-640, 0-480の範囲で指定してください"
)
```

### エラーハンドリングテスト例
```python
def test_invalid_ball_position_error():
    """無効ボール位置でのエラー処理テスト"""
    engine = GameEngine()
    
    with pytest.raises(GameError) as exc_info:
        engine.move_ball(-100, -100)  # 無効座標
    
    error = exc_info.value
    assert "ボール移動計算に失敗" in error.what
    assert "座標値が無効範囲" in error.why  
    assert "0-640, 0-480の範囲で指定" in error.how
```

## 5. AI機能の実環境テスト戦略

### Ollama依存テストの方針

**前提条件チェック:**
```python
import pytest
import requests

def check_ollama_available():
    """Ollama サーバーの稼働確認"""
    try:
        response = requests.get("http://localhost:11434/api/version", timeout=5)
        return response.status_code == 200
    except:
        return False

# テストスキップ条件
@pytest.mark.skipif(
    not check_ollama_available(),
    reason="Ollama server not available"
)
def test_ai_integration():
    # AI統合テスト
    pass
```

**AI応答品質テスト:**
```python
def test_ai_response_quality():
    """AI応答の品質確認"""
    client = OllamaClient()
    
    # ゲーム状況を送信
    game_state = {"ball_x": 320, "ball_y": 240, "score": 5}
    response = client.get_game_commentary(game_state)
    
    # 応答品質の確認
    assert response is not None
    assert len(response) > 10  # 最小文字数
    assert len(response) < 200  # 最大文字数
    assert not any(word in response.lower() for word in ["error", "failed"])
```

**パフォーマンステスト:**
```python
import time

def test_ai_response_time():
    """AI応答時間のテスト"""
    client = OllamaClient()
    
    start_time = time.time()
    response = client.send_prompt("Simple question")
    response_time = time.time() - start_time
    
    assert response_time < 5.0  # 5秒以内
    assert response is not None
```

## 6. テスト実行環境

### 開発環境セットアップ
```bash
# 1. 依存関係インストール
pip install pytest pytest-cov

# 2. Ollama セットアップ
# Ollama をローカルにインストール
ollama pull mistral

# 3. Ollama サーバー起動
ollama serve  # バックグラウンドで実行

# 4. テスト実行
pytest tests/ --cov=src --cov-report=html
```

### CI/CD統合（将来）
```yaml
# .github/workflows/test.yml (例)
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434
    
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v3
        with:
          python-version: '3.8'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run tests
        run: pytest tests/ --cov=src
```

## 7. テスト品質メトリクス

### 目標数値
- **ユニットテストカバレッジ**: 80%以上
- **統合テストカバレッジ**: 60%以上  
- **実行時間**: ユニット1秒以内、統合10秒以内
- **テスト成功率**: 95%以上（CI環境）

### 測定コマンド
```bash
# カバレッジ測定
pytest tests/ --cov=src --cov-report=term-missing

# 実行時間測定
pytest tests/ --durations=10

# 品質レポート生成
pytest tests/ --cov=src --cov-report=html
```

## 8. よくある問題と対処法

### Ollama接続エラー
**症状:** AI統合テストが失敗
**対処:**
1. `ollama serve` でサーバー起動確認
2. `ollama list` でmistralモデル確認
3. `curl http://localhost:11434/api/version` で接続確認

### tkinter テストエラー
**症状:** GUI関連テストでエラー
**対処:**
1. DISPLAY環境変数の設定（Linux）
2. headlessモードでの実行設定
3. モックではなく、テスト用のダミーウィンドウ使用

### テスト実行速度の問題
**症状:** テストが遅い
**対処:**
1. 並列実行: `pytest -n auto`
2. 統合テストの分離実行
3. 不要なsetup/teardownの削除

---

**重要**: このテスト戦略は個人開発規約に厳密に準拠しています。
モック使用や手動テストの増加は、事前承認が必要です。