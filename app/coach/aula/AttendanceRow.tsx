"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { setAttendanceStatusFromForm } from "./actions";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModal";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

type Props = {
  attendanceId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  status: string;
  lessonId: string;
  modality: string;
  evaluationConfig: ModalityEvaluationConfigPayload | null;
  evaluatedInThisLesson?: boolean;
  profile: StudentProfileForModal;
};

export function AttendanceRow({
  attendanceId,
  studentId,
  studentName,
  studentEmail,
  status,
  lessonId,
  modality,
  evaluationConfig,
  evaluatedInThisLesson = false,
  profile,
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
  const statusLabel = status === "PENDING" ? "Pendente" : status === "CONFIRMED" ? "Confirmada" : "Falta";

  const handleEvaluationSuccess = () => {
    setModalOpen(false);
    setShowSuccessConfirm(true);
    router.refresh();
  };

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
        </div>
        <div className="coach-attendance-actions">
          <button type="button" onClick={() => setModalOpen(true)} className="btn btn-secondary">
            Ver perfil e avaliar
          </button>
          {status === "PENDING" && (
            <form action={formAction} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input type="hidden" name="attendanceId" value={attendanceId} readOnly />
              <button type="submit" name="status" value="CONFIRMED" className="btn btn-success">
                Confirmar
              </button>
              <button type="submit" name="status" value="ABSENT" className="btn btn-danger">
                Falta
              </button>
            </form>
          )}
        </div>
        {state?.error && (
          <span style={{ width: "100%", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{state.error}</span>
        )}
      </li>
      {modalOpen && (
        <CoachStudentProfileModal
          studentId={studentId}
          lessonId={lessonId}
          modality={modality}
          evaluationConfig={evaluationConfig}
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
