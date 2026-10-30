"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { bookExamForStudent, setManualReadiness } from "./actions";

export type AptoState = "auto" | "manual" | "blocked" | "no";

export type AptoRow = {
  studentId: string;
  name: string;
  modalityCode: string;
  nextName: string;
  nextColors: string[];
  state: AptoState;
  /** Motivo da decisão manual, ou o que ainda falta (estado «no»). */
  detail: string | null;
  /** Texto já formatado da convocatória/marcação, se existir. */
  booking: string | null;
  schoolId: string | null;
  /** Lembrete para marcar o exame; null quando não dá (ver `whatsappHint`). */
  whatsappUrl: string | null;
  whatsappHint: string | null;
};

/** Exame com horários por acontecer, para o coach marcar um aluno. */
export type AptoExam = {
  id: string;
  schoolId: string | null;
  label: string;
  capacity: number;
  /** Vazio quando o exame não tem horários (fica convocado para a hora do exame). */
  slots: { iso: string; label: string; taken: number }[];
  selfBookable: boolean;
};

const pill = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 999,
  background: `color-mix(in srgb, ${bg} 16%, transparent)`,
  color: fg,
  whiteSpace: "nowrap",
});

const STATE_LABEL: Record<AptoState, { text: string; style: React.CSSProperties }> = {
  auto: { text: "✓ Apto · automático", style: pill("var(--success)", "var(--success)") },
  manual: { text: "✋ Apto · manual", style: pill("var(--success)", "var(--success)") },
  blocked: { text: "✕ Marcado «ainda não»", style: pill("var(--danger)", "var(--danger)") },
  no: { text: "Ainda não apto", style: pill("var(--text-secondary)", "var(--text-secondary)") },
};

const fieldLabel: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", margin: "var(--space-3) 0 6px" };

