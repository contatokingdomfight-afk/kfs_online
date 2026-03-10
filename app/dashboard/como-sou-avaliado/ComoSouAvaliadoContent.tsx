"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import type { DimensionDetail, DetailGroup, DetailItem } from "@/lib/performance-detail-structure";

const DIMENSION_ICONS: Record<string, string> = {
  tecnico: "🥊",
  tatico: "🎯",
  fisico: "💪",
  mental: "🧠",
  teorico: "📚",
};

const DIMENSION_INTROS: Record<string, string> = {
  tecnico:
    "Avaliação da execução técnica: postura, deslocamento, qualidade dos golpes (socos, chutes, cotoveladas, joelhadas, etc.), defesas e combinações. O treinador observa a correção dos gestos e a aplicação dos fundamentos.",
  tatico:
    "Avaliação da leitura de combate, timing, distância, estratégia e adaptação durante o treino ou luta. Inclui plano de jogo, uso de fintas e a capacidade de decidir bem sob pressão.",
  fisico:
    "Avaliação das capacidades físicas: força, explosão, velocidade, resistência (fôlego e muscular), mobilidade, equilíbrio e resistência ao impacto. Estes critérios ajudam a perceber o teu perfil físico e onde podes evoluir.",
  mental:
    "Avaliação do foco, resiliência, confiança, controlo sob pressão, tomada de decisão e disciplina. O aspecto mental é fundamental para o rendimento no treino e em competição.",
  teorico:
    "Avaliação do conhecimento das regras, conceitos técnicos e táticos, e da capacidade de relacionar a teoria com a prática e de compreender os feedbacks do treinador.",
};

type Props = {
  detailOrder: string[];
  detailByDimension: Record<string, DimensionDetail>;
};

export function ComoSouAvaliadoContent({ detailOrder, detailByDimension }: Props) {
  const [openDimId, setOpenDimId] = useState<string | null>(detailOrder[0] ?? null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (openDimId) {
      const el = sectionRefs.current[openDimId];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openDimId]);

  const totalGroups = detailOrder.reduce(
    (acc, dimKey) => acc + (detailByDimension[dimKey]?.groups?.length ?? 0),
    0
  );
  const totalCriteria = detailOrder.reduce(
    (acc, dimKey) =>
      acc +
      (detailByDimension[dimKey]?.groups ?? []).reduce(
        (s, g) => s + (g.items?.length ?? 0),
        0
      ),
    0
  );

  return (
    <div className="comoSouAvaliado">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/performance"
          className="text-sm font-medium text-[var(--primary)] no-underline hover:underline"
        >
          ← Perfil do atleta
        </Link>
      </div>

      <h1 className="mb-2 text-[clamp(22px,5vw,26px)] font-bold text-[var(--text-primary)]">
        Como sou avaliado
      </h1>
      <p className="mb-4 text-[clamp(14px,3.5vw,16px)] leading-relaxed text-[var(--text-secondary)]">
        O teu treinador avalia-te em várias dimensões, numa escala de 1 a 10. Aqui encontras a lista
        completa de critérios e o que cada um significa.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-sm font-medium text-[var(--text-primary)]"
          aria-label="Escala de avaliação"
        >
          Escala <strong className="ml-1">1 a 10</strong>
        </span>
        <span className="text-sm text-[var(--text-secondary)]">
          {detailOrder.length} dimensões · {totalGroups} categorias · {totalCriteria} critérios
        </span>
      </div>

      <nav
        className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4"
        aria-label="Índice das dimensões"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Índice
        </p>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {detailOrder.map((dimKey) => {
            const detail = detailByDimension[dimKey];
            if (!detail?.groups?.length) return null;
            const icon = DIMENSION_ICONS[dimKey] ?? "•";
            const isOpen = openDimId === dimKey;
            return (
              <li key={dimKey}>
                <button
                  type="button"
                  onClick={() => setOpenDimId(isOpen ? null : dimKey)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-sm font-medium transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary ${
                    isOpen ? "border-primary bg-primary/10 text-text-primary" : "border-border bg-transparent text-text-primary"
                  }`}
                >
                  <span aria-hidden>{icon}</span>
                  <span>{detail.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3">
        {detailOrder.map((dimKey) => {
          const detail = detailByDimension[dimKey];
          if (!detail?.groups?.length) return null;
          const intro = DIMENSION_INTROS[dimKey];
          const icon = DIMENSION_ICONS[dimKey] ?? "•";
          const isOpen = openDimId === dimKey;

          return (
            <article
              key={dimKey}
              ref={(el) => { sectionRefs.current[dimKey] = el; }}
              id={`dimensao-${dimKey}`}
              className="rounded-xl border border-[var(--border)] overflow-hidden transition-colors"
              style={{
                backgroundColor: isOpen ? "var(--bg-elevated)" : "var(--bg-secondary)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenDimId(isOpen ? null : dimKey)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg)]/50 transition-colors border-none bg-transparent cursor-pointer"
                aria-expanded={isOpen}
                aria-controls={`conteudo-${dimKey}`}
                id={`btn-${dimKey}`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-lg"
                  aria-hidden
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[clamp(17px,4.2vw,19px)] font-semibold text-[var(--text-primary)]">
                    {detail.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                    {detail.groups.length} categorias ·{" "}
                    {detail.groups.reduce((s, g) => s + (g.items?.length ?? 0), 0)} critérios
                  </p>
                </div>
                <span
                  className="shrink-0 text-[var(--text-secondary)] transition-transform duration-200"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
              <div
                id={`conteudo-${dimKey}`}
                role="region"
                aria-labelledby={`btn-${dimKey}`}
                style={{ display: isOpen ? "block" : "none" }}
                className="border-t border-[var(--border)]"
              >
                <div className="p-4 pt-3">
                  {intro && (
                    <p className="mb-4 text-[clamp(13px,3.2vw,15px)] leading-relaxed text-[var(--text-secondary)]">
                      {intro}
                    </p>
                  )}
                  <div className="flex flex-col gap-5">
                    {detail.groups.map((group: DetailGroup, gi: number) => (
                      <div key={gi}>
                        <h3 className="mb-2 text-[clamp(15px,3.8vw,17px)] font-semibold text-[var(--text-primary)]">
                          {group.title}
                        </h3>
                        {group.note && (
                          <p className="mb-2 text-sm italic text-[var(--text-secondary)]">
                            {group.note}
                          </p>
                        )}
                        <ul className="m-0 list-disc pl-5 space-y-1.5">
                          {(group.items ?? []).map((item: string | DetailItem, ii: number) => {
                            const label = typeof item === "string" ? item : (item as DetailItem).label;
                            const note = typeof item === "string" ? null : (item as DetailItem).note;
                            return (
                              <li
                                key={ii}
                                className="text-[clamp(13px,3.2vw,15px)] text-[var(--text-primary)]"
                              >
                                <strong>{label}</strong>
                                {note && (
                                  <span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">
                                    {note}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-[var(--text-secondary)]">
        Para veres as tuas notas e a evolução, acede ao{" "}
        <Link
          href="/dashboard/performance"
          className="font-medium text-[var(--primary)] underline hover:no-underline"
        >
          Perfil do atleta
        </Link>
        .
      </p>
    </div>
  );
}
