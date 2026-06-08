const CACHE_NAME = "webnotes-cache-v1";

// This is fired when the browser first discovers and installs our service worker. 
// We call skipWaiting() so this service worker takes control immediately, without waiting for the user to close and reopen the page.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// This is fired once the service worker becomes active. 
// We immediately claim control over all open tabs (clients), and then clean up any old, outdated caches left over from previous updates so they don't eat up the user's disk space.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      // Clear out outdated caches
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      });
    })
  );
});

// This intercepts every single HTTP fetch request made by the browser. 
// We use a Stale-While-Revalidate caching pattern:
// 1. If the asset (HTML, JS, CSS, images) is already in the cache, we return it instantly. This lets the app load instantly and work 100% offline.
// 2. While serving the cached asset, we fire a background request to fetch any updates from the server and refresh our cache.
// 3. If the request is not in the cache, we fetch it from the network, save it in the cache for next time, and return it.
self.addEventListener("fetch", (event) => {
  // We only care about caching standard GET requests (e.g. page assets)
  if (event.request.method !== "GET") return;

  // We only cache web HTTP/HTTPS resources (ignoring browser extensions or data URIs)
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return the cached version immediately, and kick off a background fetch to check for updates
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore network errors in background update (normal when offline)
          });
        return cachedResponse;
      }

      // If the asset isn't cached yet, fetch it from the network and save it in the cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== "basic" && networkResponse.type !== "cors")) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch((err) => {
          console.error("Fetch failed offline:", err);
        });
    })
  );
});
