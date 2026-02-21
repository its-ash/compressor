const CACHE_NAME = "webllm-lab-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./manifest.webmanifest",
  "./pkg/webllm_wasm.js",
  "./pkg/webllm_wasm_bg.wasm",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and non-origin requests
  if (request.method !== "GET" || url.origin !== location.origin) {
    return;
  }
  
  // Skip unsupported URL schemes (chrome-extension, blob, data, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clone).catch(err => {
                console.warn('[SW] Failed to cache:', request.url, err.message);
              });
            });
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    ASSETS.map(async asset => {
      try {
        await cache.add(asset);
      } catch (err) {
        console.warn("[webllm] skipped caching", asset, err.message);
      }
    })
  );
}
