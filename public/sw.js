const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_NAME = `einmaleins-${BUILD_ID}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./einmaleins-icon.svg",
  "./space-theme.css?v=23",
  "./game-layout-tweaks.css?build=__BUILD_ID__",
  "./orientation-lock.css?build=__BUILD_ID__",
  "./start-class-mascot.css",
  "./start-class-mascot.js",
  "./Querformathinweis.png",
  "./Background.png",
  "./Alien.png",
  "./src/responsive.css",
  "./src/laptop.css",
];

const HIGHSCORE_ASSETS = [
  "./Background.png",
  "./Alien.png",
  ...Array.from({ length: 16 }, (_, index) => `./M${index + 1}.png`),
  "./Stern1.png",
  "./Stern2.png",
  "./Stern3.png",
];

async function enhanceNavigationResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  if (html.includes("start-class-mascot.js")) return new Response(html, response);

  const enhanced = html
    .replace(
      "</head>",
      "  <link rel=\"stylesheet\" href=\"./start-class-mascot.css\">\n  </head>"
    )
    .replace(
      "</body>",
      "  <script src=\"./start-class-mascot.js\"></script>\n</body>"
    );

  return new Response(enhanced, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

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
          .filter((key) => key.startsWith("einmaleins-") && key !== CACHE_NAME)
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
  const isHighscoreAsset = requestUrl.origin === self.location.origin && HIGHSCORE_ASSETS.some((asset) => {
    const assetUrl = new URL(asset, self.location.href);
    return requestUrl.pathname === assetUrl.pathname;
  });

  if (isHighscoreAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request, { cache: "no-store" }).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(async (response) => {
        const finalResponse = isNavigation ? await enhanceNavigationResponse(response.clone()) : response;
        if (finalResponse.ok && requestUrl.origin === self.location.origin) {
          const copy = finalResponse.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));

          if (isNavigation) {
            const indexCopy = finalResponse.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", indexCopy));
          }
        }
        return finalResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached ?? caches.match("./index.html")
        )
      )
  );
});
