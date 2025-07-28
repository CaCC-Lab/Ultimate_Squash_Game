// Service Worker キャッシュ効果検証スクリプト
const { chromium } = require('playwright');

async function testCacheEffectiveness() {
  console.log('🔍 Service Worker キャッシュ効果検証を開始...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // キャッシュクリア
    console.log('📋 キャッシュをクリア中...');
    await context.clearCookies();

    console.log('🎮 ゲームページを初回読み込み中...');
    const firstLoadStart = Date.now();
    await page.goto('http://localhost:3001/game.html');

    // Service Worker対応ページでキャッシュクリア
    await page.evaluate(() => {
      if ('caches' in window) {
        return caches.keys().then(cacheNames => {
          return Promise.all(cacheNames.map(name => caches.delete(name)));
        });
      }
      return Promise.resolve();
    });

    // ページリロードしてキャッシュクリア効果を適用
    await page.reload();

    // Pyodide初期化完了を待つ
    await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 120000 });
    const firstLoadTime = Date.now() - firstLoadStart;

    console.log(`✅ 初回読み込み完了: ${firstLoadTime}ms`);

    // キャッシュ状態確認
    const cacheStatus = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const pyodideUrls = [
        'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
        'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.js',
        'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.wasm',
        'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide-lock.json',
        'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.data'
      ];

      let cachedFiles = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        for (const url of pyodideUrls) {
          const response = await cache.match(url);
          if (response) {
            cachedFiles.push(url);
          }
        }
      }

      return {
        totalCaches: cacheNames.length,
        cacheNames: cacheNames,
        cachedPyodideFiles: cachedFiles,
        cachedFileCount: cachedFiles.length,
        totalPyodideFiles: pyodideUrls.length
      };
    });

    console.log('📊 キャッシュ状態:');
    console.log(`  - 総キャッシュ数: ${cacheStatus.totalCaches}`);
    console.log(`  - キャッシュ名: ${cacheStatus.cacheNames.join(', ')}`);
    console.log(`  - Pyodideファイル: ${cacheStatus.cachedFileCount}/${cacheStatus.totalPyodideFiles}`);

    if (cacheStatus.cachedFileCount > 0) {
      console.log('  - キャッシュ済みファイル:');
      cacheStatus.cachedPyodideFiles.forEach(url => {
        const fileName = url.split('/').pop();
        console.log(`    - ${fileName}`);
      });
    }

    // 2回目の読み込みテスト
    console.log('🔄 2回目の読み込みテスト中...');
    await page.reload();

    const secondLoadStart = Date.now();
    await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 120000 });
    const secondLoadTime = Date.now() - secondLoadStart;

    console.log(`✅ 2回目読み込み完了: ${secondLoadTime}ms`);

    // キャッシュ効果の分析
    const improvement = firstLoadTime - secondLoadTime;
    const improvementPercent = (improvement / firstLoadTime) * 100;

    console.log('📈 キャッシュ効果分析:');
    console.log(`  - 初回読み込み: ${firstLoadTime}ms`);
    console.log(`  - 2回目読み込み: ${secondLoadTime}ms`);
    console.log(`  - 改善時間: ${improvement}ms`);
    console.log(`  - 改善率: ${improvementPercent.toFixed(1)}%`);

    if (improvementPercent > 10) {
      console.log('✅ Service Workerキャッシュが効果的に動作しています！');
    } else if (improvementPercent > 0) {
      console.log('⚠️ 軽微なキャッシュ効果が確認されました');
    } else {
      console.log('❌ キャッシュ効果が確認できませんでした');
    }

    // 3回目のテスト（さらなる改善確認）
    console.log('🔄 3回目の読み込みテスト中...');
    await page.reload();

    const thirdLoadStart = Date.now();
    await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 120000 });
    const thirdLoadTime = Date.now() - thirdLoadStart;

    console.log(`✅ 3回目読み込み完了: ${thirdLoadTime}ms`);

    // 最終統計
    const avgCachedTime = (secondLoadTime + thirdLoadTime) / 2;
    const finalImprovement = firstLoadTime - avgCachedTime;
    const finalImprovementPercent = (finalImprovement / firstLoadTime) * 100;

    console.log('📊 最終統計:');
    console.log(`  - 初回読み込み: ${firstLoadTime}ms`);
    console.log(`  - キャッシュ後平均: ${avgCachedTime.toFixed(0)}ms`);
    console.log(`  - 最終改善時間: ${finalImprovement.toFixed(0)}ms`);
    console.log(`  - 最終改善率: ${finalImprovementPercent.toFixed(1)}%`);

    return {
      firstLoadTime,
      secondLoadTime,
      thirdLoadTime,
      avgCachedTime,
      finalImprovementPercent,
      cacheStatus
    };

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// テスト実行
testCacheEffectiveness()
  .then(results => {
    console.log('\n🎉 テスト完了！');
    console.log(`Service Workerキャッシュ効果: ${results.finalImprovementPercent.toFixed(1)}%改善`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ テスト失敗:', error.message);
    process.exit(1);
  });
