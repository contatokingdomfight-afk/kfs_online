/**
 * Service worker PWA — pass-through de rede; bump `SW_VERSION` para forçar atualização.
 */
const SW_VERSION = "kfs-brand-v15";

self.addEventListener("push", (event) => {
  let data = { title: "Kingdom Fight School", body: "", url: "/dashboard/notificacoes" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload inválido */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/kfs-emblem-192.png",
      badge: "/icons/kfs-emblem-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/notificacoes";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

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
