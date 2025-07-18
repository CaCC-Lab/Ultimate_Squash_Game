#!/bin/bash
# Ultimate Squash Game - ブラウザ版起動スクリプト

echo "🎮 Ultimate Squash Game - ブラウザ版を起動します"
echo ""
echo "ステップ1: ヘッドレスWebSocketサーバーを起動中..."

# ヘッドレスWebSocketサーバーを起動
python main_websocket_integrated.py &
SERVER_PID=$!

echo "サーバーPID: $SERVER_PID"
echo "WebSocketサーバーが起動しました (ws://localhost:8765)"
echo ""
echo "ステップ2: ブラウザでゲームを開く"
echo ""
echo "📖 手動で以下を実行してください:"
echo "  1. ブラウザを開く"
echo "  2. docs/game.html ファイルを開く"
echo "     - 方法1: ファイル→開く で docs/game.html を選択"
echo "     - 方法2: ブラウザのアドレスバーに以下をコピー&ペースト:"
echo "       file://$(pwd)/docs/game.html"
echo ""
echo "  3. ブラウザで以下を確認:"
echo "     - 右上に「🟢 接続中」が表示されることを確認"
echo "     - 「ゲーム開始」ボタンでゲームスタート"
echo "     - マウス移動でパドルを操作"
echo "     - 「チャレンジ」ボタンでテストチャレンジ実行"
echo ""
echo "⏱️  サーバーは30秒間実行されます"
echo "🛑 終了するには Ctrl+C を押してください"
echo ""

# サーバーの終了を待機
wait $SERVER_PID

echo ""
echo "🎯 ヘッドレスWebSocketサーバーが終了しました"
echo "ブラウザゲームとの統合テスト完了！"