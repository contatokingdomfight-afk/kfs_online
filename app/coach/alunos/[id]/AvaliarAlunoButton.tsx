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
  /** Quando true, o botão ocupa metade de uma linha flex (ex.: ao lado de «Avaliação Física»). */
  stretchInRow?: boolean;
};

export function AvaliarAlunoButton({
  studentId,
  profile,
  primaryModality,
  modalities,
  evaluationConfigByModality,
  lastEvalScoresByModality,
  stretchInRow = false,
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

  const performanceButton = (
    <button
      type="button"
      onClick={() => setModalOpen(true)}
      className="btn btn-primary"
      style={{
        textDecoration: "none",
        marginTop: stretchInRow ? 0 : 8,
        width: stretchInRow ? "100%" : undefined,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
      disabled={modalities.length === 0}
      title={modalities.length === 0 ? "Configura critérios de avaliação para esta modalidade no Admin (Avaliação)." : undefined}
    >
      Avaliar performance
    </button>
  );

  return (
    <>
      {stretchInRow ? (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{performanceButton}</div>
      ) : (
        performanceButton
      )}
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
