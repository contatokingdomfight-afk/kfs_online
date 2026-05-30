/**
 * Service worker PWA — pass-through de rede; bump `SW_VERSION` para forçar atualização.
 */
const SW_VERSION = "kfs-brand-v10";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SW_VERSION).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", () => {
  // Pass-through intencional: não usar respondWith.
});
