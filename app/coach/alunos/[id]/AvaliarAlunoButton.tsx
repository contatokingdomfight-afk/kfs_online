"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoachStudentProfileModal, type StudentProfileForModal } from "@/components/CoachStudentProfileModalDynamic";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { resolveEvaluationInitialModality } from "@/lib/coach-student-evaluation-modalities";

type Props = {
  studentId: string;
  profile: StudentProfileForModal;
  primaryModality: string | null;
  /** Modalidades com critérios configuradas e permitidas pelo plano do aluno. */
  modalities: { value: string; label: string }[];
  evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null>;
  /** Última avaliação por modalidade (scores) para pré-preencher o formulário */
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
  /** Quando true, o botão ocupa metade de uma linha flex (ex.: ao lado de «Avaliação Física»). */
  stretchInRow?: boolean;
  /** Após guardar com sucesso (ex.: perfil de performance do atleta). */
  successRedirectHref?: string;
};

export function AvaliarAlunoButton({
  studentId,
  profile,
  primaryModality,
  modalities,
  evaluationConfigByModality,
  lastEvalScoresByModality,
  stretchInRow = false,
  successRedirectHref,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

  // Deep-link do assistente do admin: /admin/alunos/[id]?avaliar=1 abre já o modal.
  useEffect(() => {
    if (searchParams.get("avaliar") === "1") {
      setModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("avaliar");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialModality = resolveEvaluationInitialModality(
    primaryModality,
    modalities,
    evaluationConfigByModality
  );

  const afterSaveHref = successRedirectHref ?? `/coach/alunos/${studentId}/performance`;

  const handleSuccess = useCallback(() => {
    setModalOpen(false);
    router.push(afterSaveHref);
    router.refresh();
  }, [router, afterSaveHref]);

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
    </>
  );
}
