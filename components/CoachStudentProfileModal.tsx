"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveEvaluationFromLesson } from "@/app/coach/aula/actions";
import { saveStandaloneEvaluation } from "@/app/coach/alunos/[id]/actions";
import { EVALUATION_LABELS_BY_MODALITY } from "@/lib/performance-utils";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { getAllCriterionIds } from "@/lib/evaluation-config";

const SCORES_1_5 = [1, 2, 3, 4, 5];
const SCORES_1_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function SubmitEvaluationButton({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }} disabled={pending}>
        {pending ? "A guardar…" : "Guardar"}
      </button>
      <button type="button" onClick={onClose} className="btn" style={{ minHeight: 44 }} disabled={pending}>
        Fechar
      </button>
    </>
  );
}

export type StudentProfileForModal = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  weightKg: number | null;
  heightCm: number | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
};

type Props = {
  studentId: string;
  lessonId?: string | null;
  modality: string;
  evaluationConfig: ModalityEvaluationConfigPayload | null;
  profile: StudentProfileForModal;
  onClose: () => void;
  onSuccess?: () => void;
  /** Modo standalone (perfil do aluno): escolher modalidade e avaliar sem aula */
  modalities?: { value: string; label: string }[];
  evaluationConfigByModality?: Record<string, ModalityEvaluationConfigPayload | null>;
  /** Última avaliação por modalidade (scores) para pré-preencher o formulário */
  initialScoresByModality?: Record<string, Record<string, number>>;
};

