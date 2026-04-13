/**
 * Service worker mínimo para PWA.
 * Não intercepta pedidos cross-origin nem POST/PUT/PATCH/DELETE —
 * isso causava ERR_FAILED nos pedidos de refresh de token ao Supabase.
 * O handler fetch vazio satisfaz os critérios de instalação PWA no Chrome/Android.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorar pedidos cross-origin (ex.: Supabase, Stripe, Google)
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Ignorar métodos não-GET (POST para APIs de auth, etc.)
  if (request.method !== "GET") {
    return;
  }

  // Para pedidos GET same-origin: pass-through com fallback
  event.respondWith(
    fetch(request).catch(() => Response.error())
  );
});
