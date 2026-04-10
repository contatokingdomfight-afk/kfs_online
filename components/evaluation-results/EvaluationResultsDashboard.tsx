"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { DimensionScore } from "@/lib/evaluation-results-data";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";
import {
  getStrengthsAndWeaknesses,
  groupByCategory,
  mainCategoryFromCategoryName,
  subLabelFromCategoryName,
} from "@/lib/evaluation-results-data";
import { EvaluationSummary } from "./EvaluationSummary";
import { StrengthsWeaknesses } from "./StrengthsWeaknesses";
import { SkillCategory } from "./SkillCategory";
import { CriteriaMainCategoryChips } from "./CriteriaMainCategoryChips";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
import type { RadarAxis } from "@/components/fighter/RadarStatsDynamic";

/** Filtro principal pré-selecionado ao abrir (valor comparado com `mainCategoryOptions`, PT, case-insensitive). */
const INITIAL_MAIN_CATEGORY = "técnico";

type Props = {
  dimensionScores: DimensionScore[];
  criterionScores: CriterionScoreItem[];
  overallScore: number;
  maxScore?: number;
  axes: RadarAxis[];
  scoresForRadar: Record<string, number>;
  modalityLabels?: Record<string, string>;
  /** Médias por dimensão (tecnico, tatico, …) por modalidade — alinha radar e resumo com o filtro. */
  scoresByModality?: Record<string, Record<string, number>>;
};

