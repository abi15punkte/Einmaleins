const CACHE_NAME = "einmaleins-v25";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./einmaleins-icon.svg", "./space-theme.css?v=23", "./game-layout-tweaks.css?v=3", "./Background.png", "./Alien.png", "./src/responsive.css", "./src/laptop.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate" || requestUrl.pathname.endsWith("/index.html");

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response.ok && requestUrl.origin === self.location.origin) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));

          if (isNavigation) {
            const indexCopy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", indexCopy));
          }
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached ?? caches.match("./index.html")
        )
      )
  );
});
