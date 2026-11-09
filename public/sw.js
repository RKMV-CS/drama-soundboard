// Classic service worker. Shell is precached; audio is cached on first play (network-first);
// API is network-first with a cached fallback. Bump CACHE to ship a new shell.
const CACHE = "sb-shell-v2";

const SHELL = [
  "/",
  "/index.html",
  "/soundboard.html",
  "/css/app.css",
  "/css/base.css",
  "/css/components.css",
  "/css/fonts.css",
  "/css/levels.css",
  "/css/show.css",
  "/css/tokens.css",
  "/js/api.js",
  "/js/audio.js",
  "/js/cue-format.js",
  "/js/engine.js",
  "/js/icons.js",
  "/js/keys.js",
  "/js/levels.js",
  "/js/library.js",
  "/js/projects.js",
  "/js/pwa.js",
  "/js/show-mode.js",
  "/js/soundboard.js",
  "/js/steps-sync.js",
  "/js/steps.js",
  "/js/store.js",
  "/js/theme-init.js",
  "/js/theme.js",
  "/js/time-format.js",
  "/js/toast.js",
  "/js/tracks.js",
  "/img/icons.svg",
  "/favicon.svg",
  "/fonts/barlow-400.woff2",
  "/fonts/barlow-600.woff2",
  "/fonts/barlow-condensed-600.woff2",
  "/fonts/barlow-condensed-700.woff2",
  "/fonts/courier-prime-400.woff2",
  "/fonts/courier-prime-700.woff2",
  "/fonts/source-sans-3-var.woff2",
  "/manifest.webmanifest",
];

const AUDIO = /^\/projects\/[^/]+\/audios\//;
const SHELL_ASSET = /^\/(css|js|fonts|img)\/|^\/(favicon\.svg|manifest\.webmanifest)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Caches 200 responses only, so 206 partial responses and errors never land in the cache.
function store(req, res) {
  if (res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

async function navigate(req, url) {
  try {
    return await fetch(req);
  } catch (err) {
    const cached = await caches.match(url.pathname, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

// Network-first: a file re-uploaded under the same name must never play stale. The cache is the offline fallback.
async function audio(req) {
  try {
    const res = await fetch(req);
    if (req.headers.has("range")) {
      // Range replies are 206 and never cached; fetch the whole file once so later offline plays work.
      if (!(await caches.match(req.url))) fetch(req.url).then((full) => store(req.url, full)).catch(() => {});
      return res;
    }
    return store(req, res);
  } catch (err) {
    const hit = await caches.match(req.url);
    if (hit) return hit;
    throw err;
  }
}

async function api(req) {
  try {
    return store(req, await fetch(req));
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function swr(req) {
  const hit = await caches.match(req);
  const net = fetch(req).then((res) => store(req, res));
  if (hit) {
    net.catch(() => {});
    return hit;
  }
  return net;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname === "/health") return;
  if (req.mode === "navigate") return e.respondWith(navigate(req, url));
  if (AUDIO.test(url.pathname)) return e.respondWith(audio(req));
  if (url.pathname.startsWith("/projects")) return e.respondWith(api(req));
  if (SHELL_ASSET.test(url.pathname)) return e.respondWith(swr(req));
});
