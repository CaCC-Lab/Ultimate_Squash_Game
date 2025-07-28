// WebSocket接続の直接テスト用スクリプト
const WebSocket = require('ws');

console.log('🔌 WebSocketサーバーへの直接接続をテスト中...');

const ws = new WebSocket('ws://localhost:8765');

ws.on('open', function open() {
  console.log('✅ WebSocket接続成功!');

  // テストメッセージを送信
  const testMessage = {
    type: 'game:request_state',
    payload: {}
  };

  console.log('📤 テストメッセージ送信:', testMessage);
  ws.send(JSON.stringify(testMessage));

  // 5秒後に接続を閉じる
  setTimeout(() => {
    console.log('🔌 接続を閉じます');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('📨 サーバーからメッセージ受信:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocketエラー:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket接続が閉じられました');
  process.exit(0);
});

// タイムアウト設定
setTimeout(() => {
  console.log('⏰ タイムアウト - 接続に失敗しました');
  process.exit(1);
}, 10000);
