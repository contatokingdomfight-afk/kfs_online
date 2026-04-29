"use client";

import { useState } from "react";

type Props = {
  locale: "pt" | "en";
  title: string;
  body: string;
  cta: string;
  priceHint: string;
  loading: string;
};

export function DigitalLibraryAddonBanner({ locale, title, body, cta, priceHint, loading }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setErr(null);
    setPending(true);
    try {
      const res = await fetch("/api/stripe/create-digital-library-addon-checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setErr(data.error ?? (locale === "pt" ? "Não foi possível iniciar o pagamento." : "Could not start payment."));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(locale === "pt" ? "Resposta inválida do servidor." : "Invalid server response.");
    } catch {
      setErr(locale === "pt" ? "Erro de rede." : "Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        borderLeft: "4px solid var(--primary)",
        marginBottom: "clamp(12px, 3vw, 16px)",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
        {title}
      </p>
      <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {body}
      </p>
      <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{priceHint}</p>
      {err && (
        <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "var(--error, #c00)" }} role="alert">
          {err}
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={pending} onClick={onClick} style={{ minHeight: 44 }}>
        {pending ? loading : cta}
      </button>
    </div>
  );
}
