/**
 * ネットワーク制御ヘルパー関数
 */

/**
 * ネットワーク状況の定義
 */
const NETWORK_CONDITIONS = {
  FAST_3G: {
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 kbps
    latency: 150 // ms
  },
  SLOW_3G: {
    downloadThroughput: (400 * 1024) / 8, // 400 kbps
    uploadThroughput: (400 * 1024) / 8, // 400 kbps
    latency: 400 // ms
  },
  SLOW_WIFI: {
    downloadThroughput: (512 * 1024) / 8, // 512 kbps
    uploadThroughput: (256 * 1024) / 8, // 256 kbps
    latency: 100 // ms
  },
  HIGH_LATENCY: {
    downloadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps
    uploadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps
    latency: 500 // ms
  },
  GOOD_CONNECTION: {
    downloadThroughput: (20 * 1024 * 1024) / 8, // 20 Mbps
    uploadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps
    latency: 20 // ms
  }
};

/**
 * ネットワーク条件を適用する
 * @param {Page} page - Playwrightページオブジェクト
 * @param {Object} conditions - ネットワーク条件
 */
async function applyNetworkConditions(page, conditions) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Network.enable');
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    ...conditions
  });
}

/**
 * ネットワークを完全に切断する
 * @param {Page} page - Playwrightページオブジェクト
 */
async function goOffline(page) {
  await page.context().setOffline(true);
}

/**
 * ネットワークを再接続する
 * @param {Page} page - Playwrightページオブジェクト
 */
async function goOnline(page) {
  await page.context().setOffline(false);
}

/**
 * パケットロスをシミュレートする
 * @param {Page} page - Playwrightページオブジェクト
 * @param {number} lossRate - 損失率（0-1の間の値）
 */
async function simulatePacketLoss(page, lossRate = 0.1) {
  let requestCount = 0;
  const threshold = Math.floor(1 / lossRate);
  
  await page.route('**/*', async route => {
    requestCount++;
    if (requestCount % threshold === 0) {
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
}

/**
 * 特定のリソースタイプに遅延を追加する
 * @param {Page} page - Playwrightページオブジェクト
 * @param {string} resourceType - リソースタイプ（js, css, image等）
 * @param {number} delay - 遅延時間（ミリ秒）
 */
async function addResourceDelay(page, resourceType, delay) {
  await page.route(`**/*.${resourceType}`, async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
}

/**
 * WebSocketイベントを監視する
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {Object} WebSocket監視オブジェクト
 */
function monitorWebSocket(page) {
  const wsEvents = {
    connected: false,
    disconnected: false,
    messages: [],
    errors: []
  };
  
  page.on('websocket', ws => {
    ws.on('open', () => {
      wsEvents.connected = true;
    });
    
    ws.on('close', () => {
      wsEvents.disconnected = true;
    });
    
    ws.on('framereceived', event => {
      wsEvents.messages.push({
        type: 'received',
        payload: event.payload,
        timestamp: Date.now()
      });
    });
    
    ws.on('framesent', event => {
      wsEvents.messages.push({
        type: 'sent',
        payload: event.payload,
        timestamp: Date.now()
      });
    });
    
    ws.on('socketerror', err => {
      wsEvents.errors.push({
        error: err,
        timestamp: Date.now()
      });
    });
  });
  
  return wsEvents;
}

/**
 * ネットワーク品質をテストする
 * @param {Page} page - Playwrightページオブジェクト
 * @param {Object} conditions - ネットワーク条件
 * @returns {Object} テスト結果
 */
async function testNetworkQuality(page, conditions) {
  const startTime = Date.now();
  
  // ネットワーク条件を適用
  await applyNetworkConditions(page, conditions);
  
  // テストページに移動
  const navigateStartTime = Date.now();
  await page.goto('http://localhost:3000');
  const navigateEndTime = Date.now();
  
  // リソース読み込み完了を待機
  await page.waitForLoadState('networkidle');
  const totalLoadTime = Date.now() - startTime;
  
  // パフォーマンス測定
  const performance = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
    };
  });
  
  return {
    navigation: {
      duration: navigateEndTime - navigateStartTime,
      totalLoadTime: totalLoadTime
    },
    performance,
    conditions: conditions
  };
}

/**
 * 断続的なネットワーク接続をシミュレートする
 * @param {Page} page - Playwrightページオブジェクト
 * @param {number} cycles - 切断/再接続のサイクル数
 * @param {number} offlineDuration - オフライン時間（ミリ秒）
 * @param {number} onlineDuration - オンライン時間（ミリ秒）
 */
async function simulateIntermittentConnection(page, cycles = 3, offlineDuration = 1000, onlineDuration = 2000) {
  for (let i = 0; i < cycles; i++) {
    console.log(`サイクル ${i + 1}/${cycles}: オフラインに切り替え`);
    await goOffline(page);
    await page.waitForTimeout(offlineDuration);
    
    console.log(`サイクル ${i + 1}/${cycles}: オンラインに切り替え`);
    await goOnline(page);
    await page.waitForTimeout(onlineDuration);
  }
}

/**
 * レスポンス時間を測定する
 * @param {Page} page - Playwrightページオブジェクト
 * @param {Function} action - 実行する操作
 * @returns {number} レスポンス時間（ミリ秒）
 */
async function measureResponseTime(page, action) {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

/**
 * ネットワークエラーをキャプチャする
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {Object} エラー監視オブジェクト
 */
function captureNetworkErrors(page) {
  const errors = {
    failedRequests: [],
    timeouts: [],
    aborts: []
  };
  
  page.on('requestfailed', request => {
    errors.failedRequests.push({
      url: request.url(),
      failure: request.failure(),
      timestamp: Date.now()
    });
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      errors.failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: Date.now()
      });
    }
  });
  
  return errors;
}

/**
 * ゲームのパフォーマンスメトリクスを収集する
 * @param {Page} page - Playwrightページオブジェクト
 * @returns {Object} パフォーマンスメトリクス
 */
async function collectGamePerformanceMetrics(page) {
  return await page.evaluate(() => {
    const metrics = {
      fps: 0,
      frameDrops: 0,
      inputLag: 0,
      renderTime: 0
    };
    
    // FPS測定（可能な場合）
    if (window.gameMetrics) {
      metrics.fps = window.gameMetrics.fps || 0;
      metrics.frameDrops = window.gameMetrics.frameDrops || 0;
      metrics.inputLag = window.gameMetrics.inputLag || 0;
      metrics.renderTime = window.gameMetrics.renderTime || 0;
    }
    
    // メモリ使用量
    if (performance.memory) {
      metrics.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    
    return metrics;
  });
}

module.exports = {
  NETWORK_CONDITIONS,
  applyNetworkConditions,
  goOffline,
  goOnline,
  simulatePacketLoss,
  addResourceDelay,
  monitorWebSocket,
  testNetworkQuality,
  simulateIntermittentConnection,
  measureResponseTime,
  captureNetworkErrors,
  collectGamePerformanceMetrics
};