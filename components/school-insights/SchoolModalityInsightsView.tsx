"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { SchoolModalityInsights } from "@/lib/school-modality-insights";
import { StrengthsWeaknesses } from "@/components/evaluation-results/StrengthsWeaknesses";
import { EvaluationSummary } from "@/components/evaluation-results/EvaluationSummary";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";

type ModalityOption = { code: string; label: string };

type Props = {
  insights: SchoolModalityInsights;
  modalities: ModalityOption[];
  selectedModality: string;
  /** Prefixo de URL sem query (ex. /admin/desempenho-modalidades). */
  basePath: string;
  /** Query extra preservada (ex. school=xxx). */
  extraQuery?: Record<string, string>;
  labels: {
    subtitle: string;
    athletes: string;
    evaluations: string;
    noData: string;
    pickModality: string;
    schoolLabel?: string;
    schoolName?: string;
  };
};

function buildHref(basePath: string, modality: string, extra?: Record<string, string>) {
  const q = new URLSearchParams({ ...extra, modality });
  return `${basePath}?${q.toString()}`;
}

export function SchoolModalityInsightsView({
  insights,
  modalities,
  selectedModality,
  basePath,
  extraQuery = {},
  labels,
}: Props) {
  const axes = useMemo(
    () => insights.dimensionScores.map((d) => ({ id: d.id, label: d.label })),
    [insights.dimensionScores]
  );

  const hasData = insights.athleteCount > 0 && insights.evaluationCount > 0;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div>
        <p className="m-0 text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">{labels.subtitle}</p>
        {labels.schoolName ? (
          <p className="mt-2 m-0 text-sm text-[var(--text-secondary)]">
            {labels.schoolLabel}: <strong className="text-[var(--text-primary)]">{labels.schoolName}</strong>
          </p>
        ) : null}
      </div>

      {modalities.length === 0 ? (
        <div className="card p-5 text-sm text-[var(--text-secondary)]">{labels.pickModality}</div>
      ) : (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modalidades">
          {modalities.map((m) => {
            const on = m.code === selectedModality;
            return (
              <Link
                key={m.code}
                href={buildHref(basePath, m.code, extraQuery)}
                role="tab"
                aria-selected={on}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  on
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
                ].join(" ")}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
        <span>
          {labels.athletes}: <strong className="text-[var(--text-primary)] tabular-nums">{insights.athleteCount}</strong>
        </span>
        <span>
          {labels.evaluations}:{" "}
          <strong className="text-[var(--text-primary)] tabular-nums">{insights.evaluationCount}</strong>
        </span>
      </div>

      {!hasData ? (
        <div className="card p-6 text-center text-sm text-[var(--text-secondary)]">{labels.noData}</div>
      ) : (
        <>
          <EvaluationSummary
            overallScore={insights.overallScore}
            maxScore={10}
            dimensionScores={insights.dimensionScores}
          />

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-6">
            <RadarStats scores={insights.scoresForRadar} axes={axes} maxScore={10} />
          </div>

          <StrengthsWeaknesses strengths={insights.strengths} weaknesses={insights.weaknesses} />
        </>
      )}
    </div>
  );
}
