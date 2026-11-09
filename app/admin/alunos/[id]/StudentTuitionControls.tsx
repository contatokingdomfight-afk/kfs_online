"use client";

import { useActionState, useState } from "react";
import { pauseExemptsMonth, PAUSE_RETURN_CUTOFF_DAY } from "@/lib/tuition-pause";
import {
  pauseTuitionAction,
  resumeTuitionAction,
  setPaymentDueDayAction,
  updatePauseExpectedEndAction,
  type TuitionActionResult,
} from "./tuition-actions";

export type PauseView = {
  id: string;
  active: boolean;
  startLabel: string;
  expectedEndDate: string | null;
  expectedLabel: string | null;
  reasonLabel: string;
  notes: string | null;
  attachmentUrl: string | null;
  attachmentFileName: string | null;
  resumeLabel: string;
};

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

const card: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-secondary)", padding: 14, display: "grid", gap: 12 };
const input: React.CSSProperties = { minHeight: 38, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 14, width: "100%" };
const label: React.CSSProperties = { display: "grid", gap: 4, fontSize: 12.5, color: "var(--text-secondary)" };
const hint: React.CSSProperties = { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 };
const btn: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" };
const btnOk: React.CSSProperties = { ...btn, background: "#16a34a", borderColor: "#16a34a", color: "#fff" };
const pauseBox: React.CSSProperties = { border: "1px solid rgba(96,165,250,.45)", background: "rgba(96,165,250,.07)", borderRadius: 10, padding: 12, display: "grid", gap: 8 };

function Feedback({ state }: { state: TuitionActionResult }) {
  if (!state) return null;
  if (state.error) return <p style={{ ...hint, color: "var(--danger)" }}>{state.error}</p>;
  if (state.success) return <p style={{ ...hint, color: "#22c55e" }}>{state.success}</p>;
  return null;
}

