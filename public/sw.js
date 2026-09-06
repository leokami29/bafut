const STATIC_CACHE = "bafut-static-v2";
const STATIC_ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // No tumbar el SW si un asset falla: sin SW activo Chrome no ofrece "Instalar".
        Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
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

self.addEventListener("push", (event) => {
  let data = { title: "BaFut", body: "Hay un partido nuevo", url: "/partidos" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: typeof parsed.title === "string" ? parsed.title : data.title,
        body: typeof parsed.body === "string" ? parsed.body : data.body,
        url: typeof parsed.url === "string" ? parsed.url : data.url,
      };
    }
  } catch {
    // Payload no JSON: usar defaults.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/partidos";
  const absolute =
    typeof targetUrl === "string" && targetUrl.startsWith("http")
      ? targetUrl
      : new URL(targetUrl || "/partidos", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          client.navigate(absolute);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absolute);
      }
      return undefined;
    }),
  );
});

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
