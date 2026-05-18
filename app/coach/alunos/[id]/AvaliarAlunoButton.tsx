"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModalDynamic";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

type Props = {
  studentId: string;
  profile: StudentProfileForModal;
  primaryModality: string | null;
  /** Modalidades com critérios configurados (vem de ModalityRef + configs). */
  modalities: { value: string; label: string }[];
  evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null>;
  /** Última avaliação por modalidade (scores) para pré-preencher o formulário */
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
};

export function AvaliarAlunoButton({
  studentId,
  profile,
  primaryModality,
  modalities,
  evaluationConfigByModality,
  lastEvalScoresByModality,
}: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const initialModality =
    primaryModality && evaluationConfigByModality[primaryModality] != null
      ? primaryModality
      : modalities[0]?.value ?? "";

  const handleSuccess = useCallback(() => {
    setModalOpen(false);
    setShowSuccess(true);
    window.setTimeout(() => {
      router.refresh();
    }, 0);
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="btn btn-primary"
        style={{ textDecoration: "none", marginTop: 8 }}
        disabled={modalities.length === 0}
        title={modalities.length === 0 ? "Configura critérios de avaliação para esta modalidade no Admin (Avaliação)." : undefined}
      >
        Avaliar aluno
      </button>
      {modalOpen && (
        <CoachStudentProfileModal
          studentId={studentId}
          lessonId={null}
          modality={initialModality}
          evaluationConfig={evaluationConfigByModality[initialModality] ?? null}
          profile={profile}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
          modalities={modalities}
          evaluationConfigByModality={evaluationConfigByModality}
          initialScoresByModality={lastEvalScoresByModality}
        />
      )}
      <SuccessConfirmModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Avaliação guardada"
        message="A avaliação foi registada com sucesso."
        closeLabel="Fechar"
      />
    </>
  );
}
