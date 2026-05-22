/**
 * Service worker mínimo para PWA (instalável no ecrã principal).
 *
 * Regras:
 * - **Não** chamar `event.respondWith()` para pedidos normais. Deixar o browser tratar
 *   navegação, prefetch, RSC e APIs — evita no DevTools o aviso «FetchEvent … network error»
 *   quando um `fetch` falha ou aborta (ex.: `/admin`, pedidos internos do Next).
 * - Não interceptar aqui cross-origin (não recebemos esses eventos como mesmo SW).
 *
 * Instalação + `clients.claim()` bastam para critérios típicos de PWA; cache offline
 * pode ser acrescentado mais tarde com rotas explícitas.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through intencional: não usar respondWith.
});
