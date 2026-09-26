/* দোকান হিসাব — সার্ভিস ওয়ার্কার
 * নেট ছাড়া আগে খোলা পেজগুলো খুলবে, স্ট্যাটিক ফাইল ক্যাশে রাখবে।
 * API কল কখনো ক্যাশে হয় না — অফলাইন এন্ট্রি localStorage কিউ-তে জমা থাকে,
 * নেট ফিরলে অ্যাপ নিজে থেকে সার্ভারে সিঙ্ক করে।
 */

const VERSION = "dokan-hishab-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

/** ইনস্টলের সময় আগাম ক্যাশে রাখা হবে */
const PRECACHE = [OFFLINE_URL, "/login", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("dokan-hishab-") && n !== STATIC_CACHE && n !== PAGES_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
}

// অ্যাপ থেকে "নতুন SW এখনই চালু করো" বার্তা
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // শুধু নিজের origin — ফন্ট/CDN বাইরের ক্যাশে হাত দেব না
  if (url.origin !== self.location.origin) return;

  // API: সবসময় নেটওয়ার্ক (কানেক্টিভিটি চেক /api/ping-ও ক্যাশে হবে না)
  if (url.pathname.startsWith("/api/")) return;

  // পেজ নেভিগেশন: নেটওয়ার্ক ফার্স্ট → ক্যাশে → অফলাইন পেজ
  if (request.mode === "navigate") {
    event.respondWith(navigateFallback(request));
    return;
  }

  // স্ট্যাটিক অ্যাসেট (_next/static, আইকন, ছবি): ক্যাশে ফার্স্ট
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // বাকি সব GET: নেটওয়ার্ক ফার্স্ট, ব্যর্থ হলে ক্যাশে
  event.respondWith(networkFirst(request, PAGES_CACHE));
});

async function navigateFallback(request) {
  try {
    const fresh = await fetch(request);
    // সফল পেজ-রেসপন্স ক্যাশে তুলে রাখি (অফলাইনে খোলার জন্য)
    if (fresh && fresh.ok) {
      const copy = fresh.clone();
      caches.open(PAGES_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
    }
    return fresh;
  } catch {
    const cached =
      (await caches.match(request, { ignoreSearch: false }).catch(() => null)) ||
      (await caches.match(request.url.split("?")[0]).catch(() => null));
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL).catch(() => null);
    if (offline) return offline;
    return new Response("অফলাইন — ইন্টারনেট সংযোগ নেই", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request).catch(() => null);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const copy = fresh.clone();
      caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => undefined);
    }
    return fresh;
  } catch {
    return caches.match(OFFLINE_URL).then(
      (r) =>
        r ||
        new Response("অফলাইন", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    );
  }
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const copy = fresh.clone();
      caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => undefined);
    }
    return fresh;
  } catch {
    const cached = await caches.match(request).catch(() => null);
    if (cached) return cached;
    return new Response("অফলাইন — ইন্টারনেট সংযোগ নেই", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
