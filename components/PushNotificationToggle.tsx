"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";

type Props = {
  locale: "pt" | "en";
  /** "home": convite compacto na Home — só aparece enquanto o push não está activo e pode ser dispensado. */
  variant?: "card" | "home";
};

const HOME_DISMISS_KEY = "kfs-push-invite-dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationToggle({ locale, variant = "card" }: Props) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (variant !== "home") return;
    try {
      setDismissed(window.localStorage.getItem(HOME_DISMISS_KEY) === "1");
    } catch {
      /* sem localStorage: mostra o convite */
    }
  }, [variant]);

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
    setChecked(true);
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

  if (variant === "home") {
    // Só enquanto não está activo (ou logo a seguir a activar, para mostrar a confirmação).
    if (!checked || dismissed || (enabled && !message)) return null;
    const dismiss = () => {
      setDismissed(true);
      try {
        window.localStorage.setItem(HOME_DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <span aria-hidden style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 13, background: "rgba(96,165,250,0.16)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BellRing size={21} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>
            {enabled ? (locale === "pt" ? "Notificações activadas" : "Notifications on") : locale === "pt" ? "Activa as notificações" : "Turn on notifications"}
          </span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            {message && !enabled
              ? message
              : enabled
                ? locale === "pt"
                  ? "Vais receber o lembrete depois de cada aula."
                  : "You'll get a reminder after each class."
                : locale === "pt"
                  ? "Lembramos-te de dar a nota depois da aula (+XP)."
                  : "We'll remind you to rate each class (+XP)."}
          </span>
        </span>
        {!enabled ? (
          <button type="button" className="btn btn-primary" onClick={() => void toggle()} disabled={busy} style={{ flexShrink: 0 }}>
            {busy ? "…" : locale === "pt" ? "Activar" : "Turn on"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label={locale === "pt" ? "Fechar" : "Close"}
          style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 16, border: "none", background: "transparent", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    );
  }

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
