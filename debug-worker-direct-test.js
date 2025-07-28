/**
 * WebWorker通信直接テスト
 * パフォーマンステストで0 messageCountの原因調査
 */

import WorkerManager from './tools/workers/communication/worker-manager.js';
import { MessageType, GameStateUpdate, MessageBuilder } from './tools/workers/communication/message-protocol.js';

async function testWorkerCommunication() {
  console.log('🔍 Worker通信直接テスト開始');

  const workerManager = new WorkerManager();

  try {
    // 1. 初期化
    console.log('\n--- Phase 1: 初期化 ---');
    await workerManager.initialize();
    console.log('✅ WorkerManager初期化完了');

    // 2. PING/PONGテスト
    console.log('\n--- Phase 2: PING/PONGテスト ---');

    const workers = ['game-logic', 'ai', 'analytics'];
    for (const workerId of workers) {
      try {
        console.log(`📤 ${workerId} にPING送信中...`);

        const pingMessage = new MessageBuilder()
          .type(MessageType.PING)
          .payload({ timestamp: performance.now(), testData: `direct-test-${workerId}` })
          .build();

        const startTime = performance.now();
        const response = await workerManager.sendMessage(workerId, pingMessage, 10000);
        const responseTime = performance.now() - startTime;

        console.log(`✅ ${workerId} PONG受信成功 (${responseTime.toFixed(1)}ms)`);
        console.log('   レスポンス:', response);

      } catch (error) {
        console.error(`❌ ${workerId} PING失敗:`, {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
      }
    }

    // 3. Transferable Objectsテスト
    console.log('\n--- Phase 3: Transferable Objectsテスト ---');

    try {
      const gameStateUpdate = new GameStateUpdate();
      gameStateUpdate.ballPosition[0] = 100.5;
      gameStateUpdate.ballPosition[1] = 200.7;
      gameStateUpdate.ballVelocity[0] = 5.2;
      gameStateUpdate.ballVelocity[1] = -3.8;
      gameStateUpdate.frameNumber[0] = 42;

      const timestamp = performance.now();
      gameStateUpdate.timestamp[0] = Math.floor(timestamp / 0x100000000);
      gameStateUpdate.timestamp[1] = timestamp % 0x100000000;

      const message = new MessageBuilder()
        .type(MessageType.UPDATE_GAME_STATE)
        .payload(gameStateUpdate)
        .build();

      const transferList = gameStateUpdate.getTransferList();
      console.log(`📤 Transferable Objects送信 (${transferList.length}個のバッファ)`);
      transferList.forEach((buf, idx) => {
        console.log(`   [${idx}] ArrayBuffer(${buf.byteLength}bytes)`);
      });

      const startTime = performance.now();
      const response = await workerManager.sendMessage('game-logic', message, 10000, transferList);
      const responseTime = performance.now() - startTime;

      console.log(`✅ Transferable Objects送信成功 (${responseTime.toFixed(1)}ms)`);
      console.log('   レスポンス:', response);

    } catch (error) {
      console.error('❌ Transferable Objects送信失敗:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }

    // 4. 統計情報確認
    console.log('\n--- Phase 4: 統計情報 ---');
    const stats = workerManager.getStats();
    console.log('WorkerManager統計:', {
      messagesProcessed: stats.messagesProcessed,
      averageResponseTime: stats.averageResponseTime,
      activeWorkers: stats.activeWorkers,
      workerLatencyDetails: stats.workerLatencyDetails
    });

    workers.forEach(workerId => {
      const status = workerManager.getWorkerStatus(workerId);
      console.log(`${workerId} status:`, {
        exists: status.exists,
        averageLatency: status.averageLatency,
        messageCount: status.messageCount
      });
    });

  } catch (error) {
    console.error('❌ テスト実行エラー:', {
      message: error.message,
      stack: error.stack
    });
  } finally {
    // クリーンアップ
    console.log('\n--- クリーンアップ ---');
    await workerManager.terminateAll();
    console.log('✅ 全Workerを終了しました');
  }
}

// Node.js環境での実行確認
if (typeof globalThis !== 'undefined' && typeof performance === 'undefined') {
  // Node.jsにperformance.now()を追加
  globalThis.performance = {
    now: () => Date.now()
  };
}

// 実行
testWorkerCommunication().then(() => {
  console.log('\n✅ Worker通信直接テスト完了');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Worker通信直接テスト失敗:', error);
  process.exit(1);
});
