"use client";

import { useState } from "react";

const btn: React.CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", font: "inherit" };

function useAction(path: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(): Promise<{ url?: string; ok?: boolean } | null> {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Não foi possível concluir. Tenta outra vez.");
        setPending(false);
        return null;
      }
      return data;
    } catch {
      setError("Erro de rede. Tenta outra vez.");
      setPending(false);
      return null;
    }
  }
  return { pending, error, run, setPending };
}

/** «Ativar pagamento automático»: confirmação (plano, valor, autorização) → página segura da Revolut. */
export function AutoPayActivateButton({ label, planName, amountLabel, firstChargeLabel }: { label: string; planName: string; amountLabel: string; firstChargeLabel: string }) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { pending, error, run } = useAction("/api/autopay/start");

  async function go() {
    const data = await run();
    if (data?.url) window.location.href = data.url;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" style={{ ...btn, width: "100%" }} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div role="dialog" aria-labelledby="autopay-confirm-title" style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--bg)", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 id="autopay-confirm-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
        Ativar pagamento automático
      </h3>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[
          ["Plano", planName],
          ["Valor mensal", amountLabel],
          ["Hoje", firstChargeLabel],
          ["Próximas cobranças", "neste dia, todos os meses"],
        ].map(([k, v]) => (
          <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "8px 10px", background: "var(--bg-secondary)" }}>
            <dt style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</dt>
            <dd style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Vais para uma página segura da Revolut. A Revolut guarda o teu cartão — a Kingdom Fight School nunca o vê. Avisamos-te 3 dias antes de cada cobrança e podes cancelar aqui quando quiseres.
      </p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--primary)" }} />
        <span>Autorizo a Kingdom Fight School a cobrar {amountLabel} por mês até cancelar.</span>
      </label>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button type="button" className="btn" style={{ ...btn, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={() => setOpen(false)} disabled={pending}>
          Agora não
        </button>
        <button type="button" className="btn btn-primary" style={btn} onClick={go} disabled={!agreed || pending}>
          {pending ? "A abrir a Revolut…" : "Continuar para a Revolut"}
        </button>
      </div>
    </div>
  );
}

/** Cancelar com confirmação. */
export function AutoPayCancelButton({ note }: { note: string }) {
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useAction("/api/autopay/cancel");

  async function go() {
    const data = await run();
    if (data?.ok) window.location.reload();
  }

  if (!confirming) {
    return (
      <button type="button" className="btn" style={{ ...btn, minHeight: 36, fontSize: 13, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={() => setConfirming(true)}>
        Cancelar pagamento automático
      </button>
    );
  }
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--bg)" }}>
      <strong style={{ fontSize: 15 }}>Cancelar o pagamento automático?</strong>
      <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{note}</span>
      {error ? (
        <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn" style={{ ...btn, minHeight: 38, fontSize: 13, border: "1px solid var(--danger)", color: "var(--danger)", background: "transparent" }} onClick={go} disabled={pending}>
          {pending ? "A cancelar…" : "Sim, cancelar"}
        </button>
        <button type="button" className="btn" style={{ ...btn, minHeight: 38, fontSize: 13, background: "transparent", border: "1px solid var(--border)" }} onClick={() => setConfirming(false)} disabled={pending}>
          Manter ativo
        </button>
      </div>
    </div>
  );
}
