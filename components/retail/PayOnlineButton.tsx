"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

/** Abre o checkout online da Revolut (cartão, Apple/Google Pay, Revolut Pay) para a encomenda. */
export function PayOnlineButton({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/revolut/merchant-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Não foi possível iniciar o pagamento.");
    } catch {
      setError("Erro de rede. Tenta outra vez.");
    }
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" onClick={go} disabled={pending} className="btn btn-primary" style={{ minHeight: 48, fontWeight: 800, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <CreditCard size={18} aria-hidden />
        {pending ? "A abrir pagamento…" : "Pagar online (cartão, Apple Pay, Revolut Pay)"}
      </button>
      {error ? (
        <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
