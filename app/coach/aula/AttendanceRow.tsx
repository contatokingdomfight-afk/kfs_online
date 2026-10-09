"use client";

import { useState, useCallback, useActionState } from "react";
import { useRouter } from "next/navigation";
import { setAttendanceStatusFromForm, coachCheckInStudentFromForm, setCoachRpeFromForm } from "./actions";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModalDynamic";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

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
  rpe: number | null;
  rpeRecordedAt: string | null;
  rpeSource?: "STUDENT" | "COACH" | null;
  canEvaluate?: boolean;
  monthlyLimit?: { used: number; limit: number; remaining: number } | null;
  isCrossModality?: boolean;
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
  rpe,
  rpeRecordedAt,
  rpeSource = null,
  canEvaluate = true,
  monthlyLimit,
  isCrossModality = false,
}: Props) {
  const router = useRouter();
  const [statusState, statusAction] = useActionState(setAttendanceStatusFromForm, null as { error?: string } | null);
  const [checkInState, checkInAction] = useActionState(coachCheckInStudentFromForm, null as { error?: string } | null);
  const [rpeState, rpeAction] = useActionState(setCoachRpeFromForm, null as { error?: string; updated?: number } | null);
  // O coach pode dar/acertar o esforço de quem esteve presente, desde que não tenha sido o aluno a dá-lo.
  const coachCanSetRpe = status === "CONFIRMED" && Boolean(attendanceId) && rpeSource !== "STUDENT";
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);

  const label = studentName || studentEmail;
  const initial = (studentName?.trim()?.[0] || studentEmail?.trim()?.[0] || "?").toUpperCase();
  const effectiveStatus = status ?? "NONE";
  const statusClass =
    effectiveStatus === "CONFIRMED"
      ? "coach-attendance-status--confirmed"
      : effectiveStatus === "ABSENT"
        ? "coach-attendance-status--absent"
        : effectiveStatus === "PENDING"
          ? "coach-attendance-status--pending"
          : "coach-attendance-status--pending";
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

  const zoneClass =
    preLessonWellness?.zone === "GREEN"
      ? "coach-wellness-zone-pill--green"
      : preLessonWellness?.zone === "YELLOW"
        ? "coach-wellness-zone-pill--yellow"
        : preLessonWellness?.zone === "RED"
          ? "coach-wellness-zone-pill--red"
          : "";
  const zoneShort =
    preLessonWellness?.zone === "GREEN"
      ? "Pré: Verde"
      : preLessonWellness?.zone === "YELLOW"
        ? "Pré: Amarelo"
        : preLessonWellness?.zone === "RED"
          ? "Pré: Vermelho"
          : null;

  const handleEvaluationSuccess = useCallback(() => {
    setModalOpen(false);
    setShowSuccessConfirm(true);
    window.setTimeout(() => {
      router.refresh();
    }, 0);
  }, [router]);

  const formError = statusState?.error ?? checkInState?.error ?? rpeState?.error;

  return (
    <>
      <li className="coach-attendance-row">
        <div className="coach-attendance-avatar" aria-hidden>
          {initial}
        </div>
        <div className="coach-attendance-info">
          <div className="coach-attendance-head">
            <span className="coach-attendance-name">{label}</span>
            {evaluatedInThisLesson && (
              <span className="coach-attendance-tag coach-attendance-tag--evaluated" title="Já avaliado nesta aula">
                Avaliado
              </span>
            )}
            {isCrossModality && (
              <span
                className="coach-attendance-tag coach-attendance-tag--cross-modality"
                title="Check-in avulso: aluno de outra modalidade/plano"
              >
                Avulso
              </span>
            )}
            <span className={`coach-attendance-status ${statusClass}`}>{statusLabel}</span>
            {monthlyLimit && (
              <span
                className="coach-attendance-tag"
                title={`${monthlyLimit.used} de ${monthlyLimit.limit} aulas usadas este mês`}
                style={{
                  backgroundColor: monthlyLimit.remaining > 0 ? "var(--bg-secondary)" : "var(--danger)",
                  color: monthlyLimit.remaining > 0 ? "var(--text-secondary)" : "#fff",
                }}
              >
                {monthlyLimit.remaining > 0 ? `Restam ${monthlyLimit.remaining} este mês` : "Limite mensal atingido"}
              </span>
            )}
          </div>
          {studentName && <span className="coach-attendance-email">{studentEmail}</span>}
          {(zoneShort || rpe != null || coachCanSetRpe) && (
            <div className="coach-attendance-wellness" aria-label="Bem-estar e RPE">
              {zoneShort && (
                <span className={`coach-wellness-zone-pill ${zoneClass}`} title={preLessonWellness?.tooltip}>
                  {zoneShort}
                </span>
              )}
              <span className="coach-attendance-rpe">
                RPE:{" "}
                {rpe != null ? (
                  <>
                    <strong>{rpe}</strong>
                    <span className="coach-attendance-rpe-time"> ({rpeSource === "COACH" ? "coach" : "aluno"})</span>
                    {rpeRecordedAt && rpeSource !== "COACH" ? (
                      <span className="coach-attendance-rpe-time">
                        {" "}
                        (registado às{" "}
                        {new Date(rpeRecordedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })})
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </span>
              {coachCanSetRpe && attendanceId ? (
                <form action={rpeAction} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input type="hidden" name="lessonId" value={lessonId} readOnly />
                  <input type="hidden" name="occurrenceDate" value={occurrenceDate} readOnly />
                  <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
                  <select
                    name="rpe"
                    defaultValue={rpe ?? ""}
                    aria-label={`Esforço de ${label}`}
                    className="input"
                    style={{ width: 70, minHeight: 32, padding: "2px 6px", fontSize: 13 }}
                  >
                    <option value="" disabled>
                      1–10
                    </option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary" style={{ minHeight: 32, padding: "2px 10px", fontSize: 13 }}>
                    {rpe == null ? "Dar" : "Acertar"}
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </div>
        <div className="coach-attendance-actions">
          {canEvaluate ? (
            <button type="button" onClick={() => setModalOpen(true)} className="btn btn-secondary">
              Avaliar
            </button>
          ) : null}
          {effectiveStatus === "PENDING" && attendanceId ? (
            <form action={statusAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="CONFIRMED" className="btn btn-success">
                Marcar Presença Manual
              </button>
              <button type="submit" name="status" value="ABSENT" className="btn btn-danger">
                Marcar Ausente
              </button>
            </form>
          ) : null}
          {(effectiveStatus === "NONE" || effectiveStatus === "ABSENT") && (
            <form action={checkInAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="lessonId" value={lessonId} readOnly />
              <input type="hidden" name="occurrenceDate" value={occurrenceDate} readOnly />
              <input type="hidden" name="studentId" value={studentId} readOnly />
              <button type="submit" className="btn btn-success">
                Marcar presença
              </button>
            </form>
          )}
          {effectiveStatus === "CONFIRMED" && attendanceId ? (
            <form action={statusAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="ABSENT" className="btn btn-danger">
                Reverter para Ausente
              </button>
            </form>
          ) : null}
        </div>
        {formError && (
          <span style={{ width: "100%", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{formError}</span>
        )}
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
