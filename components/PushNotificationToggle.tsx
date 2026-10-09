"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  locale: "pt" | "en";
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationToggle({ locale }: Props) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    void fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((j: { publicKey?: string | null }) => setPublicKey(j.publicKey ?? null))
      .catch(() => setPublicKey(null));
  }, []);

  const refreshState = useCallback(async () => {
    if (!supported || !publicKey) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setEnabled(Boolean(sub));
  }, [supported, publicKey]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const toggle = async () => {
    if (!supported || !publicKey || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMessage(locale === "pt" ? "Permissão de notificações recusada." : "Notification permission denied.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      if (enabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setEnabled(false);
        setMessage(locale === "pt" ? "Notificações push desactivadas." : "Push notifications disabled.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Subscribe failed");
      }
      setEnabled(true);
      setMessage(locale === "pt" ? "Notificações push activadas." : "Push notifications enabled.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : locale === "pt" ? "Erro ao activar push." : "Failed to enable push.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported || !publicKey) return null;

  return (
    <section
      className="card"
      style={{ marginTop: 24, padding: "clamp(16px, 4vw, 20px)" }}
      aria-labelledby="push-toggle-title"
    >
      <h2 id="push-toggle-title" style={{ margin: "0 0 8px", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600 }}>
        {locale === "pt" ? "Notificações push (PWA)" : "Push notifications (PWA)"}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {locale === "pt"
          ? "Recebe alertas no telemóvel ou computador quando instalares a app ou usares o site com service worker — gratuito (Web Push / VAPID)."
          : "Get alerts on your phone or desktop with the installed app or service worker — free (Web Push / VAPID)."}
      </p>
      <button type="button" className="btn btn-secondary" onClick={() => void toggle()} disabled={busy}>
        {busy
          ? "…"
          : enabled
            ? locale === "pt"
              ? "Desactivar push"
              : "Disable push"
            : locale === "pt"
              ? "Activar push"
              : "Enable push"}
      </button>
      {message ? (
        <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-secondary)" }} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
