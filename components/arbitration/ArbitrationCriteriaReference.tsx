"use client";

import { useState } from "react";
import type { ArbitrationCriterionDef, ArbitrationModality } from "@/lib/arbitration/types";
import { OCCURRENCE_LABELS_PT } from "@/lib/arbitration/occurrences";
import { KNOCKDOWN_OFFICIAL_DEDUCTION } from "@/lib/arbitration/occurrences";
import { BOXING_CRITERIA_SET, KICKBOXING_CRITERIA_SET, MUAY_THAI_CRITERIA_SET } from "@/lib/arbitration/criteria-sets";

export const ARBITRATION_SCORING_GUIDE = [
  "Cada critério é avaliado numa escala de 1 a 5 para o canto azul e para o canto vermelho.",
  "A soma dos critérios alimenta uma sugestão de placar 10-Point Must (10×10, 10×9, 10×8, etc.), editável pelo juiz.",
  `Knockdown sofrido desconta ${KNOCKDOWN_OFFICIAL_DEDUCTION} pontos no placar oficial do round.`,
  "Outras ocorrências (golpe ilegal, perda de ponto, etc.) podem descontar pontos adicionais no placar oficial.",
] as const;

type Props = {
  criteria: ArbitrationCriterionDef[];
  title?: string;
  compact?: boolean;
  showScoringGuide?: boolean;
};

export function ArbitrationCriteriaList({ criteria, title, compact }: Omit<Props, "showScoringGuide">) {
  return (
    <div>
      {title ? (
        <h3 style={{ margin: "0 0 10px", fontSize: compact ? 14 : 15, fontWeight: 700 }}>{title}</h3>
      ) : null}
      <ol
        style={{
          margin: 0,
          paddingLeft: compact ? 18 : 20,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.55,
          color: "var(--text-secondary)",
        }}
      >
        {criteria.map((c, index) => (
          <li key={c.id} style={{ marginBottom: compact ? 8 : 10 }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{index + 1}.</span> {c.label}
            {c.description ? (
              <div style={{ marginTop: 2, fontSize: compact ? 12 : 13, color: "var(--text-secondary)" }}>
                {c.description}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ArbitrationScoringGuide({ compact }: { compact?: boolean }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 10px", fontSize: compact ? 14 : 15, fontWeight: 700 }}>Como pontuar</h3>
      <ul
        style={{
          margin: "0 0 12px",
          paddingLeft: compact ? 18 : 20,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.55,
          color: "var(--text-secondary)",
        }}
      >
        {ARBITRATION_SCORING_GUIDE.map((line) => (
          <li key={line} style={{ marginBottom: 6 }}>
            {line}
          </li>
        ))}
      </ul>
      <p style={{ margin: "0 0 6px", fontSize: compact ? 12 : 13, fontWeight: 600, color: "var(--text-primary)" }}>
        Ocorrências registáveis
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: compact ? 18 : 20,
          fontSize: compact ? 12 : 13,
          lineHeight: 1.5,
          color: "var(--text-secondary)",
        }}
      >
        {Object.values(OCCURRENCE_LABELS_PT).map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}

export function ArbitrationCriteriaReference({
  criteria,
  title,
  compact = false,
  showScoringGuide = true,
}: Props) {
  return (
    <div style={{ display: "grid", gap: compact ? 14 : 18 }}>
      <ArbitrationCriteriaList criteria={criteria} title={title ?? "Critérios deste combate"} compact={compact} />
      {showScoringGuide ? <ArbitrationScoringGuide compact={compact} /> : null}
    </div>
  );
}

const MODALITY_GUIDE_TABS: { modality: ArbitrationModality; label: string }[] = [
  { modality: "MUAY_THAI", label: "Muay Thai" },
  { modality: "KICKBOXING", label: "Kickboxing" },
  { modality: "BOXING", label: "Boxe" },
];

const MODALITY_GUIDE_SETS: Record<ArbitrationModality, { name: string; criteria: ArbitrationCriterionDef[] }> = {
  MUAY_THAI: MUAY_THAI_CRITERIA_SET,
  KICKBOXING: KICKBOXING_CRITERIA_SET,
  BOXING: BOXING_CRITERIA_SET,
};

/**
 * Guia de pontuação por modalidade — explica a hierarquia de critérios de cada desporto
 * (ordem de prioridade na decisão). Usado na área logada (referência) e na ferramenta pública.
 */
export function ModalityScoringGuide({ initialModality = "MUAY_THAI" }: { initialModality?: ArbitrationModality }) {
  const initialTab = MODALITY_GUIDE_TABS.some((t) => t.modality === initialModality) ? initialModality : "MUAY_THAI";
  const [active, setActive] = useState<ArbitrationModality>(initialTab);
  const set = MODALITY_GUIDE_SETS[active];

  return (
    <div>
      <nav className="arb-gestao-tabs" aria-label="Modalidade">
        {MODALITY_GUIDE_TABS.map((tab) => (
          <button
            key={tab.modality}
            type="button"
            role="tab"
            aria-selected={active === tab.modality}
            className={active === tab.modality ? "arb-gestao-tab arb-gestao-tab-active" : "arb-gestao-tab"}
            onClick={() => setActive(tab.modality)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
        Critérios ordenados por prioridade na decisão — o 1.º pesa mais que o 2.º, e assim sucessivamente.
      </p>
      <ArbitrationCriteriaList criteria={set.criteria} title={set.name} />
    </div>
  );
}
