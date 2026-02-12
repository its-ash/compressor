const CACHE_NAME = "video-studio-v4";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./ffmpeg-core.js",
  "./ffmpeg-core.wasm",
  "./ffmpeg-core.worker.js",
  "./ffmpeg.min.js",
  "./pkg/video_wasm.js",
  "./pkg/video_wasm_bg.wasm"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  
  // Only handle GET requests
  if (req.method !== "GET") return;
  
  // Skip chrome-extension and other schemes
  if (!req.url.startsWith("http")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Return cached version if available
      if (cached) return cached;
      
      // Otherwise fetch from network
      return fetch(req)
        .then((resp) => {
          // Don't cache if not successful
          if (!resp || resp.status !== 200 || resp.type === "error") {
            return resp;
          }
          
          // Clone and cache for next time
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => {
          // Return cached fallback or offline page
          return cached || new Response("Offline - please check your connection", {
            status: 503,
            statusText: "Service Unavailable"
          });
        });
    })
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