export function CoachStudentProfileModal(props: Props) {
  const {
    studentId,
    lessonId,
    modality: initialModality,
    evaluationConfig: initialConfig,
    profile,
    onClose,
    onSuccess,
    modalities = [],
    evaluationConfigByModality = {},
    initialScoresByModality,
  } = props;

  const isStandalone = lessonId == null || lessonId === "";
  const [selectedModality, setSelectedModality] = useState(initialModality);
  const evaluationConfig = isStandalone
    ? (evaluationConfigByModality[selectedModality] ?? null)
    : initialConfig;
  const initialScoresByModalityRef = useRef(initialScoresByModality);
  initialScoresByModalityRef.current = initialScoresByModality;

  const [stateLesson, formActionLesson] = useFormState(saveEvaluationFromLesson, null);
  const [stateStandalone, formActionStandalone] = useFormState(saveStandaloneEvaluation, null);
  const state = isStandalone ? stateStandalone : stateLesson;
  const formAction = isStandalone ? formActionStandalone : formActionLesson;

  const criterionIds = useMemo(
    () => (evaluationConfig ? getAllCriterionIds(evaluationConfig) : []),
    [evaluationConfig]
  );
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    criterionIds.forEach((id) => { o[id] = 5; });
    return o;
  });
  useEffect(() => {
    if (!criterionIds.length) return;
    const initial = initialScoresByModalityRef.current?.[selectedModality];
    const o: Record<string, number> = {};
    criterionIds.forEach((id) => {
      o[id] = initial && typeof initial[id] === "number" ? initial[id] : 5;
    });
    setScores(o);
  }, [criterionIds.join(","), selectedModality]);

  useEffect(() => {
    if (state && (state as { success?: boolean }).success && onSuccess) onSuccess();
  }, [state, onSuccess]);

  const defaultLabels = { gas: "Condicionamento", technique: "Técnica", strength: "Força", theory: "Teoria" };
  const labels = EVALUATION_LABELS_BY_MODALITY[selectedModality] ?? defaultLabels;
  const useDynamicForm = Boolean(evaluationConfig?.categorias?.length && criterionIds.length > 0);

  return (
    <div
      role="dialog"
      aria-modal={true}
      aria-labelledby="modal-title"
      className="coach-profile-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card coach-profile-modal-card"
        style={{
          maxWidth: "min(480px, 100%)",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "clamp(20px, 5vw, 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {isStandalone ? "Avaliar aluno" : "Perfil e avaliação"}
          </h2>
          <button type="button" onClick={onClose} className="btn" style={{ minWidth: 40, padding: "8px 12px", fontSize: 18 }} aria-label="Fechar">
            ×
          </button>
        </div>

        <section style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            Dados do aluno
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
            ) : null}
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)", fontSize: 16 }}>
                {profile.name || profile.email || "Aluno"}
              </p>
              {profile.name ? <p style={{ margin: "2px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{profile.email}</p> : null}
              {profile.phone ? <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>📞 {profile.phone}</p> : null}
            </div>
          </div>
          {(profile.weightKg != null || profile.heightCm != null) ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              {profile.weightKg != null ? `${profile.weightKg} kg` : ""}
              {profile.weightKg != null && profile.heightCm != null ? " · " : ""}
              {profile.heightCm != null ? `${profile.heightCm} cm` : ""}
            </p>
          ) : null}
          {profile.medicalNotes ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
              Notas: {profile.medicalNotes}
            </p>
          ) : null}
          {profile.emergencyContact ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              Emergência: {profile.emergencyContact}
            </p>
          ) : null}
        </section>

        <style>{`
          .evaluation-category[open] .evaluation-category-chevron { transform: rotate(180deg); }
          .evaluation-category summary::-webkit-details-marker { display: none; }
        `}</style>
        <section>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            {isStandalone ? "Avaliar (escolhe a modalidade)" : `Avaliar nesta aula (${MODALITY_LABELS[selectedModality] ?? selectedModality})`}
          </h3>
          <form
            action={formAction}
            style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}
          >
            {!isStandalone && <input type="hidden" name="lessonId" value={lessonId!} />}
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="modality" value={selectedModality} />
            {isStandalone && modalities.length > 0 && (
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>Modalidade</span>
                <select
                  className="input"
                  value={selectedModality}
                  onChange={(e) => setSelectedModality(e.target.value)}
                  style={{ minHeight: 44 }}
                >
                  {modalities.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
            )}
            {useDynamicForm ? (
              <>
                <input type="hidden" name="scoresJson" value={JSON.stringify(scores)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evaluationConfig!.categorias.map((cat, index) => (
                    <details
                      key={cat.nome}
                      className="evaluation-category"
                      open={index < 2}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        backgroundColor: "var(--bg-secondary)",
                      }}
                    >
                      <summary
                        style={{
                          padding: "12px 14px",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          listStyle: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span>{cat.nome}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                          {cat.criterios.length} itens
                        </span>
                        <span className="evaluation-category-chevron" style={{ opacity: 0.7, transition: "transform 0.2s" }} aria-hidden>▼</span>
                      </summary>
                      <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {cat.criterios.map((c) => (
                          <label key={c.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                              {c.label} — {scores[c.id] ?? 5}/10
                            </span>
                            {c.description ? (
                              <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.9 }}>{c.description}</span>
                            ) : null}
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={scores[c.id] ?? 5}
                              onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                              style={{ width: "100%", accentColor: "var(--primary)" }}
                            />
                          </label>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </>
            ) : (
              (["gas", "technique", "strength", "theory"] as const).map(function(key) {
                return (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{labels[key]}</span>
                    <select name={key} className="input" defaultValue="3" required style={{ minHeight: 44 }}>
                      {SCORES_1_5.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
                    </select>
                  </label>
                );
              })
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>Nota (opcional)</span>
              <textarea name="note" className="input" placeholder="Observações sobre esta avaliação..." rows={2} style={{ resize: "vertical", minHeight: 56 }} />
            </label>
            {state && (state as { error?: string }).error ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{(state as { error: string }).error}</p>
            ) : null}
            {state && (state as { success?: boolean }).success ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--success, green)" }}>Avaliação guardada com sucesso.</p>
            ) : null}
            <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <SubmitEvaluationButton onClose={onClose} />
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
