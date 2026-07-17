import type { ArbitrationCriterionDef } from "@/lib/arbitration/types";
import { OCCURRENCE_LABELS_PT } from "@/lib/arbitration/occurrences";
import { KNOCKDOWN_OFFICIAL_DEDUCTION } from "@/lib/arbitration/occurrences";

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
          <li key={c.id} style={{ marginBottom: compact ? 4 : 6 }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{index + 1}.</span> {c.label}
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
