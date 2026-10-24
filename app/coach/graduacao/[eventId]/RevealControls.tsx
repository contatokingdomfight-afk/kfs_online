"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { revealResultsNow, setResultsRevealAt } from "../actions";

const TZ = "Europe/Lisbon";

function lisbonParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "18:00" };
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: TZ });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return { date, time };
}

/** Coach/admin: data de revelação dos resultados do dia de exame e «Revelar agora». */
export function RevealControls({
  eventId,
  revealAt,
  hiddenCount,
  undecidedCount,
}: {
  eventId: string;
  revealAt: string | null;
  /** Decididos mas ainda escondidos dos alunos. */
  hiddenCount: number;
  undecidedCount: number;
}) {
  const router = useRouter();
  const initial = lisbonParts(revealAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const due = revealAt != null && new Date(revealAt).getTime() <= Date.now();
  const label = revealAt
    ? new Date(revealAt).toLocaleString("pt-PT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })
    : null;

  const save = () =>
    start(async () => {
      setMessage(null);
      const r = await setResultsRevealAt(eventId, date, time);
      setMessage(r.error ? { kind: "error", text: r.error } : { kind: "success", text: date ? "Data guardada." : "Data removida." });
      if (!r.error) router.refresh();
    });

  const revealNow = () => {
    if (!window.confirm("Revelar já os resultados decididos? Os alunos são notificados e os graus atribuídos.")) return;
    start(async () => {
      setMessage(null);
      const r = await revealResultsNow(eventId);
      setMessage(r.error ? { kind: "error", text: r.error } : { kind: "success", text: `${r.revealed ?? 0} ${r.revealed === 1 ? "resultado revelado" : "resultados revelados"}.` });
      if (!r.error) router.refresh();
    });
  };

  return (
    <section
      className="card"
      style={{
        marginBottom: "var(--space-5)",
        borderColor: due ? "var(--border)" : "color-mix(in srgb, var(--warning) 40%, transparent)",
        background: due ? undefined : "color-mix(in srgb, var(--warning) 6%, var(--bg-secondary))",
      }}
      aria-labelledby="revelacao"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
        <h2 id="revelacao" style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {!due && <Lock size={16} aria-hidden />} {due ? "Resultados visíveis aos alunos" : "Resultados escondidos dos alunos"}
        </h2>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            color: due ? "var(--success)" : "var(--warning)",
            background: `color-mix(in srgb, ${due ? "var(--success)" : "var(--warning)"} 14%, transparent)`,
          }}
        >
          {label ? (due ? `Revelados desde ${label}` : `Revela ${label}`) : "Sem data de revelação"}
        </span>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        {hiddenCount} {hiddenCount === 1 ? "decidido por revelar" : "decididos por revelar"}
        {undecidedCount > 0 && ` · ${undecidedCount} ainda por decidir`}. O grau, o XP e a notificação só chegam ao aluno na data.
      </p>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data de revelação" style={{ flex: "1 1 140px" }} />
        <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora de revelação" style={{ flex: "0 1 110px" }} />
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={save}>
          {revealAt ? "Alterar data" : "Guardar data"}
        </button>
        {hiddenCount > 0 && (
          <button type="button" className="btn btn-primary" disabled={pending} onClick={revealNow}>
            Revelar agora
          </button>
        )}
      </div>
      {message && (
        <p role="status" style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: message.kind === "error" ? "var(--danger)" : "var(--success)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
