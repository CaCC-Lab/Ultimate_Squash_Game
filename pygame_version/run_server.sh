#!/bin/bash
# Pyodide/WASM版のローカルテストサーバー起動スクリプト

echo "Ultimate Squash Game - Pyodide/WASM版 テストサーバー"
echo "=========================================="
echo ""
echo "ビルドを実行中..."
python build_pyodide.py

echo ""
echo "HTTPサーバーを起動します..."
echo "ブラウザで http://localhost:8000 にアクセスしてください"
echo ""
echo "終了するには Ctrl+C を押してください"
echo ""

cd build && python -m http.server 8000