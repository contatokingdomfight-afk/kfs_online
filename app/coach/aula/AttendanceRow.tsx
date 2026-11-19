"use client";

import { ZONE_COLORS, zoneLabel, type TrainingLoadZone } from "@/lib/training-load";
import { useState, useCallback, useActionState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendanceStatusFromForm, coachCheckInStudentFromForm, setCoachRpeFromForm } from "./actions";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModalDynamic";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { RpeSlider } from "@/components/training-load/RpeSlider";
import { formatRpe } from "@/lib/rpe-labels";

type WellnessZone = "GREEN" | "YELLOW" | "RED";

type Props = {
  attendanceId: string | null;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  status: string | null;
  checkedInAt: string | null;
  lessonId: string;
  occurrenceDate: string;
  modality: string;
  evaluationConfig: ModalityEvaluationConfigPayload | null;
  evaluatedInThisLesson?: boolean;
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
  profile: StudentProfileForModal;
  preLessonWellness: { zone: WellnessZone; tooltip: string } | null;
  trainingLoad?: { zone: TrainingLoadZone; ratio: number | null; trained7d: number } | null;
  rpe: number | null;
  rpeRecordedAt: string | null;
  rpeSource?: "STUDENT" | "COACH" | null;
  /** Nota do professor guardada à parte (compara com a do aluno). */
  coachRpe?: number | null;
  canEvaluate?: boolean;
  monthlyLimit?: { used: number; limit: number; remaining: number } | null;
  isCrossModality?: boolean;
  /** Seguro e/ou matrícula em atraso — aviso para o coach lembrar o aluno. */
  feesDue?: string | null;
  tuitionLate?: boolean;
};

