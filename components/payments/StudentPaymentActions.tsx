"use client";

import { useState } from "react";

const btn: React.CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", font: "inherit" };

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

async function post(path: string, body?: unknown): Promise<{ url?: string; ok?: boolean; error?: string }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as { url?: string; ok?: boolean; error?: string };
    if (!res.ok || data.error) return { error: data.error ?? "Não foi possível concluir. Tenta outra vez." };
    return data;
  } catch {
    return { error: "Erro de rede. Tenta outra vez." };
  }
}

/** Mensalidades em atraso: escolher os meses (todos por omissão) e pagar pela Revolut. */
export function LatePaymentsPayForm({ items }: { items: { id: string; label: string; amount: number }[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = items.filter((i) => selected.has(i.id)).reduce((t, i) => t + i.amount, 0);

  async function pay() {
    setError(null);
    setPending(true);
    const res = await post("/api/tuition-checkout", { paymentIds: [...selected] });
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Não foi possível iniciar o pagamento.");
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((i) => (
        <label key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)", fontSize: 14, cursor: items.length > 1 ? "pointer" : "default" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, textTransform: "none" }}>
            {items.length > 1 ? (
              <input
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(i.id);
                  else next.delete(i.id);
                  setSelected(next);
                }}
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
            ) : null}
            <span style={{ textTransform: "capitalize" }}>{i.label}</span>
          </span>
          <strong>{euro(i.amount)}</strong>
        </label>
      ))}
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary" style={{ ...btn, width: "100%" }} onClick={pay} disabled={pending || total <= 0}>
        {pending ? "A abrir a Revolut…" : `💳 Pagar ${euro(total)} com Revolut`}
      </button>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cartão, Apple Pay, Google Pay ou conta Revolut · fica pago sozinho, sem enviares comprovativo.</span>
    </div>
  );
}

/** Aceitar a fidelização (6 meses) depois de ler os termos. */
export function LoyaltyAcceptButton({ label, consentText }: { label: string; consentText: string }) {
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setPending(true);
    const res = await post("/api/loyalty/start");
    if (res.ok) {
      window.location.reload();
      return;
    }
    setError(res.error ?? "Não foi possível ativar.");
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#f5c542" }} />
        <span>{consentText}</span>
      </label>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <button type="button" className="btn" style={{ ...btn, width: "100%", background: "#f5c542", border: "1px solid #f5c542", color: "#111" }} onClick={go} disabled={!agreed || pending}>
        {pending ? "A ativar…" : label}
      </button>
    </div>
  );
}

/** Pagar adiantado a próxima mensalidade (mês e valor calculados no servidor). */
export function AdvancePayButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setPending(true);
    const res = await post("/api/tuition-checkout", { advance: true });
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Não foi possível iniciar o pagamento.");
    setPending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" className="btn btn-primary" style={{ ...btn, width: "100%" }} onClick={pay} disabled={pending}>
        {pending ? "A abrir a Revolut…" : label}
      </button>
      {error ? (
        <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
