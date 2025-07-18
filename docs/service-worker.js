/**
 * Ultimate Squash Game - Service Worker
 * Pyodideとゲームアセットのキャッシュ管理
 */

const CACHE_NAME = 'ultimate-squash-v1';
const PYODIDE_CACHE_NAME = 'pyodide-v0.26.4';

// キャッシュするPyodideファイル
const PYODIDE_URLS = [
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.js',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.wasm',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide-lock.json',
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.data'
];

// 追加でキャッシュするゲームアセット
const GAME_ASSETS = [
  '/docs/game.html',
  '/docs/js/game.js' // もし存在する場合
];

// インストール時にPyodideファイルをプリキャッシュ
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    (async () => {
      // Pyodide専用キャッシュ
      const pyodideCache = await caches.open(PYODIDE_CACHE_NAME);
      console.log('[Service Worker] Caching Pyodide files...');
      
      // Pyodideファイルを個別にキャッシュ（エラーハンドリング付き）
      for (const url of PYODIDE_URLS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await pyodideCache.put(url, response);
            console.log(`[Service Worker] Cached: ${url}`);
          } else {
            console.warn(`[Service Worker] Failed to fetch: ${url}`);
          }
        } catch (error) {
          console.warn(`[Service Worker] Error caching ${url}:`, error);
        }
      }
      
      // ゲームアセット用キャッシュ
      const gameCache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching game assets...');
      
      for (const asset of GAME_ASSETS) {
        try {
          const response = await fetch(asset);
          if (response.ok) {
            await gameCache.put(asset, response);
            console.log(`[Service Worker] Cached: ${asset}`);
          }
        } catch (error) {
          console.warn(`[Service Worker] Error caching ${asset}:`, error);
        }
      }
      
      // 即座にアクティベート
      await self.skipWaiting();
    })()
  );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      // 現在のキャッシュ以外を削除
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== PYODIDE_CACHE_NAME)
          .map(name => caches.delete(name))
      );
      
      // すべてのクライアントを即座に制御
      await self.clients.claim();
      console.log('[Service Worker] Active and controlling all clients');
    })()
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Pyodideファイルのリクエスト
  if (url.href.includes('cdn.jsdelivr.net/pyodide')) {
    event.respondWith(
      (async () => {
        // まずキャッシュから探す
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log(`[Service Worker] Serving from cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        // キャッシュになければネットワークから取得してキャッシュ
        console.log(`[Service Worker] Fetching from network: ${url.pathname}`);
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(PYODIDE_CACHE_NAME);
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          console.error('[Service Worker] Fetch failed:', error);
          throw error;
        }
      })()
    );
    return;
  }
  
  // ゲームアセットのリクエスト
  if (url.pathname.includes('/docs/')) {
    event.respondWith(
      (async () => {
        // キャッシュファースト戦略
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // ネットワークフォールバック
        return fetch(event.request);
      })()
    );
    return;
  }
  
  // その他のリクエストは通常通り処理
  return;
});

// キャッシュ状態を報告するメッセージハンドラー
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const pyodideCache = await caches.open(PYODIDE_CACHE_NAME);
        const gameCache = await caches.open(CACHE_NAME);
        
        const pyodideKeys = await pyodideCache.keys();
        const gameKeys = await gameCache.keys();
        
        event.ports[0].postMessage({
          type: 'CACHE_STATUS_RESPONSE',
          pyodideFiles: pyodideKeys.length,
          gameFiles: gameKeys.length,
          cacheNames: [PYODIDE_CACHE_NAME, CACHE_NAME]
        });
      })()
    );
  }
});