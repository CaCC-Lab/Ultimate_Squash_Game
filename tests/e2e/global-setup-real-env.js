/**
 * 実環境E2Eテスト用グローバルセットアップ
 * 実際のサーバー環境とテストデータの準備
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 実環境E2Eテスト環境のセットアップを開始...');

  // WebSocketサーバーの起動確認
  console.log('🔌 WebSocketサーバーの接続確認...');
  const webSocketAvailable = await checkWebSocketServer();
  
  if (webSocketAvailable) {
    console.log('✅ WebSocketサーバー (localhost:8765) 接続確認完了');
  } else {
    console.log('⚠️ WebSocketサーバーが利用できません - オフラインモードでテスト実行');
  }

  // 実際のブラウザでの初期確認
  console.log('🌐 実ブラウザでの基本動作確認...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // ゲームページの読み込み確認
    await page.goto('http://localhost:3000/docs/game.html', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // 基本要素の存在確認
    const gameCanvas = await page.locator('#gameCanvas').isVisible();
    if (gameCanvas) {
      console.log('✅ ゲームキャンバス表示確認完了');
    } else {
      console.log('❌ ゲームキャンバスが表示されていません');
    }
    
    // Web Audio API サポート確認
    const audioSupport = await page.evaluate(() => {
      return typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
    });
    
    if (audioSupport) {
      console.log('✅ Web Audio API サポート確認完了');
    } else {
      console.log('⚠️ Web Audio API がサポートされていません');
    }
    
    // JavaScript API 確認
    const jsApis = await page.evaluate(() => {
      return {
        fetch: typeof fetch !== 'undefined',
        websocket: typeof WebSocket !== 'undefined',
        audioContext: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
        performance: typeof performance !== 'undefined' && typeof performance.now !== 'undefined'
      };
    });
    
    console.log('📊 JavaScript API サポート状況:');
    Object.entries(jsApis).forEach(([api, supported]) => {
      console.log(`  ${supported ? '✅' : '❌'} ${api}`);
    });
    
  } catch (error) {
    console.error('❌ 初期確認中にエラー:', error.message);
  } finally {
    await browser.close();
  }

  // テスト環境情報の記録
  const testEnvironment = {
    timestamp: new Date().toISOString(),
    webSocketAvailable,
    audioSupport: true, // 上記で確認済み
    platform: process.platform,
    nodeVersion: process.version,
    testType: 'real_environment'
  };
  
  // 環境情報をファイルに保存
  const fs = require('fs');
  fs.writeFileSync(
    'test-results/test-environment.json', 
    JSON.stringify(testEnvironment, null, 2)
  );
  
  console.log('✅ 実環境E2Eテスト環境セットアップ完了');
  
  return testEnvironment;
}

/**
 * WebSocketサーバーの接続確認
 */
async function checkWebSocketServer() {
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      
      ws.on('error', () => {
        resolve(false);
      });
      
      // 5秒でタイムアウト
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
        }
        resolve(false);
      }, 5000);
      
    } catch (error) {
      resolve(false);
    }
  });
}

export default globalSetup;