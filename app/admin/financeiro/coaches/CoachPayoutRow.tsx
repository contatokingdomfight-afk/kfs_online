"use client";

import { useActionState, useState } from "react";
import { markCoachPayoutPaid, undoCoachPayout, type CoachPayoutResult } from "./actions";

export type CoachPayoutRowView = {
  coachId: string;
  schoolId: string;
  month: string;
  name: string;
  modalities: string;
  studentCount: number;
  received: number;
  forecast: number;
  canMark: boolean;
  paid: { at: string; by: string; amount: number } | null;
};

const eur = (n: number) => `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function CoachPayoutRow({ row }: { row: CoachPayoutRowView }) {
  const [open, setOpen] = useState(false);
  const [markState, markAction, marking] = useActionState<CoachPayoutResult | null, FormData>(markCoachPayoutPaid, null);
  const [undoState, undoAction, undoing] = useActionState<CoachPayoutResult | null, FormData>(undoCoachPayout, null);
  const error = markState?.error ?? undoState?.error;

  const hidden = (
    <>
      <input type="hidden" name="coachId" value={row.coachId} />
      <input type="hidden" name="schoolId" value={row.schoolId} />
      <input type="hidden" name="month" value={row.month} />
    </>
  );

  return (
    <li style={{ padding: "12px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <strong style={{ fontWeight: 600 }}>{row.name}</strong>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            {row.modalities} · {row.studentCount} {row.studentCount === 1 ? "aluno" : "alunos"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <strong style={{ fontSize: 17 }}>{eur(row.paid ? row.paid.amount : row.received)}</strong>
          {!row.paid && row.forecast > row.received && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>previsão {eur(row.forecast)}</div>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background: row.paid ? "color-mix(in srgb, var(--success, #34d399) 15%, transparent)" : "color-mix(in srgb, var(--warning, #fbbf24) 15%, transparent)",
            color: row.paid ? "var(--success, #34d399)" : "var(--warning, #fbbf24)",
          }}
        >
          {row.paid ? `Pago ${new Date(row.paid.at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })} · ${row.paid.by}` : "Por pagar"}
        </span>
      </div>

      {row.paid ? (
        <form action={undoAction}>
          {hidden}
          <button type="submit" className="btn btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }} disabled={undoing}>
            {undoing ? "A anular…" : "Anular pagamento"}
          </button>
        </form>
      ) : row.canMark ? (
        open ? (
          <form action={markAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            {hidden}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
              Comprovativo de transferência (opcional)
              <input type="file" name="proof" accept="application/pdf,image/png,image/jpeg" className="input" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)", flex: "1 1 180px" }}>
              Nota (opcional)
              <input name="notes" className="input" maxLength={300} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={marking}>
              {marking ? "A guardar…" : `Confirmar ${eur(row.received)} pagos`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: 13 }} onClick={() => setOpen(true)}>
            Marcar como pago
          </button>
        )
      ) : null}

      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 13 }}>
          {error}
        </p>
      )}
    </li>
  );
}
