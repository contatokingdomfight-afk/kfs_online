"use client";

import { BELT_NAMES, getXpThresholdForBeltIndex } from "@/lib/belts";
import { BELT_ORDER, BELT_DISPLAY } from "@/components/belt-progression/belt-progression-data";

export function NiveisXPSection() {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6 shadow-sm"
      aria-labelledby="niveis-xp-heading"
    >
      <h2
        id="niveis-xp-heading"
        className="text-lg font-semibold text-[var(--text-primary)] mb-2"
      >
        Níveis e XP
      </h2>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
        O teu nível na plataforma é representado por uma <strong className="text-[var(--text-primary)]">cor</strong>. Existem{" "}
        <strong className="text-[var(--text-primary)]">{BELT_NAMES.length} níveis de cor</strong> (da Branca à Preta/Dourado) e, a partir daí,{" "}
        <strong className="text-[var(--text-primary)]">Dourado 1</strong>, <strong className="text-[var(--text-primary)]">Dourado 2</strong>, … sem limite. O progresso é feito através de{" "}
        <strong className="text-[var(--text-primary)]">XP (pontos de experiência)</strong>.
      </p>

      {/* Resumo visual: principais níveis */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Progressão de níveis (resumo)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {BELT_ORDER.map((beltId) => {
            const d = BELT_DISPLAY[beltId];
            return (
              <div
                key={beltId}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5"
              >
                <span className="text-base" aria-hidden>{d.emoji}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{d.label}</span>
              </div>
            );
          })}
          <span className="text-sm text-[var(--text-secondary)]">→ Dourado 1, 2, 3…</span>
        </div>
      </div>

      {/* Regra de ouro */}
      <div
        className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3 mb-5"
        role="note"
      >
        <p className="text-sm text-[var(--text-primary)] leading-relaxed m-0">
          <strong>Cada nível exige o dobro do XP do anterior.</strong> O primeiro salto (Branca → Branca/amarela) são <strong>1000 XP</strong>.
        </p>
      </div>

      {/* Ordem dos níveis (lista detalhada) */}
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 mt-6">
        Ordem dos níveis (detalhe)
      </h3>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
        <ul className="divide-y divide-[var(--border)] m-0 p-0 list-none">
          {BELT_NAMES.map((name, i) => {
            const xpMin = getXpThresholdForBeltIndex(i);
            const xpNext = getXpThresholdForBeltIndex(i + 1);
            const step = xpNext - xpMin;
            return (
              <li key={name} className="px-4 py-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold text-[var(--text-primary)] min-w-[8rem]">{name}</span>
                {i === 0 ? (
                  <span className="text-sm text-[var(--text-secondary)]">(início)</span>
                ) : (
                  <>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {xpMin.toLocaleString("pt-PT")} XP total
                    </span>
                    {step > 0 && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        · +{step.toLocaleString("pt-PT")} XP neste nível para subir
                      </span>
                    )}
                  </>
                )}
              </li>
            );
          })}
          <li className="px-4 py-3 border-t-2 border-[var(--border)]">
            <span className="font-semibold text-[var(--text-primary)]">Dourado 1, 2, 3, …</span>
            <span className="text-sm text-[var(--text-secondary)] ml-2">
              Progressão infinita (cada nível exige o dobro do XP do anterior).
            </span>
          </li>
        </ul>
      </div>

      {/* Como ganhar XP */}
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 mt-6">
        Como ganhar XP
      </h3>
      <ul className="space-y-2 text-sm text-[var(--text-primary)] list-disc pl-5 m-0">
        <li>
          Para subir da <strong>Branca</strong> para <strong>Branca/amarela</strong> são necessários <strong>1000 XP</strong>.
        </li>
        <li>
          Em cada nível seguinte precisas de <strong>mais XP do que no anterior</strong>: a progressão é em dobro (1000 → 2000 → 4000 → 8000 … XP por nível).
        </li>
        <li>
          Ganhas XP ao completar <strong>missões</strong> (ex.: “Subir Técnico para 7”, “Realizar avaliação física”). Cada missão dá uma recompensa fixa de XP.
        </li>
      </ul>
      <p className="text-sm text-[var(--text-secondary)] mt-3 mb-0 leading-relaxed">
        As missões são desbloqueadas com base nas tuas avaliações. No <strong>Perfil do atleta</strong> vês a barra de progresso para o próximo nível e as missões ativas.
      </p>
    </section>
  );
}
