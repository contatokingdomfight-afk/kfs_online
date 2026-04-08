/**
 * Service worker mínimo: sem cache de páginas ou APIs (evita dados obsoletos em sessões autenticadas).
 * Apenas garante registo ativo para critérios PWA e passa todos os pedidos à rede.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