/** Explica, antes de gravar, que meses a pausa deixa de cobrar. */
function pausePreview(start: string, expected: string, dueDay: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const startMonth = start.slice(0, 7);
  const first = pauseExemptsMonth({ startDate: start, endDate: null }, startMonth, dueDay)
    ? `Começa até ao dia de pagamento (${dueDay}) → ${monthName(startMonth)} não é cobrado e a mensalidade em aberto é anulada.`
    : `Começa depois do dia de pagamento (${dueDay}) → ${monthName(startMonth)} fica cobrado; não cobra a partir do mês seguinte.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expected)) return `${first} Sem data de regresso: não cobra até retomares.`;
  const endMonth = expected.slice(0, 7);
  const back = pauseExemptsMonth({ startDate: start, endDate: expected }, endMonth, dueDay)
    ? `Regressa depois do dia ${PAUSE_RETURN_CUTOFF_DAY} → ${monthName(endMonth)} não é cobrado; volta a pagar no mês seguinte.`
    : `Regressa até ao dia ${PAUSE_RETURN_CUTOFF_DAY} → ${monthName(endMonth)} é cobrado por inteiro.`;
  return `${first} ${back}`;
}

export function StudentTuitionControls({
  studentId,
  dueDay,
  today,
  open,
  autoPayActive,
  history,
}: {
  studentId: string;
  dueDay: number;
  today: string;
  open: PauseView | null;
  autoPayActive: boolean;
  history: { id: string; label: string; reasonLabel: string }[];
}) {
  const [dueState, dueAction, duePending] = useActionState(setPaymentDueDayAction, null);
  const [pauseState, pauseAction, pausePending] = useActionState(pauseTuitionAction, null);
  const [resumeState, resumeAction, resumePending] = useActionState(resumeTuitionAction, null);
  const [editState, editAction, editPending] = useActionState(updatePauseExpectedEndAction, null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(today);
  const [expected, setExpected] = useState("");
  const preview = pausePreview(start, expected, dueDay);

  return (
    <div style={card}>
      <form action={dueAction} key={`due-${dueDay}`} style={{ display: "grid", gap: 6 }}>
        <input type="hidden" name="studentId" value={studentId} />
        <label style={label}>
          Dia de pagamento
          <span style={{ display: "flex", gap: 8 }}>
            <select name="paymentDueDay" defaultValue={dueDay} style={{ ...input, maxWidth: 110 }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button type="submit" style={btn} disabled={duePending}>
              {duePending ? "A gravar…" : "Gravar"}
            </button>
          </span>
        </label>
        <p style={hint}>
          A mensalidade é gerada no dia 1 e só fica em atraso depois do dia {dueDay}. Suspensão 15 dias depois.
          {autoPayActive ? " Com pagamento automático, a Revolut passa a cobrar neste dia." : ""}
        </p>
        <Feedback state={dueState} />
      </form>

      {open ? (
        <div style={pauseBox}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(96,165,250,.18)", color: "#60a5fa" }}>
                {open.active ? "Em pausa" : "Pausa agendada"}
              </span>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{open.reasonLabel}</div>
              <p style={hint}>
                Desde {open.startLabel}
                {open.expectedLabel ? ` · regresso previsto ${open.expectedLabel}` : ""} · {open.resumeLabel}
                {autoPayActive ? " · pagamento automático adiado" : ""}
              </p>
              {open.notes ? <p style={hint}>{open.notes}</p> : null}
              {open.attachmentUrl ? (
                <a href={open.attachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "#60a5fa" }}>
                  📎 {open.attachmentFileName ?? "Atestado"}
                </a>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={btn} onClick={() => setEditing((v) => !v)}>
                Editar
              </button>
              <form action={resumeAction}>
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" style={btnOk} disabled={resumePending}>
                  {resumePending ? "A retomar…" : "Retomar agora"}
                </button>
              </form>
            </div>
          </div>
          {editing ? (
            <form action={editAction} style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="pauseId" value={open.id} />
              <label style={{ ...label, flex: "1 1 180px" }}>
                Regresso previsto (vazio = sem data)
                <input type="date" name="expectedEndDate" defaultValue={open.expectedEndDate ?? ""} style={input} />
              </label>
              <button type="submit" style={btn} disabled={editPending}>
                Gravar
              </button>
            </form>
          ) : null}
          <Feedback state={editState} />
          <Feedback state={resumeState} />
        </div>
      ) : showForm ? (
        <form action={pauseAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="studentId" value={studentId} />
          <strong style={{ fontSize: 14 }}>Pausar mensalidades</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label style={label}>
              Início
              <input type="date" name="startDate" value={start} onChange={(e) => setStart(e.target.value)} required style={input} />
            </label>
            <label style={label}>
              Regresso previsto (opcional)
              <input type="date" name="expectedEndDate" value={expected} min={start} onChange={(e) => setExpected(e.target.value)} style={input} />
            </label>
            <label style={label}>
              Motivo
              <select name="reason" defaultValue="MEDICAL" style={input}>
                <option value="MEDICAL">Atestado médico</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label style={label}>
              Atestado (opcional)
              <input type="file" name="attachment" accept="application/pdf,image/*" style={{ ...input, paddingTop: 6 }} />
            </label>
          </div>
          <label style={label}>
            Notas (opcional)
            <input type="text" name="notes" maxLength={300} style={input} />
          </label>
          {preview ? <p style={hint}>{preview}</p> : null}
          <p style={hint}>O acesso à app mantém-se. A fidelização é adiada pelos meses não cobrados.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={btn} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" style={btnPrimary} disabled={pausePending}>
              {pausePending ? "A pausar…" : "Pausar"}
            </button>
          </div>
          <Feedback state={pauseState} />
        </form>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <p style={hint}>Afastado por atestado médico? Pausa a mensalidade até voltar a treinar.</p>
          <button type="button" style={btn} onClick={() => setShowForm(true)}>
            Pausar mensalidades
          </button>
        </div>
      )}
      {!open && pauseState?.success ? <Feedback state={pauseState} /> : null}
      {!open && resumeState?.success ? <Feedback state={resumeState} /> : null}

      {history.length > 0 ? (
        <p style={hint}>
          Histórico de pausas: {history.map((h) => `${h.label} (${h.reasonLabel})`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
