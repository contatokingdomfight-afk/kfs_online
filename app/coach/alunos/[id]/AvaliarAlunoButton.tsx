"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModal";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

type Props = {
  studentId: string;
  profile: StudentProfileForModal;
  primaryModality: string | null;
  evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null>;
  /** Última avaliação por modalidade (scores) para pré-preencher o formulário */
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
};

const MODALITIES = [
  { value: "MUAY_THAI", label: MODALITY_LABELS.MUAY_THAI ?? "Muay Thai" },
  { value: "BOXING", label: MODALITY_LABELS.BOXING ?? "Boxe" },
  { value: "KICKBOXING", label: MODALITY_LABELS.KICKBOXING ?? "Kickboxing" },
];

export function AvaliarAlunoButton({ studentId, profile, primaryModality, evaluationConfigByModality, lastEvalScoresByModality }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const initialModality = primaryModality && evaluationConfigByModality[primaryModality] != null
    ? primaryModality
    : MODALITIES[0]?.value ?? "MUAY_THAI";

  const handleSuccess = () => {
    setModalOpen(false);
    setShowSuccess(true);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="btn btn-primary"
        style={{ textDecoration: "none", marginTop: 8 }}
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
          modalities={MODALITIES}
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
