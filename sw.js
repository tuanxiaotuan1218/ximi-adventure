const CACHE_NAME = 'ximi-adventure-v1786006601692';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.jpg',
  './icons/icon-512x512.jpg'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 跳过等待，立即激活新SW
  self.skipWaiting();
});

// 激活：清理旧缓存，立即接管所有客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：网络优先，缓存回退（确保每次拿到最新版）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // HTML文档请求：网络优先（确保版本更新能及时生效）
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败，用缓存
        return caches.match('./index.html');
      })
    );
    return;
  }
  
  // 其他资源：缓存优先，后台更新（Stale-While-Revalidate）
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 后台更新
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      
      // 有缓存先返回缓存，无缓存走网络
      return cachedResponse || fetchPromise;
    })
  );
});
