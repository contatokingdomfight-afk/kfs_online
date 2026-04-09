/**
 * Service worker mínimo: sem cache de páginas ou APIs.
 * O Chrome (Android) exige um handler `fetch` para cumprir critérios de instalação PWA.
 * Em caso de falha de rede, devolvemos Response.error() em vez de rejeitar a promessa
 * (evita "Uncaught (in promise) Failed to fetch" no SW).
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        return Response.error();
      }
    })()
  );
});
