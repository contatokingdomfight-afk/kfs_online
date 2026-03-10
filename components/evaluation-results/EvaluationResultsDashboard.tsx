"use client";

import { useState, useMemo } from "react";
import type { DimensionScore } from "@/lib/evaluation-results-data";
import type { CriterionScoreItem } from "@/lib/evaluation-results-data";
import {
  getStrengthsAndWeaknesses,
  groupByCategory,
} from "@/lib/evaluation-results-data";
import { EvaluationSummary } from "./EvaluationSummary";
import { StrengthsWeaknesses } from "./StrengthsWeaknesses";
import { EvaluationFilters } from "./EvaluationFilters";
import { SkillCategory } from "./SkillCategory";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
import type { RadarAxis } from "@/components/fighter/RadarStatsDynamic";

const MODALITY_LABELS: Record<string, string> = {
  MUAY_THAI: "Muay Thai",
  BOXING: "Boxing",
  KICKBOXING: "Kickboxing",
};

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
            <div className="space-y-3">
              {categoryNames.map((name, i) => (
                <SkillCategory
                  key={name}
                  categoryName={name}
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
