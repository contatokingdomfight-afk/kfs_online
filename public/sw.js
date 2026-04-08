/**
 * Service worker mínimo: sem cache de páginas ou APIs (evita dados obsoletos em sessões autenticadas).
 * Não regista handler de `fetch`: se o fizermos com `respondWith(fetch(...))`, qualquer falha de rede
 * (offline, aborto, erro) rejeita a promessa e o DevTools mostra "Failed to fetch" / FetchEvent network error.
 * Sem listener de fetch, o browser trata os pedidos normalmente; o SW continua a contar para instalação PWA.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
