"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveEvaluationFromLesson } from "@/app/coach/aula/actions";
import { saveStandaloneEvaluation } from "@/app/coach/alunos/[id]/actions";
import { EVALUATION_LABELS_BY_MODALITY } from "@/lib/performance-utils";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import type { CategoryConfig, CriterionConfig } from "@/lib/evaluation-config";
import { getAllCriterionIds } from "@/lib/evaluation-config";

const SCORES_1_5 = [1, 2, 3, 4, 5];
const SCORES_1_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const AUTO_SAVE_DELAY_MS = 2000;

function SubmitEvaluationButton({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="btn btn-primary min-h-11 px-5 rounded-lg font-medium disabled:opacity-60" disabled={pending}>
        {pending ? "A guardar…" : "Guardar avaliação"}
      </button>
      <button type="button" onClick={onClose} className="btn min-h-11 px-5 rounded-lg" disabled={pending}>
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
  modalities?: { value: string; label: string }[];
  evaluationConfigByModality?: Record<string, ModalityEvaluationConfigPayload | null>;
  initialScoresByModality?: Record<string, Record<string, number>>;
};

type SectionStatus = "complete" | "partial" | "empty";

function getSectionStatus(cat: CategoryConfig, scores: Record<string, number>, touchedIds: Set<string>): SectionStatus {
  const ids = cat.criterios.map((c) => c.id);
  const touched = ids.filter((id) => touchedIds.has(id)).length;
  if (touched === 0) return "empty";
  if (touched === ids.length) return "complete";
  return "partial";
}

function getSectionAverage(cat: CategoryConfig, scores: Record<string, number>): number | null {
  if (cat.criterios.length === 0) return null;
  const sum = cat.criterios.reduce((s, c) => s + (scores[c.id] ?? 0), 0);
  return Math.round((sum / cat.criterios.length) * 10) / 10;
}

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

  const formRef = useRef<HTMLFormElement>(null);
  const categorySectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const criterionInputRefs = useRef<Record<string, HTMLInputElement | HTMLButtonElement | null>>({});

  const criterionIds = useMemo(
    () => (evaluationConfig ? getAllCriterionIds(evaluationConfig) : []),
    [evaluationConfig]
  );

  const flatCriterionList = useMemo(() => {
    if (!evaluationConfig) return [];
    const list: { id: string; categoryKey: string }[] = [];
    evaluationConfig.categorias.forEach((cat) => {
      cat.criterios.forEach((c) => list.push({ id: c.id, categoryKey: cat.nome }));
    });
    return list;
  }, [evaluationConfig]);

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    criterionIds.forEach((id) => { o[id] = 5; });
    return o;
  });

  const [touchedIds, setTouchedIds] = useState<Set<string>>(() => new Set());
  const [quickMode, setQuickMode] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedScoresRef = useRef<string>("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!criterionIds.length) return;
    const initial = initialScoresByModalityRef.current?.[selectedModality];
    const o: Record<string, number> = {};
    const touched = new Set<string>();
    criterionIds.forEach((id) => {
      const v = initial && typeof initial[id] === "number" ? initial[id] : 5;
      o[id] = v;
      if (initial && initial[id] != null) touched.add(id);
    });
    setScores(o);
    setTouchedIds(touched);
  }, [criterionIds.join(","), selectedModality]);

  useEffect(() => {
    if (state && (state as { success?: boolean }).success) {
      if (onSuccess) onSuccess();
      setAutoSaveStatus("saved");
      const t = setTimeout(() => setAutoSaveStatus("idle"), 3000);
      return () => clearTimeout(t);
    }
    if (state && (state as { error?: string }).error) setAutoSaveStatus("error");
  }, [state, onSuccess]);

  const triggerAutoSave = useCallback(() => {
    if (!formRef.current || !criterionIds.length) return;
    const payload = JSON.stringify(scores);
    if (payload === lastSavedScoresRef.current) return;
    setAutoSaveStatus("saving");
    lastSavedScoresRef.current = payload;
    formRef.current.requestSubmit();
  }, [scores, criterionIds.length]);

  useEffect(() => {
    if (!criterionIds.length || touchedIds.size === 0) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(triggerAutoSave, AUTO_SAVE_DELAY_MS);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [scores, touchedIds.size, triggerAutoSave, criterionIds.length]);

  const updateScore = useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
    setTouchedIds((prev) => new Set(prev).add(criterionId));

    const idx = flatCriterionList.findIndex((x) => x.id === criterionId);
    if (idx >= 0 && idx < flatCriterionList.length - 1) {
      const next = flatCriterionList[idx + 1];
      requestAnimationFrame(() => {
        const nextEl = criterionInputRefs.current[next.id];
        if (nextEl) {
          nextEl.focus();
          const sectionEl = categorySectionRefs.current[next.categoryKey];
          if (sectionEl) {
            sectionEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      });
    }
  }, [flatCriterionList]);

  const defaultLabels = { gas: "Condicionamento", technique: "Técnica", strength: "Força", theory: "Teoria" };
  const labels = EVALUATION_LABELS_BY_MODALITY[selectedModality] ?? defaultLabels;
  const useDynamicForm = Boolean(evaluationConfig?.categorias?.length && criterionIds.length > 0);

  const categoryAverages = useMemo(() => {
    if (!evaluationConfig) return new Map<string, number>();
    const m = new Map<string, number>();
    evaluationConfig.categorias.forEach((cat) => {
      const avg = getSectionAverage(cat, scores);
      if (avg != null) m.set(cat.nome, avg);
    });
    return m;
  }, [evaluationConfig, scores]);

  const focusSuggestions = useMemo(() => {
    if (!evaluationConfig || touchedIds.size < 3) return [];
    const withAvg = evaluationConfig.categorias
      .map((cat) => ({ name: cat.nome, avg: getSectionAverage(cat, scores) ?? 0 }))
      .filter((x) => x.avg > 0);
    withAvg.sort((a, b) => a.avg - b.avg);
    return withAvg.slice(0, 3).map((x) => x.name);
  }, [evaluationConfig, scores, touchedIds.size]);

  return (
    <div
      role="dialog"
      aria-modal={true}
      aria-labelledby="modal-title"
      className="coach-profile-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card coach-profile-modal-card bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-xl flex flex-col max-h-[90vh] w-full overflow-hidden"
        style={{ maxWidth: useDynamicForm ? "min(900px, 100%)" : "min(480px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .evaluation-category[open] .evaluation-category-chevron { transform: rotate(180deg); }
          .evaluation-category summary::-webkit-details-marker { display: none; }
        `}</style>

        <div className="flex justify-between items-start shrink-0 p-5 pb-0">
          <h2 id="modal-title" className="m-0 text-lg font-semibold text-[var(--text-primary)]">
            {isStandalone ? "Avaliar aluno" : "Perfil e avaliação"}
          </h2>
          <button type="button" onClick={onClose} className="btn w-10 h-10 p-0 flex items-center justify-center rounded-lg" aria-label="Fechar">
            ×
          </button>
        </div>

        <form ref={formRef} action={formAction} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {useDynamicForm && evaluationConfig && (
            <nav
              className="shrink-0 w-44 py-4 pl-4 pr-2 border-r border-[var(--border)] overflow-y-auto"
              aria-label="Navegação por categoria"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-2">
                Categorias
              </p>
              <ul className="space-y-1 list-none m-0 p-0">
                {evaluationConfig.categorias.map((cat) => {
                  const status = getSectionStatus(cat, scores, touchedIds);
                  const avg = categoryAverages.get(cat.nome);
                  const Icon = status === "complete" ? "✓" : status === "partial" ? "•" : "○";
                  return (
                    <li key={cat.nome}>
                      <button
                        type="button"
                        className="w-full text-left py-2 px-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        onClick={() => {
                          const el = categorySectionRefs.current[cat.nome];
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="text-[var(--text-primary)]" aria-hidden>{Icon}</span>
                        <span className="ml-1.5 text-[var(--text-primary)]">{cat.nome}</span>
                        {avg != null && <span className="block text-xs text-[var(--text-secondary)] mt-0.5">média {avg}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            <section className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Dados do aluno</h3>
              <div className="flex items-center gap-3 mb-2">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" width={56} height={56} className="rounded-full object-cover border-2 border-[var(--border)]" />
                ) : null}
                <div>
                  <p className="m-0 font-semibold text-[var(--text-primary)] text-base">
                    {profile.name || profile.email || "Aluno"}
                  </p>
                  {profile.name ? <p className="m-0.5 text-sm text-[var(--text-secondary)]">{profile.email}</p> : null}
                  {profile.phone ? <p className="mt-1 text-sm text-[var(--text-secondary)]">📞 {profile.phone}</p> : null}
                </div>
              </div>
              {(profile.weightKg != null || profile.heightCm != null) && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {profile.weightKg != null ? `${profile.weightKg} kg` : ""}
                  {profile.weightKg != null && profile.heightCm != null ? " · " : ""}
                  {profile.heightCm != null ? `${profile.heightCm} cm` : ""}
                </p>
              )}
              {profile.medicalNotes && (
                <p className="mt-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">Notas: {profile.medicalNotes}</p>
              )}
              {profile.emergencyContact && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Emergência: {profile.emergencyContact}</p>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                {isStandalone ? "Avaliar (escolhe a modalidade)" : `Avaliar nesta aula (${MODALITY_LABELS[selectedModality] ?? selectedModality})`}
              </h3>
                {!isStandalone && <input type="hidden" name="lessonId" value={lessonId!} />}
                <input type="hidden" name="studentId" value={studentId} />
                <input type="hidden" name="modality" value={selectedModality} />
                <input type="hidden" name="scoresJson" value={JSON.stringify(scores)} />
                {isStandalone && modalities.length > 0 && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-[var(--text-secondary)]">Modalidade</span>
                    <select
                      className="input min-h-11 rounded-lg"
                      value={selectedModality}
                      onChange={(e) => setSelectedModality(e.target.value)}
                    >
                      {modalities.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {useDynamicForm && evaluationConfig && (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quickMode}
                          onChange={(e) => setQuickMode(e.target.checked)}
                          className="rounded accent-[var(--primary)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">⚡ Modo avaliação rápida</span>
                      </label>
                      {autoSaveStatus === "saved" && (
                        <span className="text-xs text-[var(--success)] font-medium">Guardado automaticamente</span>
                      )}
                      {autoSaveStatus === "saving" && (
                        <span className="text-xs text-[var(--text-secondary)]">A guardar…</span>
                      )}
                    </div>

                    {focusSuggestions.length > 0 && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--primary)]/5 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          Sugestão de foco de treino
                        </p>
                        <ol className="list-decimal list-inside text-sm text-[var(--text-primary)] m-0 space-y-0.5">
                          {focusSuggestions.map((name, i) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {evaluationConfig.categorias.map((cat, index) => {
                        const status = getSectionStatus(cat, scores, touchedIds);
                        const avg = getSectionAverage(cat, scores);
                        const statusIcon = status === "complete" ? "✓" : status === "partial" ? "•" : "○";
                        return (
                          <div
                            key={cat.nome}
                            ref={(el) => { categorySectionRefs.current[cat.nome] = el; }}
                            className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden transition-shadow hover:shadow-md"
                          >
                            <details
                              className="evaluation-category"
                              open={index < 2 || status !== "complete"}
                              data-status={status}
                            >
                              <summary className="flex items-center justify-between gap-2 py-3 px-4 cursor-pointer list-none select-none font-semibold text-[var(--text-primary)] text-sm">
                                <span className="flex items-center gap-2">
                                  <span aria-hidden className="text-base">{statusIcon}</span>
                                  <span>{cat.nome}</span>
                                  <span className="text-[var(--text-secondary)] font-normal">
                                    {cat.criterios.length} itens
                                    {avg != null && ` — média: ${avg}`}
                                  </span>
                                </span>
                                <span className="evaluation-category-chevron opacity-70 transition-transform" aria-hidden>▼</span>
                              </summary>
                              <div className="px-4 pb-4 pt-1 flex flex-col gap-5">
                                {cat.criterios.map((c) => (
                                  <CriterionRow
                                    key={c.id}
                                    criterion={c}
                                    value={scores[c.id] ?? 5}
                                    quickMode={quickMode}
                                    isTouched={touchedIds.has(c.id)}
                                    onValueChange={(v) => updateScore(c.id, v)}
                                    inputRef={(el) => { criterionInputRefs.current[c.id] = el; }}
                                  />
                                ))}
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {!useDynamicForm && (
                  (["gas", "technique", "strength", "theory"] as const).map((key) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-sm text-[var(--text-secondary)]">{labels[key]}</span>
                      <select name={key} className="input min-h-11 rounded-lg" defaultValue="3" required>
                        {SCORES_1_5.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  ))
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-[var(--text-secondary)]">Nota (opcional)</span>
                  <textarea name="note" className="input rounded-lg min-h-[56px] resize-y" placeholder="Observações sobre esta avaliação..." rows={2} />
                </label>

                {state && (state as { error?: string }).error && (
                  <p className="m-0 text-sm text-[var(--danger)]">{(state as { error: string }).error}</p>
                )}
                {state && (state as { success?: boolean }).success && (
                  <p className="m-0 text-sm text-[var(--success)]">Avaliação guardada com sucesso.</p>
                )}
            </section>
          </div>
        </div>

        <div className="shrink-0 sticky bottom-0 border-t border-[var(--border)] bg-[var(--bg)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saved" && <span className="text-xs text-[var(--success)]">Guardado automaticamente</span>}
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <SubmitEvaluationButton onClose={onClose} />
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}

type CriterionRowProps = {
  criterion: CriterionConfig;
  value: number;
  quickMode: boolean;
  isTouched: boolean;
  onValueChange: (v: number) => void;
  inputRef: (el: HTMLInputElement | HTMLButtonElement | null) => void;
};

function CriterionRow({ criterion, value, quickMode, isTouched, onValueChange, inputRef }: CriterionRowProps) {
  const isUnrated = !isTouched;
  return (
    <div
      className={`rounded-lg p-3 transition-colors ${
        isUnrated ? "bg-amber-500/10 border border-amber-500/30" : "bg-[var(--bg)]/50 border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{criterion.label}</span>
        {isUnrated && (
          <span className="text-xs text-amber-600 font-medium">⚠ não avaliado</span>
        )}
      </div>
      {criterion.description && (
        <p className="text-xs text-[var(--text-secondary)] mb-2">{criterion.description}</p>
      )}
      {quickMode ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${criterion.label}, nota de 1 a 10`}>
          {SCORES_1_10.map((n) => (
            <button
              key={n}
              ref={n === 1 ? inputRef : undefined}
              type="button"
              onClick={() => onValueChange(n)}
              className={`min-w-[2.25rem] h-9 rounded-lg text-sm font-medium transition-all ${
                value === n
                  ? "bg-[var(--primary)] text-white ring-2 ring-[var(--primary)]"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--primary)]/50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef as (el: HTMLInputElement | null) => void}
            type="range"
            min={1}
            max={10}
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className="flex-1 h-3 rounded-full accent-[var(--primary)]"
            aria-label={`${criterion.label}, ${value} de 10`}
          />
          <span className="text-sm font-medium text-[var(--text-primary)] w-8 tabular-nums">{value}/10</span>
        </div>
      )}
    </div>
  );
}
