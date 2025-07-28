/**
 * Playwright グローバルティアダウン
 * WebSocketサーバーの安全な停止と後処理
 *
 * 個人開発規約遵守:
 * - エラー3要素: 停止失敗時の詳細メッセージ
 * - 適切なリソース管理: プロセスの確実な終了
 */

/**
 * グローバルティアダウン - テスト実行後に実行
 */
async function globalTeardown() {
  console.log('🛑 Playwright E2Eテスト環境をクリーンアップ中...');

  try {
    const serverPid = process.env.WEBSOCKET_SERVER_PID;

    if (serverPid) {
      console.log(`📡 WebSocketサーバーを停止中 (PID: ${serverPid})...`);

      // Pythonプロセスを安全に停止
      try {
        process.kill(parseInt(serverPid), 'SIGTERM');

        // 正常終了を待機
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            try {
              process.kill(parseInt(serverPid), 0);  // プロセス存在チェック
            } catch (error) {
              if (error.code === 'ESRCH') {
                // プロセスが存在しない = 正常終了
                clearInterval(checkInterval);
                console.log('✅ WebSocketサーバーが正常に停止しました');
                resolve();
              }
            }
          }, 100);

          // 5秒後に強制終了
          setTimeout(() => {
            clearInterval(checkInterval);
            try {
              process.kill(parseInt(serverPid), 'SIGKILL');
              console.log('⚠️ WebSocketサーバーを強制停止しました');
            } catch (error) {
              // プロセスが既に存在しない場合は正常
            }
            resolve();
          }, 5000);
        });

      } catch (error) {
        if (error.code !== 'ESRCH') {
          console.warn(`⚠️ WebSocketサーバー停止時の警告: ${error.message}`);
        }
      }
    } else {
      console.log('📡 WebSocketサーバーのPIDが見つかりません（既に停止済み？）');
    }

    console.log('✅ Playwright E2Eテスト環境のクリーンアップが完了しました');

  } catch (error) {
    const errorDetails = {
      what: 'Playwright E2Eテスト環境のクリーンアップに失敗しました',
      why: `プロセス停止エラー: ${error.message}`,
      how: 'プロセスが残っている場合は手動で停止してください (ps aux | grep python)'
    };

    console.error(`❌ ティアダウンエラー: ${errorDetails.what} - ${errorDetails.why} - ${errorDetails.how}`);

    // ティアダウンエラーは致命的ではないため、プロセスは継続
  }
}

export default globalTeardown;