export function AttendanceRow({
  attendanceId,
  studentId,
  studentName,
  studentEmail,
  status,
  checkedInAt,
  lessonId,
  occurrenceDate,
  modality,
  evaluationConfig,
  evaluatedInThisLesson = false,
  lastEvalScoresByModality,
  profile,
  preLessonWellness,
  trainingLoad = null,
  rpe,
  rpeRecordedAt,
  rpeSource = null,
  coachRpe = null,
  canEvaluate = true,
  monthlyLimit,
  isCrossModality = false,
  feesDue = null,
  tuitionLate = false,
}: Props) {
  const router = useRouter();
  const [statusState, statusAction] = useActionState(setAttendanceStatusFromForm, null as { error?: string } | null);
  const [checkInState, checkInAction] = useActionState(coachCheckInStudentFromForm, null as { error?: string } | null);
  const [rpeError, setRpeError] = useState<string | null>(null);
  // O coach pode dar/acertar o esforço de quem esteve presente, desde que não tenha sido o aluno a dá-lo.
  // O professor pode dar a sua nota mesmo depois de o aluno responder: fica guardada à parte (a do aluno é a que conta).
  const coachCanSetRpe = status === "CONFIRMED" && Boolean(attendanceId);
  const coachRpeValue = coachRpe ?? (rpeSource === "COACH" ? rpe : null);
  const [modalOpen, setModalOpen] = useState(false);
  // Nota por aluno: toca no quadrado → slider; ao largar grava sozinho, com «Desfazer» uns segundos.
  const [rpeOpen, setRpeOpen] = useState(false);
  const [draftRpe, setDraftRpe] = useState<number | null>(coachRpeValue);
  const [savedTick, setSavedTick] = useState(false);
  const [rpePending, startRpe] = useTransition();
  const beforeEdit = useRef<number | null>(coachRpeValue);
  const closeTimer = useRef<number | null>(null);

  const saveCoachRpe = (value: number | null) => {
    if (!attendanceId) return;
    const fd = new FormData();
    fd.set("lessonId", lessonId);
    fd.set("occurrenceDate", occurrenceDate);
    fd.append("attendanceId", attendanceId);
    if (value == null) fd.set("clear", "1");
    else fd.set("rpe", String(value));
    startRpe(async () => {
      const res = await setCoachRpeFromForm(null, fd);
      setRpeError(res?.error ?? null);
    });
  };
  const commitRpe = (v: number) => {
    saveCoachRpe(v);
    setSavedTick(true);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setRpeOpen(false);
      setSavedTick(false);
    }, 2500);
  };
  const undoRpe = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setDraftRpe(beforeEdit.current);
    saveCoachRpe(beforeEdit.current);
    setRpeOpen(false);
    setSavedTick(false);
  };
  const openRpe = () => {
    if (rpeOpen) {
      setRpeOpen(false);
      return;
    }
    beforeEdit.current = coachRpeValue;
    setDraftRpe(coachRpeValue);
    setSavedTick(false);
    setRpeOpen(true);
  };
  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);

  const label = studentName || studentEmail;
  const initial = (studentName?.trim()?.[0] || studentEmail?.trim()?.[0] || "?").toUpperCase();
  // Selo de carga só quando há base: «Sem base ainda» repetido em todos só ocupava espaço (o resumo no topo conta-os).
  const showLoad = Boolean(trainingLoad && trainingLoad.zone !== "insufficient");
  const effectiveStatus = status ?? "NONE";
  const statusLabel =
    effectiveStatus === "CONFIRMED"
      ? checkedInAt
        ? `Presente (Check-in às ${new Date(checkedInAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })})`
        : "Presente (Manual)"
      : effectiveStatus === "PENDING"
        ? "Marcou 'Vou'"
        : effectiveStatus === "ABSENT"
          ? "Falta"
          : "Sem pré-confirmação";

  const handleEvaluationSuccess = useCallback(() => {
    setModalOpen(false);
    setShowSuccessConfirm(true);
    window.setTimeout(() => {
      router.refresh();
    }, 0);
  }, [router]);

  const formError = statusState?.error ?? checkInState?.error ?? rpeError;

  // Cartão v2 (DOCS/mockup-presencas-cartao-v2.html): estado curto ao lado do nome, uma fila de
  // etiquetas iguais (carga, pré, RPE, avisos), sem email, botões arrumados em grelha.
  const stateKey = effectiveStatus === "CONFIRMED" ? "here" : effectiveStatus === "PENDING" ? "going" : effectiveStatus === "ABSENT" ? "absent" : "none";
  const shortStatus =
    effectiveStatus === "CONFIRMED" ? "Presente" : effectiveStatus === "PENDING" ? "Vou" : effectiveStatus === "ABSENT" ? "Faltou" : "Sem resposta";
  const checkInTime = checkedInAt ? new Date(checkedInAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : null;
  const preColor =
    preLessonWellness?.zone === "GREEN" ? "#4ade80" : preLessonWellness?.zone === "YELLOW" ? "#facc15" : preLessonWellness?.zone === "RED" ? "#f87171" : undefined;
  const preText =
    preLessonWellness?.zone === "GREEN" ? "Pré: verde" : preLessonWellness?.zone === "YELLOW" ? "Pré: amarelo" : preLessonWellness?.zone === "RED" ? "Pré: vermelho" : null;

  return (
    <>
      <li className={`coach-att-card coach-att-card--${stateKey}`}>
        <div className="coach-att-head">
          <div className="coach-attendance-avatar" aria-hidden>
            {initial}
          </div>
          <div className="coach-att-name" title={studentEmail}>
            {label}
          </div>
          <span className={`coach-att-state coach-att-state--${stateKey}`} title={statusLabel}>
            {shortStatus}
            {effectiveStatus === "CONFIRMED" && checkInTime ? ` · ${checkInTime}` : ""}
          </span>
        </div>

        {(showLoad || preText || rpe != null || tuitionLate || feesDue || monthlyLimit || evaluatedInThisLesson || isCrossModality) && (
          <div className="coach-att-meta" aria-label="Carga, bem-estar, RPE e avisos">
            {showLoad && trainingLoad && (
              <span
                className="coach-att-chip"
                style={{ color: ZONE_COLORS[trainingLoad.zone] }}
                title={`Carga de treino (rácio agudo/crónico). ${trainingLoad.trained7d} treino(s) nos últimos 7 dias.`}
              >
                <span className="coach-load-dot" style={{ background: ZONE_COLORS[trainingLoad.zone] }} aria-hidden />
                {zoneLabel(trainingLoad.zone, true)}
                {trainingLoad.ratio != null && ` ${trainingLoad.ratio.toFixed(1).replace(".", ",")}`}
              </span>
            )}
            {preText && (
              <span className="coach-att-chip" style={{ color: preColor }} title={preLessonWellness?.tooltip}>
                {preText}
              </span>
            )}
            {rpe != null && (
              <span className="coach-att-chip" title={rpeSource === "COACH" ? "Nota de esforço dada pelo professor" : "Nota de esforço do aluno"}>
                Cansaço <strong style={{ color: "var(--text-primary)" }}>{formatRpe(rpe)}</strong>
                {rpeSource === "COACH" ? " (coach)" : ""}
                {rpeSource === "STUDENT" && coachRpe != null && coachRpe !== rpe ? ` · tu: ${formatRpe(coachRpe)}` : ""}
              </span>
            )}
            {tuitionLate && (
              <span className="coach-att-chip coach-att-chip--late" title="Mensalidade em atraso. Podes marcar a presença; lembra o aluno de regularizar na secretaria.">
                💶 Mensalidade em atraso
              </span>
            )}
            {feesDue && (
              <span className="coach-att-chip coach-att-chip--warn" title="Lembra o aluno de regularizar na secretaria. Não bloqueia o check-in.">
                🛡️ {feesDue}
              </span>
            )}
            {monthlyLimit && (
              <span
                className={`coach-att-chip${monthlyLimit.remaining > 0 ? "" : " coach-att-chip--danger"}`}
                title={`${monthlyLimit.used} de ${monthlyLimit.limit} aulas usadas este mês`}
              >
                {monthlyLimit.remaining > 0 ? `Restam ${monthlyLimit.remaining} este mês` : "Limite mensal atingido"}
              </span>
            )}
            {evaluatedInThisLesson && (
              <span className="coach-att-chip" style={{ color: "#4ade80" }} title="Já avaliado nesta aula">
                ✓ Avaliado
              </span>
            )}
            {isCrossModality && (
              <span className="coach-att-chip" title="Check-in avulso: aluno de outra modalidade/plano">
                Avulso
              </span>
            )}
          </div>
        )}

        <div className="coach-att-actions">
          {canEvaluate ? (
            <button type="button" onClick={() => setModalOpen(true)} className="btn btn-secondary coach-att-btn coach-att-btn--eval">
              Avaliar
            </button>
          ) : null}
          {effectiveStatus === "PENDING" && attendanceId ? (
            <form action={statusAction} className="coach-att-pair">
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="CONFIRMED" className="btn btn-success coach-att-btn">
                Presente
              </button>
              <button type="submit" name="status" value="ABSENT" className="btn coach-att-btn coach-att-btn--absent">
                Faltou
              </button>
            </form>
          ) : null}
          {(effectiveStatus === "NONE" || effectiveStatus === "ABSENT") && (
            <form action={checkInAction} className="coach-att-pair coach-att-pair--single">
              <input type="hidden" name="lessonId" value={lessonId} readOnly />
              <input type="hidden" name="occurrenceDate" value={occurrenceDate} readOnly />
              <input type="hidden" name="studentId" value={studentId} readOnly />
              <button type="submit" className="btn btn-success coach-att-btn">
                Marcar presença
              </button>
            </form>
          )}
          {effectiveStatus === "CONFIRMED" && attendanceId ? (
            <div className="coach-att-pair">
              {coachCanSetRpe ? (
                <button
                  type="button"
                  className="btn btn-secondary coach-att-btn"
                  aria-expanded={rpeOpen}
                  aria-label={`Nota de cansaço de ${label}`}
                  onClick={openRpe}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1, fontWeight: 900 }}
                >
                  <span style={{ fontSize: 16 }}>{coachRpeValue != null ? formatRpe(coachRpeValue) : "–"}</span>
                  <small style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>
                    {coachRpeValue != null ? "a tua nota" : "dar nota"}
                  </small>
                </button>
              ) : (
                <span />
              )}
              <form action={statusAction}>
                <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
                <button type="submit" name="status" value="ABSENT" className="btn coach-att-btn coach-att-btn--absent" style={{ width: "100%" }} title="Reverter para ausente">
                  Desfazer
                </button>
              </form>
            </div>
          ) : null}
        </div>
        {rpeOpen && coachCanSetRpe ? (
          <div style={{ display: "grid", gap: 6, paddingTop: 8 }}>
            <RpeSlider
              value={draftRpe}
              onChange={setDraftRpe}
              onCommit={commitRpe}
              ariaLabel={`Cansaço de ${label}`}
              emptyText="Larga para guardar"
              disabled={rpePending && !savedTick}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, minHeight: 16 }}>
              <span style={{ color: "var(--success)", visibility: savedTick ? "visible" : "hidden" }}>{rpePending ? "A guardar…" : "✓ Guardado"}</span>
              {savedTick ? (
                <button type="button" onClick={undoRpe} style={{ background: "none", border: 0, padding: 0, color: "var(--text-secondary)", textDecoration: "underline", font: "inherit", cursor: "pointer" }}>
                  Desfazer
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {formError && <span className="coach-att-error">{formError}</span>}
      </li>
      {modalOpen && canEvaluate && (
        <CoachStudentProfileModal
          studentId={studentId}
          lessonId={lessonId}
          modality={modality}
          evaluationConfig={evaluationConfig}
          initialScoresByModality={lastEvalScoresByModality}
          profile={profile}
          onClose={() => setModalOpen(false)}
          onSuccess={handleEvaluationSuccess}
        />
      )}
      <SuccessConfirmModal
        open={showSuccessConfirm}
        onClose={() => setShowSuccessConfirm(false)}
        title="Avaliação guardada"
        message="A avaliação foi registada com sucesso."
        closeLabel="Fechar"
      />
    </>
  );
}
