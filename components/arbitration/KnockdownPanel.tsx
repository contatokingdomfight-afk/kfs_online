"use client";

import {
  KNOCKDOWN_OFFICIAL_DEDUCTION,
  OCCURRENCE_LABELS_PT,
  setOccurrenceField,
} from "@/lib/arbitration/occurrences";
import type { OccurrenceInput } from "@/lib/arbitration/types";

type Props = {
  value: OccurrenceInput;
  athleteBlueName: string;
  athleteRedName: string;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
};

export function KnockdownPanel({ value, athleteBlueName, athleteRedName, disabled, onChange }: Props) {
  const label = OCCURRENCE_LABELS_PT.knockdown;

  return (
    <div className="arb-card arb-knockdown-panel">
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>Knockdown</h3>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
        Marque o atleta que <strong>sofreu</strong> knockdown neste round. Desconta automaticamente{" "}
        {KNOCKDOWN_OFFICIAL_DEDUCTION} pontos no placar oficial (ex.: 9 → 6).
      </p>

      <div className="arb-desktop-only arb-knockdown-row">
        <div className="arb-criteria-label">{label}</div>
        <label className="arb-knockdown-toggle arb-knockdown-toggle-blue">
          <input
            type="checkbox"
            checked={value.blue.knockdown}
            disabled={disabled}
            onChange={(e) => onChange(setOccurrenceField(value, "blue", "knockdown", e.target.checked))}
          />
          <span>{athleteBlueName}</span>
        </label>
        <label className="arb-knockdown-toggle arb-knockdown-toggle-red">
          <input
            type="checkbox"
            checked={value.red.knockdown}
            disabled={disabled}
            onChange={(e) => onChange(setOccurrenceField(value, "red", "knockdown", e.target.checked))}
          />
          <span>{athleteRedName}</span>
        </label>
      </div>

      <div className="arb-mobile-only" style={{ display: "grid", gap: 8 }}>
        <label className="arb-knockdown-toggle arb-knockdown-toggle-blue">
          <input
            type="checkbox"
            checked={value.blue.knockdown}
            disabled={disabled}
            onChange={(e) => onChange(setOccurrenceField(value, "blue", "knockdown", e.target.checked))}
          />
          <span>
            <span className="arb-corner-blue">{athleteBlueName}</span> — sofreu knockdown
          </span>
        </label>
        <label className="arb-knockdown-toggle arb-knockdown-toggle-red">
          <input
            type="checkbox"
            checked={value.red.knockdown}
            disabled={disabled}
            onChange={(e) => onChange(setOccurrenceField(value, "red", "knockdown", e.target.checked))}
          />
          <span>
            <span className="arb-corner-red">{athleteRedName}</span> — sofreu knockdown
          </span>
        </label>
      </div>
    </div>
  );
}
