"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { DimensionDetail, DetailGroup, DetailItem } from "@/lib/performance-detail-structure";

const DIMENSION_INTROS: Record<string, string> = {
  tecnico:
    "Avaliação da execução técnica: postura, deslocamento, qualidade dos golpes (socos, chutes, cotoveladas, joelhadas, etc.), defesas e combinações.",
  tatico:
    "Leitura de combate, timing, distância, estratégia e adaptação durante o treino ou luta.",
  fisico:
    "Capacidades físicas: força, explosão, velocidade, resistência, mobilidade, equilíbrio e resistência ao impacto.",
  mental:
    "Foco, resiliência, confiança, controlo sob pressão, tomada de decisão e disciplina.",
  teorico:
    "Conhecimento das regras, conceitos técnicos e táticos, e capacidade de relacionar teoria com prática.",
};

function getStatusColor(avg: number): "green" | "yellow" | "red" | "neutral" {
  if (avg <= 0) return "neutral";
  if (avg >= 7) return "green";
  if (avg >= 4) return "yellow";
  return "red";
}

function Sparkline({ values, max = 10 }: { values: number[]; max?: number }) {
  if (values.length < 2) return null;
  const w = 48;
  const h = 20;
  const pad = 2;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ opacity: 0.6 }}
      />
    </svg>
  );
}

type Props = {
  detailOrder: string[];
  detailByDimension: Record<string, DimensionDetail>;
  dimensionAverages?: Record<string, number>;
  dimensionHistory?: Record<string, number[]>;
};