export function AptosList({ rows, exams }: { rows: AptoRow[]; exams: AptoExam[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<AptoRow | null>(null);
  const [bookTarget, setBookTarget] = useState<AptoRow | null>(null);
  const [eventId, setEventId] = useState("");
  const [slotIso, setSlotIso] = useState("");
  const [reason, setReason] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setTarget(null);
    setReason("");
    setValidUntil("");
    setError(null);
  };

  const confirmReady = () => {
    if (!target) return;
    setError(null);
    start(async () => {
      const r = await setManualReadiness({ studentId: target.studentId, modalityCode: target.modalityCode, status: "READY", reason, validUntil });
      if (r.error) return setError(r.error);
      close();
      router.refresh();
    });
  };

  const remove = (row: AptoRow) => {
    setBusyId(row.studentId);
    start(async () => {
      const r = await setManualReadiness({ studentId: row.studentId, modalityCode: row.modalityCode, status: null, reason: "", validUntil: "" });
      setBusyId(null);
      if (r.error) window.alert(r.error);
      else router.refresh();
    });
  };

  const bookExams = bookTarget ? exams.filter((e) => e.schoolId === bookTarget.schoolId) : [];
  const bookExam = bookExams.find((e) => e.id === eventId) ?? null;

  const openBooking = (row: AptoRow) => {
    setBookTarget(row);
    setEventId(exams.find((e) => e.schoolId === row.schoolId)?.id ?? "");
    setSlotIso("");
    setError(null);
  };

  const closeBooking = () => {
    setBookTarget(null);
    setError(null);
  };

  const confirmBooking = () => {
    if (!bookTarget || !bookExam) return;
    setError(null);
    start(async () => {
      const r = await bookExamForStudent({ studentId: bookTarget.studentId, eventId: bookExam.id, slotIso: slotIso || null });
      if (r.error) return setError(r.error);
      closeBooking();
      router.refresh();
    });
  };

  if (rows.length === 0) {
    return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Nenhum aluno neste filtro.</p>;
  }

  return (
    <>
      <ul className="card" style={{ listStyle: "none", margin: 0, padding: "0 var(--space-4)" }}>
        {rows.map((row, i) => (
          <li
            key={`${row.studentId}-${row.modalityCode}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) 0",
              borderTop: i > 0 ? "1px solid var(--border)" : 0,
            }}
          >
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <strong style={{ fontSize: "var(--text-sm)", display: "block", overflowWrap: "anywhere" }}>{row.name}</strong>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                <BeltSwatch colors={row.nextColors} width={28} height={8} /> {row.nextName}
              </span>
            </div>
            <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", minWidth: 0 }}>
              <span style={STATE_LABEL[row.state].style}>{STATE_LABEL[row.state].text}</span>
              {row.detail && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                  {row.state === "no" ? row.detail : `«${row.detail}»`}
                </span>
              )}
              {(row.state === "auto" || row.state === "manual") &&
                (row.booking ? (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>📅 {row.booking}</span>
                ) : (
                  <span style={pill("var(--warning)", "var(--warning)")}>Sem exame marcado</span>
                ))}
              {row.whatsappHint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>WhatsApp: {row.whatsappHint.toLowerCase()}</span>}
            </div>
            <div style={{ flex: "0 0 auto", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {row.whatsappUrl && (
                <a href={row.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  <MessageCircle size={15} aria-hidden />
                  WhatsApp
                </a>
              )}
              {(row.state === "auto" || row.state === "manual") && !row.booking && (
                <button type="button" className="btn btn-primary" onClick={() => openBooking(row)}>
                  Marcar exame
                </button>
              )}
              {row.state === "no" && (
                <button type="button" className="btn btn-primary" onClick={() => setTarget(row)}>
                  Tornar apto
                </button>
              )}
              {(row.state === "manual" || row.state === "blocked") && (
                <button type="button" className="btn" disabled={pending && busyId === row.studentId} onClick={() => remove(row)}>
                  {pending && busyId === row.studentId ? "A guardar…" : row.state === "manual" ? "Remover aptidão" : "Remover decisão"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {bookTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="marcar-exame-titulo"
          onClick={(e) => e.target === e.currentTarget && !pending && closeBooking()}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: "var(--space-4)" }}
        >
          <div className="card" style={{ width: "min(440px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 id="marcar-exame-titulo" style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
              Marcar exame
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              {bookTarget.name} → {bookTarget.nextName}
            </p>
            {bookExams.length === 0 ? (
              <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Não há exames agendados nesta modalidade. <Link href="/coach/graduacao/novo">Criar um novo exame</Link>
              </p>
            ) : (
              <>
                <label style={fieldLabel} htmlFor="marcar-exame">
                  Exame
                </label>
                <select
                  id="marcar-exame"
                  className="input"
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setSlotIso("");
                  }}
                >
                  {bookExams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
                {bookExam && bookExam.slots.length > 0 ? (
                  <>
                    <label style={fieldLabel} htmlFor="marcar-horario">
                      Horário
                    </label>
                    <select id="marcar-horario" className="input" value={slotIso} onChange={(e) => setSlotIso(e.target.value)}>
                      <option value="">Escolhe um horário</option>
                      {bookExam.slots.map((s) => (
                        <option key={s.iso} value={s.iso}>
                          {s.label} ({s.taken}/{bookExam.capacity})
                        </option>
                      ))}
                    </select>
                    <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Podes ultrapassar as vagas. O aluno é avisado na app e, para mudar, tem de falar contigo.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Este exame não tem horários: o aluno fica convocado para a hora do exame e é avisado na app.
                  </p>
                )}
              </>
            )}
            {error && (
              <p role="alert" style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
              <button type="button" className="btn" onClick={closeBooking} disabled={pending}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmBooking} disabled={pending || !bookExam || (bookExam.slots.length > 0 && !slotIso)}>
                {pending ? "A guardar…" : "Marcar exame"}
              </button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tornar-apto-titulo"
          onClick={(e) => e.target === e.currentTarget && !pending && close()}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: "var(--space-4)" }}
        >
          <div className="card" style={{ width: "min(440px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 id="tornar-apto-titulo" style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
              Tornar apto para exame
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              {target.name} → {target.nextName}
            </p>
            {target.detail && (
              <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Ainda não cumpre: {target.detail}. A tua decisão sobrepõe-se aos requisitos.
              </p>
            )}
            <label style={fieldLabel} htmlFor="apto-motivo">
              Motivo (o aluno vê)
            </label>
            <textarea
              id="apto-motivo"
              className="input"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex.: Evolução técnica acima do esperado; avaliado em aula."
              style={{ resize: "vertical" }}
            />
            <label style={fieldLabel} htmlFor="apto-validade">
              Válido até <span style={{ fontWeight: 400 }}>(opcional — depois volta a Automático)</span>
            </label>
            <input id="apto-validade" type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Ao confirmar, o aluno é avisado e passa a ver as datas de exame disponíveis para marcar a sua.
            </p>
            {error && (
              <p role="alert" style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
              <button type="button" className="btn" onClick={close} disabled={pending}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmReady} disabled={pending}>
                {pending ? "A guardar…" : "Tornar apto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
