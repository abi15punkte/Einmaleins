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

function sameOriginUrl(value) {
  const url = new URL(value, self.location.href);
  return url.origin === self.location.origin ? url.href : null;
}

function extractBuiltAssets(html) {
  const urls = new Set(APP_SHELL);
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = sameOriginUrl(match[1]);
      if (url) urls.add(url);
    }
  }

  return [...urls];
}

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

async function preCacheAppShell(cache) {
  const indexResponse = await fetch("./index.html", { cache: "no-store" });
  if (!indexResponse.ok) throw new Error(`index.html could not be cached: ${indexResponse.status}`);

  const indexCopy = indexResponse.clone();
  await cache.put("./index.html", indexCopy);
  await cache.put("./", indexResponse.clone());

  const html = await indexResponse.text();
  const assetUrls = extractBuiltAssets(html);

  await Promise.all(assetUrls.map(async (assetUrl) => {
    try {
      const response = await fetch(assetUrl, { cache: "no-store" });
      if (response.ok) {
        await cache.put(assetUrl, response.clone());
      }
    } catch {
      // One optional asset must not prevent the service worker from installing.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => preCacheAppShell(cache))
      .catch(() => {
        // Keep installation alive even if a non-critical shell asset is unavailable.
      })
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
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
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