export function ComoSouAvaliadoContent({
  detailOrder,
  detailByDimension,
  dimensionAverages = {},
  dimensionHistory = {},
}: Props) {
  const [filterDim, setFilterDim] = useState<string | null>(null);
  const [openDim, setOpenDim] = useState<string | null>(detailOrder[0] ?? null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const hasScores = Object.keys(dimensionAverages).length > 0;

  const filteredOrder = useMemo(
    () => (filterDim ? [filterDim] : detailOrder),
    [detailOrder, filterDim]
  );

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={hasScores ? "/dashboard/performance" : "/dashboard"}
            className="text-sm font-medium text-primary no-underline hover:underline"
          >
            ← {hasScores ? "Perfil do atleta" : "Voltar"}
          </Link>
          <h1 className="mt-1 text-[clamp(22px,5vw,26px)] font-bold text-text-primary">
            Como sou avaliado
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Cada critério abaixo recebe uma nota de 1 a 10. O teu perfil geral é a média de todas as classificações.
          </p>
        </div>
        <span className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-sm font-medium text-text-primary">
          Escala <strong>1–10</strong>
        </span>
      </div>

      {/* Resumo no topo: cards por dimensão */}
      <section
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3"
        aria-label="Resumo por dimensão"
      >
        {detailOrder.map((dimKey) => {
          const detail = detailByDimension[dimKey];
          if (!detail?.groups?.length) return null;
          const avg = dimensionAverages[dimKey] ?? 0;
          const history = dimensionHistory[dimKey] ?? [];
          const status = getStatusColor(avg);
          const isFiltered = filterDim === dimKey;

          return (
            <button
              key={dimKey}
              type="button"
              onClick={() => setFilterDim(isFiltered ? null : dimKey)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-left transition-all hover:opacity-90 ${
                isFiltered ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-bg-secondary"
              }`}
            >
              <span className="text-xs font-semibold text-text-primary truncate w-full text-center">
                {detail.title}
              </span>
              {hasScores && (
                <>
                  <span
                    className={`text-sm font-bold ${
                      status === "green"
                        ? "text-green-600 dark:text-green-400"
                        : status === "yellow"
                          ? "text-amber-600 dark:text-amber-400"
                          : status === "red"
                            ? "text-red-600 dark:text-red-400"
                            : "text-text-secondary"
                    }`}
                  >
                    {avg > 0 ? avg.toFixed(1) : "–"}
                  </span>
                  <Sparkline values={history} />
                </>
              )}
            </button>
          );
        })}
      </section>

      {/* Accordions: Dimensão → Categoria → Critérios */}
      <div className="space-y-2">
        {filteredOrder.map((dimKey) => {
          const detail = detailByDimension[dimKey];
          if (!detail?.groups?.length) return null;
          const intro = DIMENSION_INTROS[dimKey];
          const avg = dimensionAverages[dimKey] ?? 0;
          const status = getStatusColor(avg);
          const isOpen = openDim === dimKey;

          return (
            <article
              key={dimKey}
              className="rounded-xl border border-border overflow-hidden bg-bg-secondary"
            >
              <button
                type="button"
                onClick={() => setOpenDim(isOpen ? null : dimKey)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg/50 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-text-primary">{detail.title}</h2>
                  <p className="text-xs text-text-secondary">
                    {detail.groups.reduce(
                      (s, g) =>
                        s + (g.subGroups?.length ?? (g.items?.length ? 1 : 0)),
                      0
                    )}{" "}
                    categorias ·{" "}
                    {detail.groups.reduce(
                      (s, g) =>
                        s +
                        (g.subGroups?.reduce((a, sg) => a + (sg.items?.length ?? 0), 0) ??
                          g.items?.length ??
                          0),
                      0
                    )}{" "}
                    critérios
                  </p>
                </div>
                {hasScores && avg > 0 && (
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      status === "green"
                        ? "text-green-600 dark:text-green-400"
                        : status === "yellow"
                          ? "text-amber-600 dark:text-amber-400"
                          : status === "red"
                            ? "text-red-600 dark:text-red-400"
                            : "text-text-secondary"
                    }`}
                  >
                    {avg.toFixed(1)}
                  </span>
                )}
                <span
                  className="shrink-0 text-text-secondary transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border p-4 pt-3 space-y-4">
                  {intro && (
                    <p className="text-sm text-text-secondary leading-relaxed">{intro}</p>
                  )}
                  {detail.groups.map((group: DetailGroup, gi: number) => {
                    const categories = group.subGroups ?? (group.items?.length ? [group] : []);
                    const modalityTitle = group.subGroups ? group.title : null;

                    return (
                      <div key={gi} className="space-y-2">
                        {modalityTitle && (
                          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                            {modalityTitle}
                          </h3>
                        )}
                        {categories.map((cat: DetailGroup, ci: number) => {
                          const catKey = `${dimKey}-${gi}-${ci}`;
                          const isCatOpen = openCategories.has(catKey);
                          const items = cat.items ?? [];

                          return (
                            <div
                              key={ci}
                              className="rounded-lg border border-border bg-bg overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleCategory(catKey)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-bg-secondary/50 text-sm font-semibold text-text-primary"
                                aria-expanded={isCatOpen}
                              >
                                <span>{cat.title}</span>
                                <span className="text-text-secondary">
                                  {items.length} critérios
                                </span>
                                <span
                                  className="shrink-0 text-text-secondary transition-transform"
                                  style={{ transform: isCatOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                                >
                                  ▾
                                </span>
                              </button>
                              {isCatOpen && (
                                <div className="border-t border-border px-3 py-2 space-y-1.5">
                                  {cat.note && (
                                    <p className="text-xs italic text-text-secondary mb-2">
                                      {cat.note}
                                    </p>
                                  )}
                                  {items.map((item: string | DetailItem, ii: number) => {
                                    const label = typeof item === "string" ? item : (item as DetailItem).label;
                                    const note = typeof item === "string" ? null : (item as DetailItem).note;
                                    return (
                                      <div
                                        key={ii}
                                        className="group flex items-start gap-2 text-sm"
                                        title={note ?? undefined}
                                      >
                                        <span className="text-primary/80 mt-0.5">•</span>
                                        <div className="min-w-0 flex-1">
                                          <span className="font-medium text-text-primary">
                                            {label}
                                          </span>
                                          {note && (
                                            <span className="block text-xs text-text-secondary mt-0.5">
                                              {note}
                                            </span>
                                          )}
                                        </div>
                                        {note && (
                                          <span
                                            className="shrink-0 w-4 h-4 rounded-full border border-border text-[10px] flex items-center justify-center text-text-secondary cursor-help"
                                            title={note}
                                            aria-label={`Mais informações: ${note}`}
                                          >
                                            ?
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-sm text-text-secondary">
        {hasScores ? (
          <>
            Para veres o teu radar completo e evolução, acede ao{" "}
            <Link href="/dashboard/performance" className="font-medium text-primary underline hover:no-underline">
              Perfil do atleta
            </Link>
            .
          </>
        ) : (
          <>
            Quando o teu treinador preencher avaliações, aqui verás as tuas médias e evolução por
            dimensão.
          </>
        )}
      </p>
    </div>
  );
}
