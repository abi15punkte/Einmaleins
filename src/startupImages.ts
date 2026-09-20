export const STARTUP_IMAGE_ASSETS = [
  "einmaleins-icon.svg",
  "10.png",
  "50.png",
  "100.png",
  "200.png",
  "10000.png",
  "Querformathinweis.png",
  "Background.png",
  "Alien.png",
  ...Array.from({ length: 15 }, (_, index) => `P${index + 1}.png`),
  ...Array.from({ length: 16 }, (_, index) => `M${index + 1}.png`),
  "Stern1.png",
  "Stern2.png",
  "Stern3.png",
  "RahmenB.png",
  "RahmenS.png",
  "RahmenG.png",
  "Tablet3.png"
] as const;

const IMAGE_CACHE_NAME = "einmaleins-startup-images";
const IMAGE_CACHE_VERSION_URL = "./__startup-version__";
const MAX_CONCURRENT_DOWNLOADS = 4;
const MAX_ATTEMPTS_PER_IMAGE = 4;
const IMAGE_FETCH_TIMEOUT_MS = 30_000;

function getBuildCacheSuffix(): string {
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const buildId = manifestLink
    ? new URL(manifestLink.href, document.baseURI).searchParams.get("build")
    : null;

  return (buildId || "dev").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getStartupImageUrls(): string[] {
  const baseUrl = new URL("./", document.baseURI);
  return STARTUP_IMAGE_ASSETS.map((asset) => new URL(asset, baseUrl).href);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function cacheImage(cache: Cache, url: string): Promise<void> {
  if (await cache.match(url)) return;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_IMAGE; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, { cache: "no-store", signal: controller.signal });
      } finally {
        window.clearTimeout(timeoutId);
      }
      if (!response.ok) {
        throw new Error(`Bild konnte nicht geladen werden: ${url} (${response.status})`);
      }

      await cache.put(url, response);
      if (!await cache.match(url)) {
        throw new Error(`Bild wurde nicht im lokalen Cache gefunden: ${url}`);
      }
      return;
    } catch (error) {
      lastError = error instanceof DOMException && error.name === "AbortError"
        ? new Error(`Bild-Download hat zu lange gedauert: ${url}`)
        : error;
      if (attempt < MAX_ATTEMPTS_PER_IMAGE) {
        await wait(750 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Bild konnte nicht vollständig lokal gespeichert werden: ${url}`);
}

export async function prepareStartupImages(): Promise<void> {
  if (!("caches" in window)) {
    throw new Error("Cache Storage ist auf diesem Gerät nicht verfügbar.");
  }

  const buildId = getBuildCacheSuffix();
  const staleCacheNames = (await caches.keys())
    .filter((name) => name.startsWith("einmaleins-startup-images-"));

  await Promise.all(staleCacheNames.map((name) => caches.delete(name)));

  const cache = await caches.open(IMAGE_CACHE_NAME);
  const versionResponse = await cache.match(IMAGE_CACHE_VERSION_URL);
  const cachedBuildId = versionResponse ? await versionResponse.text() : null;

  if (cachedBuildId !== buildId) {
    await Promise.all((await cache.keys()).map((request) => cache.delete(request)));
  }

  const urls = getStartupImageUrls();
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= urls.length) return;
      await cacheImage(cache, urls[index]);
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_DOWNLOADS, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  for (const url of urls) {
    if (!await cache.match(url)) {
      throw new Error(`Startbild fehlt im lokalen Cache: ${url}`);
    }
  }

  await cache.put(
    IMAGE_CACHE_VERSION_URL,
    new Response(buildId, {
      headers: { "content-type": "text/plain; charset=utf-8" }
    })
  );
}
