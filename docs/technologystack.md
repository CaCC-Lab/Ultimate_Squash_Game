# Technology Stack

このドキュメントは、Ultimate Squash Gameプロジェクトで使用する技術スタックを定義します。
**警告: 記載されたバージョンは絶対に変更禁止。変更には事前承認必須。**

## 1. Core Technologies

### Programming Language
- **Python**: 3.8+
  - **現在使用**: Python 3.8以上
  - **理由**: プロジェクトの基盤技術。モダンな言語機能とライブラリとの互換性確保
  - **変更禁止**: バージョンダウングレード絶対禁止

### GUI Framework  
- **tkinter**: Python標準ライブラリ
  - **バージョン**: Python標準搭載版
  - **理由**: 外部依存なしで軽量なGUIを実現。プラットフォーム独立性
  - **変更禁止**: 他GUIライブラリへの変更禁止

### AI Integration
- **Ollama**: ローカルLLMサーバー
  - **接続先**: http://localhost:11434 (固定)
  - **モデル**: mistral (固定)
  - **理由**: オフライン動作とプライバシー保護、開発環境の完全制御
  - **変更禁止**: 他AIサービスへの変更禁止

## 2. Required Dependencies

### Python Packages (requirements.txt準拠)
```
requests>=2.31.0
ollama>=0.1.0
pytest>=7.0.0
```

**バージョン固定ルール:**
- **requests**: 2.31.0以上（セキュリティ要件）
- **ollama**: 0.1.0以上（API互換性）
- **pytest**: 7.0.0以上（TDD要件）

### 開発環境
- **仮想環境**: venv (Python標準)
- **パッケージ管理**: pip + requirements.txt
- **バージョン管理**: Git

## 3. Architecture Constraints

### 必須パターン
- **MVC分離**: Model(game), View(ui), Controller(main)必須
- **Observer Pattern**: AI統合時必須
- **依存性注入**: AI機能の可/不可切り替え対応

### 禁止事項
- **モック使用**: テストでのモック禁止（実環境必須）
- **外部APIサービス**: OpenAI等のクラウドサービス使用禁止
- **重い依存関係**: pygame, Qt等の追加GUI库禁止

## 4. Development Tools

### Testing Framework
- **pytest**: 7.0.0以上
  - **理由**: TDD実践とテスト網羅性確保
  - **必須プラグイン**: pytest-cov（カバレッジ測定）

### Code Quality
- **エラーハンドリング**: 3要素必須（何が・なぜ・どうすれば）
- **ログ記録**: Python標準loggingモジュール
- **コメント**: 日本語併記推奨

## 5. Runtime Environment

### Minimum Requirements
- **Python**: 3.8+
- **メモリ**: 512MB以上
- **ディスク**: 100MB以上
- **ネットワーク**: Ollama接続用（localhost:11434）

### Platform Support
- **Windows**: tkinter標準対応
- **macOS**: tkinter標準対応  
- **Linux**: tkinter標準対応

## 6. Integration Specifications

### Ollama Integration
- **接続方式**: HTTP API (requests使用)
- **タイムアウト**: 30秒固定
- **エラー処理**: 3要素エラーメッセージ必須
- **フォールバック**: AI機能無効化で継続動作

### File Structure Compliance
```
src/
├── game/     # Core game logic
├── ui/       # GUI components  
├── ai/       # AI integration
└── main.py   # Entry point
```

## 7. Security and Compliance

### Data Privacy
- **ローカル処理**: すべてのAI処理はローカル実行
- **データ送信**: 外部サーバーへのデータ送信禁止
- **ログ記録**: 個人情報記録禁止

### Dependency Security
- **定期更新**: セキュリティパッチ適用必須
- **脆弱性チェック**: pip audit実行必須

---

**重要**: このファイルの内容変更は、プロジェクトの根幹に関わります。
変更が必要な場合は、必ず事前承認を得てください。