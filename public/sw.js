/**
 * Service worker mínimo para PWA.
 * Regras:
 * - Não interceptar pedidos cross-origin (Supabase, Stripe, Google, etc.)
 * - Não interceptar navegações de página (mode: navigate) — deixar o browser
 *   tratar directamente para garantir que os cookies de sessão são enviados
 * - Não interceptar métodos não-GET
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorar pedidos cross-origin (Supabase, Stripe, Google, CDNs, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Ignorar navegações de página — o browser envia cookies nativo sem intervenção do SW
  if (request.mode === "navigate") return;

  // Ignorar métodos não-GET
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(() => Response.error())
  );
});
