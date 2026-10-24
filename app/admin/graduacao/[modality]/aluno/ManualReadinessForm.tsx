"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setManualReadiness } from "@/app/coach/graduacao/actions";

type Mode = "AUTO" | "READY" | "NOT_READY";

const label: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", margin: "var(--space-3) 0 6px" };

const MODES: { value: Mode; label: string; on: string }[] = [
  { value: "AUTO", label: "Automático", on: "var(--text-secondary)" },
  { value: "READY", label: "✓ Pronto", on: "var(--success)" },
  { value: "NOT_READY", label: "✕ Ainda não", on: "var(--danger)" },
];

export function ManualReadinessForm({
  studentId,
  modalityCode,
  initial,
  autoReady,
  lastChange,
}: {
  studentId: string;
  modalityCode: string;
  initial: { status: "READY" | "NOT_READY"; reason: string; validUntil: string | null } | null;
  /** Estado pelos requisitos automáticos (sem a decisão manual). */
  autoReady: boolean;
  lastChange: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial?.status ?? "AUTO");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setMessage(null);
    start(async () => {
      const r = await setManualReadiness({ studentId, modalityCode, status: mode === "AUTO" ? null : mode, reason, validUntil });
      setMessage(r.error ? { kind: "error", text: r.error } : { kind: "success", text: "Guardado." });
      if (!r.error) router.refresh();
    });
  };

  return (
    <section className="card" style={{ marginTop: "var(--space-5)" }} aria-labelledby="prontidao">
      <h2 id="prontidao" style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>
        Decisão do coach / admin
      </h2>
      <p style={{ margin: "4px 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        Pelos requisitos: <strong style={{ color: autoReady ? "var(--success)" : "var(--text-primary)" }}>{autoReady ? "apto" : "ainda não apto"}</strong>.
        Uma decisão manual sobrepõe-se e abre ou fecha a agenda de exames para este aluno.
      </p>
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {MODES.map((m, i) => {
          const on = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m.value)}
              style={{
                padding: "9px 4px",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                border: 0,
                borderLeft: i > 0 ? "1px solid var(--border)" : 0,
                cursor: "pointer",
                color: on ? m.on : "var(--text-secondary)",
                background: on ? `color-mix(in srgb, ${m.on} 16%, transparent)` : "var(--bg)",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {mode !== "AUTO" && (
        <>
          <label style={label} htmlFor="readiness-reason">
            Motivo (o aluno vê)
          </label>
          <textarea
            id="readiness-reason"
            className="input"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "NOT_READY" ? "ex.: Precisa de trabalhar a guarda alta antes do exame." : "ex.: Validado pelo coach — treina noutra filial."}
            style={{ resize: "vertical" }}
          />
          <label style={label} htmlFor="readiness-until">
            Válido até <span style={{ fontWeight: 400 }}>(opcional — depois volta a Automático)</span>
          </label>
          <input id="readiness-until" type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            {mode === "NOT_READY"
              ? "A agenda fica fechada para este aluno. Uma marcação que já exista mantém-se — remove-a no dia de exame, se for preciso."
              : "A agenda fica aberta para este aluno, mesmo sem cumprir todos os requisitos."}
          </p>
        </>
      )}

      <button type="button" className="btn btn-primary" style={{ marginTop: "var(--space-3)", width: "100%" }} disabled={pending} onClick={save}>
        {pending ? "A guardar…" : "Guardar"}
      </button>
      {message && (
        <p role="status" style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: message.kind === "error" ? "var(--danger)" : "var(--success)" }}>
          {message.text}
        </p>
      )}
      {lastChange && <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{lastChange}</p>}
    </section>
  );
}
