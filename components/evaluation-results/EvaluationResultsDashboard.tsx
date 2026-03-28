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
import { EvaluationFilters } from "./EvaluationFilters";
import { SkillCategory } from "./SkillCategory";
import { CriteriaMainCategoryChips } from "./CriteriaMainCategoryChips";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
import type { RadarAxis } from "@/components/fighter/RadarStatsDynamic";

const MODALITY_LABELS: Record<string, string> = {
  MUAY_THAI: "Muay Thai",
  BOXING: "Boxing",
  KICKBOXING: "Kickboxing",
};

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
};

export function EvaluationResultsDashboard({
  dimensionScores,
  criterionScores,
  overallScore,
  maxScore = 10,
  axes,
  scoresForRadar,
  modalityLabels = {},
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

  const modalities = useMemo(() => {
    const mods = new Set(criterionScores.map((c) => c.modality));
    const list: { value: string | null; label: string }[] = [
      { value: null, label: "Todas" },
    ];
    ["MUAY_THAI", "BOXING", "KICKBOXING"].forEach((m) => {
      if (mods.has(m)) {
        list.push({
          value: m,
          label: modalityLabels[m] ?? MODALITY_LABELS[m] ?? m,
        });
      }
    });
    return list;
  }, [criterionScores, modalityLabels]);

  return (
    <div className="space-y-6">
      <EvaluationSummary
        dimensionScores={dimensionScores}
        overallScore={overallScore}
        maxScore={maxScore}
      />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Perfil de competências
        </h2>
        <RadarStats
          scores={scoresForRadar}
          axes={axes}
          maxScore={maxScore}
        />
      </section>

      <StrengthsWeaknesses strengths={strengths} weaknesses={weaknesses} />

      {criterionScores.length > 0 && (
        <>
          <EvaluationFilters
            selectedModality={selectedModality}
            onSelect={setSelectedModality}
            modalities={modalities}
          />

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
