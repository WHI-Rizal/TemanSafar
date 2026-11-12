// Service worker Teman Safar: simpan halaman, data, dan potongan peta biar tetap kebuka pas sinyal hilang di tol.
const VERSION = "ts-v8";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== "jm-tiles" && k !== "ts-quran").map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // potongan peta OSM: pakai cache dulu, simpan maksimal ~800
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    e.respondWith(caches.open("jm-tiles").then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) { c.put(req, res.clone()); c.keys().then((ks) => { if (ks.length > 800) c.delete(ks[0]); }); }
        return res;
      } catch { return hit || Response.error(); }
    }));
    return;
  }
  // Al-Qur'an (versi dikunci, isinya nggak berubah): cache dulu, jadi halaman yang pernah dibuka tetap bisa dibaca tanpa sinyal
  if (url.hostname === "unpkg.com" && url.pathname.startsWith("/quran-madina-html@")) {
    e.respondWith(caches.open("ts-quran").then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // halaman: jaringan dulu, kalau gagal pakai cache
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/", copy)); return res; }).catch(() => caches.match("/")));
    return;
  }
  // file statis Next.js: cache dulu
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/"))) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("/"))));
});
