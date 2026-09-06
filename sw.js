const CACHE_NAME = "pesalo-v3";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/storage.js",
  "./js/foodApi.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a la API de USDA: siempre queremos datos frescos.
  if (url.hostname.includes("api.nal.usda.gov")) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ foods: [] }), {
      headers: { "Content-Type": "application/json" }
    })));
    return;
  }

  if (event.request.method !== "GET") return;

  // Red primero para el shell de la app: asi cada visita con internet trae la
  // ultima version publicada. El cache solo se usa como respaldo sin conexion.
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