export function EvaluationResultsDashboard({
  dimensionScores,
  criterionScores,
  overallScore,
  maxScore = 10,
  axes,
  scoresForRadar,
  modalityLabels = {},
  scoresByModality,
}: Props) {
  const [selectedModality, setSelectedModality] = useState<string | null>(null);
  /** null = mostrar todas as subcategorias; valor = filtrar por prefixo principal (derivado dos dados). */
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  /** Evita repetir o default após o aluno escolher outro chip na mesma modalidade. */
  const defaultMainCategoryAppliedForModalityKey = useRef<string | null>(null);

  const filteredCriteria = useMemo(() => {
    if (!selectedModality) return criterionScores;
    return criterionScores.filter((c) => c.modality === selectedModality);
  }, [criterionScores, selectedModality]);

  const { strengths, weaknesses } = useMemo(
    () => getStrengthsAndWeaknesses(filteredCriteria, 5),
    [filteredCriteria]
  );

  const byCategory = useMemo(() => groupByCategory(filteredCriteria), [filteredCriteria]);
  const categoryNames = useMemo(() => Array.from(byCategory.keys()).sort(), [byCategory]);

  const mainCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const name of categoryNames) {
      const m = mainCategoryFromCategoryName(name);
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
  }, [categoryNames]);

  const filteredCategoryNames = useMemo(() => {
    if (selectedMainCategory == null) return categoryNames;
    return categoryNames.filter(
      (n) => mainCategoryFromCategoryName(n) === selectedMainCategory
    );
  }, [categoryNames, selectedMainCategory]);

  useEffect(() => {
    setSelectedMainCategory((prev) => {
      if (prev == null) return null;
      const valid = new Set(mainCategoryOptions);
      return valid.has(prev) ? prev : null;
    });
  }, [mainCategoryOptions]);

  const modalityKey = selectedModality ?? "__all__";

  useEffect(() => {
    if (defaultMainCategoryAppliedForModalityKey.current === modalityKey) return;
    if (mainCategoryOptions.length === 0) return;

    const defaultLabel = mainCategoryOptions.find(
      (m) => m.trim().toLowerCase() === INITIAL_MAIN_CATEGORY
    );
    if (defaultLabel) {
      setSelectedMainCategory(defaultLabel);
    }
    defaultMainCategoryAppliedForModalityKey.current = modalityKey;
  }, [mainCategoryOptions, modalityKey]);

  const handleSelectMainCategory = (main: string | null) => {
    setSelectedMainCategory(main);
    defaultMainCategoryAppliedForModalityKey.current = modalityKey;
  };

  const modalitySelectOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const c of criterionScores) {
      if (c.modality) codes.add(c.modality);
    }
    if (scoresByModality) {
      for (const k of Object.keys(scoresByModality)) {
        if (k) codes.add(k);
      }
    }
    const sorted = [...codes].sort((a, b) =>
      (modalityLabels[a] ?? a).localeCompare(modalityLabels[b] ?? b, "pt")
    );
    return [
      { value: "" as const, label: "Todas as modalidades" },
      ...sorted.map((code) => ({
        value: code,
        label: modalityLabels[code] ?? code,
      })),
    ];
  }, [criterionScores, scoresByModality, modalityLabels]);

  const showModalityFilter = modalitySelectOptions.length > 1;

  const activeRadarScores = useMemo(() => {
    if (!selectedModality) return scoresForRadar;
    const per = scoresByModality?.[selectedModality];
    if (per && Object.keys(per).length > 0) return per;
    const empty: Record<string, number> = {};
    for (const a of axes) empty[a.id] = 0;
    return empty;
  }, [selectedModality, scoresByModality, scoresForRadar, axes]);

  const activeDimensionScores = useMemo((): DimensionScore[] => {
    return axes.map((a) => ({
      id: a.id,
      label: a.label,
      score: activeRadarScores[a.id] ?? 0,
      maxScore,
    }));
  }, [axes, activeRadarScores, maxScore]);

  const activeOverallScore = useMemo(() => {
    if (activeDimensionScores.length === 0) return 0;
    return (
      activeDimensionScores.reduce((s, d) => s + d.score, 0) / activeDimensionScores.length
    );
  }, [activeDimensionScores]);

  return (
    <div className="space-y-6">
      {showModalityFilter && (
        <div className="pb-1">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Modalidade
          </p>
          <div className="-mx-1">
            <div
              className="flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] px-1"
              role="tablist"
              aria-label="Filtrar desempenho e critérios por modalidade"
            >
              {modalitySelectOptions.map((opt) => {
                const isAll = opt.value === "";
                const active = isAll
                  ? selectedModality === null
                  : selectedModality === opt.value;
                const displayLabel = isAll ? "Todas" : opt.label;
                return (
                  <button
                    key={isAll ? "all" : opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={isAll ? "Todas as modalidades" : opt.label}
                    onClick={() => setSelectedModality(isAll ? null : opt.value)}
                    className={`snap-start shrink-0 max-w-[min(85vw,280px)] truncate rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 border ${
                      active
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)]/80 hover:border-[var(--primary)]/50 hover:bg-[var(--border)]/20"
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <EvaluationSummary
        dimensionScores={activeDimensionScores}
        overallScore={activeOverallScore}
        maxScore={maxScore}
      />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Perfil de competências
        </h2>
        <RadarStats
          scores={activeRadarScores}
          axes={axes}
          maxScore={maxScore}
        />
      </section>

      <StrengthsWeaknesses strengths={strengths} weaknesses={weaknesses} />

      {criterionScores.length > 0 && (
        <>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
              Critérios por categoria
            </h2>
            {mainCategoryOptions.length > 1 && (
              <CriteriaMainCategoryChips
                options={mainCategoryOptions}
                selected={selectedMainCategory}
                onSelect={handleSelectMainCategory}
              />
            )}
            <div
              key={selectedMainCategory ?? "all"}
              className="space-y-3"
            >
              {filteredCategoryNames.map((name, i) => (
                <SkillCategory
                  key={name}
                  categoryName={name}
                  headingLabel={
                    selectedMainCategory == null
                      ? undefined
                      : subLabelFromCategoryName(name)
                  }
                  items={byCategory.get(name) ?? []}
                  defaultOpen={i === 0}
                  showTrend={true}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
