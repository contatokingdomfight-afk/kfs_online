"use client";

import {
  countOccurrenceMarks,
  occurrencesCollapsedHint,
  OCCURRENCE_FIELD_KEYS,
  OCCURRENCE_LABELS_PT,
  syncDeductionsFromOccurrences,
  type OccurrenceFieldKey,
} from "@/lib/arbitration/occurrences";
import type { OccurrenceInput } from "@/lib/arbitration/types";

const OCCURRENCE_FIELDS = OCCURRENCE_FIELD_KEYS.map((key) => ({
  key,
  label: OCCURRENCE_LABELS_PT[key],
}));

function toggleCornerOccurrence(
  value: OccurrenceInput,
  corner: "blue" | "red",
  field: OccurrenceFieldKey,
  checked: boolean
): OccurrenceInput {
  const next: OccurrenceInput = {
    ...value,
    [corner]: { ...value[corner], [field]: checked },
  };
  if (field === "pointDeduction") {
    if (corner === "blue") {
      next.blueOfficialPointDeduction = checked ? Math.max(1, value.blueOfficialPointDeduction) : 0;
    } else {
      next.redOfficialPointDeduction = checked ? Math.max(1, value.redOfficialPointDeduction) : 0;
    }
  }
  return next;
}

function OccurrencesForm({
  value,
  athleteBlueName,
  athleteRedName,
  disabled,
  onChange,
}: {
  value: OccurrenceInput;
  athleteBlueName: string;
  athleteRedName: string;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
}) {
  const synced = syncDeductionsFromOccurrences(value);

  return (
    <>
      <div className="arb-occ-matrix-header arb-desktop-only">
        <div />
        <div className="arb-occ-matrix-corner arb-corner-blue">{athleteBlueName}</div>
        <div className="arb-occ-matrix-corner arb-corner-red">{athleteRedName}</div>
      </div>

      {OCCURRENCE_FIELDS.map(({ key, label }) => (
        <div key={key} className="arb-occ-matrix-row">
          <div className="arb-occ-matrix-label">{label}</div>
          <label className="arb-occurrence-check arb-occ-matrix-cell">
            <input
              type="checkbox"
              checked={value.blue[key]}
              disabled={disabled}
              onChange={(e) => onChange(toggleCornerOccurrence(value, "blue", key, e.target.checked))}
            />
            <span className="arb-mobile-only">Azul</span>
          </label>
          <label className="arb-occurrence-check arb-occ-matrix-cell">
            <input
              type="checkbox"
              checked={value.red[key]}
              disabled={disabled}
              onChange={(e) => onChange(toggleCornerOccurrence(value, "red", key, e.target.checked))}
            />
            <span className="arb-mobile-only">Verm.</span>
          </label>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Desconto no placar oficial</div>
        <div className="arb-deduction-btns">
          <button
            type="button"
            className={`arb-deduction-btn arb-deduction-btn-blue${synced.blueOfficialPointDeduction > 0 ? " arb-deduction-btn-active" : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                blueOfficialPointDeduction: value.blueOfficialPointDeduction > 0 ? 0 : 1,
                blue: { ...value.blue, pointDeduction: value.blueOfficialPointDeduction > 0 ? false : true },
              })
            }
          >
            −1 {athleteBlueName}
          </button>
          <button
            type="button"
            className={`arb-deduction-btn arb-deduction-btn-red${synced.redOfficialPointDeduction > 0 ? " arb-deduction-btn-active" : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                redOfficialPointDeduction: value.redOfficialPointDeduction > 0 ? 0 : 1,
                red: { ...value.red, pointDeduction: value.redOfficialPointDeduction > 0 ? false : true },
              })
            }
          >
            −1 {athleteRedName}
          </button>
        </div>
      </div>

      <textarea
        className="input"
        placeholder="Observações…"
        rows={2}
        disabled={disabled}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        style={{ width: "100%", marginTop: 12, minHeight: 64 }}
      />
    </>
  );
}

type Props = {
  value: OccurrenceInput;
  athleteBlueName: string;
  athleteRedName: string;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
};

export function OccurrencesPanel({ value, athleteBlueName, athleteRedName, disabled, onChange }: Props) {
  const markCount = countOccurrenceMarks(value);
  const hint = occurrencesCollapsedHint(value);
  const hasMarks = markCount > 0 || value.notes.trim().length > 0;

  return (
    <details className="arb-card arb-occurrences-panel">
      <summary className="arb-occurrences-summary">
        <div className="arb-occurrences-summary-text">
          <span className="arb-occurrences-summary-title">Ocorrências</span>
          <span className={`arb-occurrences-summary-hint${hasMarks ? " arb-occurrences-summary-hint-active" : ""}`}>
            {hint}
          </span>
        </div>
        <span className="arb-occurrences-chevron" aria-hidden>
          ▼
        </span>
      </summary>
      <div className="arb-occurrences-body">
        <p className="arb-occurrences-intro">Marque o atleta a quem se aplica cada ocorrência.</p>
        <OccurrencesForm
          value={value}
          athleteBlueName={athleteBlueName}
          athleteRedName={athleteRedName}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </details>
  );
}
