/**
 * Playwright グローバルセットアップ
 * WebSocketサーバーの自動起動と環境準備
 *
 * 個人開発規約遵守:
 * - モック禁止: 実際のWebSocketサーバーを起動
 * - エラー3要素: セットアップ失敗時の詳細メッセージ
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import WebSocket from 'ws';

const sleep = promisify(setTimeout);

let websocketServer = null;

/**
 * グローバルセットアップ - テスト実行前に実行
 */
async function globalSetup() {
  console.log('🚀 Playwright E2Eテスト環境をセットアップ中...');

  try {
    // WebSocketサーバーの起動
    console.log('📡 WebSocketサーバーを起動中...');

    websocketServer = spawn('python', ['main_websocket_integrated.py'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SDL_VIDEODRIVER: 'dummy',  // ヘッドレスPygame
        PYTHONUNBUFFERED: '1'      // リアルタイムログ出力
      }
    });

    // サーバープロセスの監視
    websocketServer.stdout.on('data', (data) => {
      console.log(`[WebSocket] ${data.toString().trim()}`);
    });

    websocketServer.stderr.on('data', (data) => {
      console.error(`[WebSocket Error] ${data.toString().trim()}`);
    });

    // サーバーの起動を確認
    await waitForWebSocketServer('ws://localhost:8765', 30000);

    console.log('✅ WebSocketサーバーが起動しました (ws://localhost:8765)');

    // グローバル変数に保存（teardownで使用）
    process.env.WEBSOCKET_SERVER_PID = websocketServer.pid.toString();

    return websocketServer;

  } catch (error) {
    const errorDetails = {
      what: 'Playwright E2Eテスト環境のセットアップに失敗しました',
      why: `WebSocketサーバーの起動エラー: ${error.message}`,
      how: 'Pythonの実行権限とポート8765の空きを確認してください'
    };

    console.error(`❌ セットアップエラー: ${errorDetails.what} - ${errorDetails.why} - ${errorDetails.how}`);
    throw error;
  }
}

/**
 * WebSocketサーバーの起動を待機
 */
async function waitForWebSocketServer(url, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await testWebSocketConnection(url);
      return true;
    } catch (error) {
      // 接続失敗は正常（まだサーバーが起動していない）
      await sleep(500);  // 500ms待機して再試行
    }
  }

  throw new Error(`WebSocketサーバーの起動がタイムアウトしました (${timeout}ms)`);
}

/**
 * WebSocket接続テスト
 */
async function testWebSocketConnection(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket接続タイムアウト'));
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export default globalSetup;
