"use client";

import { useState } from "react";

type Props =
  | { kind: "course"; courseId: string; label: string; secondary?: boolean }
  | { kind: "pass"; interval: "month" | "year"; label: string; secondary?: boolean };

/** Inicia o checkout Stripe da Academy (curso avulso ou Passe) e redireciona. */
export function AcademyCheckoutButton(props: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setPending(true);
    try {
      const body = props.kind === "course" ? { type: "course", courseId: props.courseId } : { type: "pass", interval: props.interval };
      const res = await fetch("/api/stripe/academy-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={props.secondary ? "btn" : "btn btn-primary"}
        style={{ minHeight: 46, fontWeight: 700, width: "100%" }}
      >
        {pending ? "A abrir pagamento…" : props.label}
      </button>
      {error ? (
        <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
