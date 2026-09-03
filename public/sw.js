const STATIC_CACHE = "bafut-static-v1";
const STATIC_ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

function isPrivatePath(pathname) {
  return (
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/auth")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Nunca cachear HTML con sesión / rutas privadas.
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    if (isPrivatePath(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("/") || Response.error()),
    );
    return;
  }

  // Network-first para assets públicos; fallback a cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        if (response.ok && (url.pathname.startsWith("/icon") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js"))) {
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
