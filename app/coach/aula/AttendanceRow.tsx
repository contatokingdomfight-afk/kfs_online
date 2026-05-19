"use client";

import { useState, useCallback } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { setAttendanceStatusFromForm } from "./actions";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModalDynamic";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

type WellnessZone = "GREEN" | "YELLOW" | "RED";

type Props = {
  attendanceId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  status: string;
  checkedInAt: string | null;
  lessonId: string;
  modality: string;
  evaluationConfig: ModalityEvaluationConfigPayload | null;
  evaluatedInThisLesson?: boolean;
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
  profile: StudentProfileForModal;
  /** Registo pré-treino desta ocorrência (check-in), se existir. */
  preLessonWellness: { zone: WellnessZone; tooltip: string } | null;
  rpe: number | null;
  rpeRecordedAt: string | null;
  /** Se false, não mostra avaliação (ex.: treinador assistente). */
  canEvaluate?: boolean;
};

export function AttendanceRow({
  attendanceId,
  studentId,
  studentName,
  studentEmail,
  status,
  checkedInAt,
  lessonId,
  modality,
  evaluationConfig,
  evaluatedInThisLesson = false,
  lastEvalScoresByModality,
  profile,
  preLessonWellness,
  rpe,
  rpeRecordedAt,
  canEvaluate = true,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(setAttendanceStatusFromForm, null as { error?: string } | null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);

  const label = studentName || studentEmail;
  const initial = (studentName?.trim()?.[0] || studentEmail?.trim()?.[0] || "?").toUpperCase();
  const statusClass =
    status === "CONFIRMED"
      ? "coach-attendance-status--confirmed"
      : status === "ABSENT"
        ? "coach-attendance-status--absent"
        : "coach-attendance-status--pending";
  const statusLabel =
    status === "CONFIRMED"
      ? checkedInAt
        ? `Presente (Check-in às ${new Date(checkedInAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })})`
        : "Presente (Manual)"
      : status === "PENDING"
        ? "Marcou 'Vou'"
        : "Falta";

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
            <span className={`coach-attendance-status ${statusClass}`}>{statusLabel}</span>
          </div>
          {studentName && <span className="coach-attendance-email">{studentEmail}</span>}
          {(zoneShort || rpe != null) && (
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
                    {rpeRecordedAt ? (
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
            </div>
          )}
        </div>
        <div className="coach-attendance-actions">
          {canEvaluate ? (
            <button type="button" onClick={() => setModalOpen(true)} className="btn btn-secondary">
              Ver perfil e avaliar
            </button>
          ) : null}
          {status === "PENDING" && (
            <form action={formAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="CONFIRMED" className="btn btn-success">
                Marcar Presença Manual
              </button>
              <button type="submit" name="status" value="ABSENT" className="btn btn-danger">
                Marcar Ausente
              </button>
            </form>
          )}
          {status === "CONFIRMED" && (
            <form action={formAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="ABSENT" className="btn btn-danger">
                Reverter para Ausente
              </button>
            </form>
          )}
        </div>
        {state?.error && (
          <span style={{ width: "100%", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{state.error}</span>
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
