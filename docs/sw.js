// Ultimate Squash Game - Service Worker
// Version: 1.0.0

const CACHE_NAME = 'ultimate-squash-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// キャッシュするファイルのリスト
const STATIC_ASSETS = [
  './',
  './game.html',
  './manifest.json',
  // Pyodide関連のファイルは動的に取得されるため、ここには含めない
];

// Service Worker インストール時
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service Worker installed successfully');
        // 新しいService Workerをすぐにアクティブにする
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error during installation:', error);
      })
  );
});

// Service Worker アクティベート時
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // 古いキャッシュを削除
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated successfully');
        // すべてのクライアントを即座に制御下に置く
        return self.clients.claim();
      })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 同一オリジンのリクエストのみ処理
  if (url.origin !== location.origin) {
    return;
  }
  
  // キャッシュ戦略の決定
  if (request.mode === 'navigate' || request.destination === 'document') {
    // HTMLページはネットワークファースト
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.includes('pyodide') || url.pathname.includes('.wasm')) {
    // Pyodide関連ファイルはキャッシュファースト（大きいファイルなので）
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'image' || 
             request.destination === 'font' || 
             request.destination === 'style') {
    // 静的アセットはキャッシュファースト
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // その他はネットワークファースト
    event.respondWith(networkFirstStrategy(request));
  }
});

// ネットワークファースト戦略
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 成功したレスポンスをキャッシュに保存
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, falling back to cache:', error);
    
    // ネットワークエラー時はキャッシュから返す
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // キャッシュもない場合はオフラインページを返す（あれば）
    if (request.mode === 'navigate') {
      return caches.match('./game.html');
    }
    
    // 何もない場合はエラーを投げる
    throw error;
  }
}

// キャッシュファースト戦略
async function cacheFirstStrategy(request) {
  // キャッシュをチェック
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // キャッシュが見つかった場合は、バックグラウンドで更新をチェック
    refreshCache(request);
    return cachedResponse;
  }
  
  // キャッシュにない場合はネットワークから取得
  try {
    const networkResponse = await fetch(request);
    
    // 成功したレスポンスをキャッシュに保存
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    // 404ページなどのフォールバックレスポンスを返すこともできる
    throw error;
  }
}

// バックグラウンドでキャッシュを更新
async function refreshCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse);
      console.log('[SW] Cache refreshed for:', request.url);
    }
  } catch (error) {
    // バックグラウンド更新のエラーは無視
    console.log('[SW] Background refresh failed:', error);
  }
}

// メッセージ処理（キャッシュクリアなど）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('[SW] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(() => {
          // クライアントに完了を通知
          event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
        })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// プッシュ通知（将来の実装用）
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    title: 'Ultimate Squash Game',
    body: event.data ? event.data.text() : '新しいチャレンジが利用可能です！',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMwMDQyNzQiLz4KPGNpcmNsZSBjeD0iOTYiIGN5PSI5NiIgcj0iMjQiIGZpbGw9IiNmZmZmZmYiLz4KPHJlY3QgeD0iODQiIHk9IjE0NCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjM2IiByeD0iNCIgZmlsbD0iIzAwZmYwMCIvPgo8L3N2Zz4K',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDA0Mjc0Ii8+CjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjQiIGZpbGw9IiNmZmZmZmYiLz4KPHJlY3QgeD0iMTQiIHk9IjI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI2IiBmaWxsPSIjMDBmZjAwIi8+Cjwvc3ZnPgo=',
    vibrate: [200, 100, 200],
    tag: 'ultimate-squash-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('Ultimate Squash Game', options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});