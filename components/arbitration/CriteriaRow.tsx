"use client";

import { useState } from "react";

type Props = {
  label: string;
  description?: string;
  criterionId: string;
  blueValue: number | null;
  redValue: number | null;
  disabled: boolean;
  onSelect: (corner: "blue" | "red", criterionId: string, value: number) => void;
};

function CriterionInfoToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="arb-criterion-info-btn"
      aria-label="O que avalia este critério"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      ⓘ
    </button>
  );
}

export function CriteriaRow({ label, description, criterionId, blueValue, redValue, disabled, onSelect }: Props) {
  const scores = [1, 2, 3, 4, 5];
  const [descOpen, setDescOpen] = useState(false);

  return (
    <>
      <div className="arb-desktop-only">
        <div className="arb-criteria-row">
          <div className="arb-criteria-label" title={description}>
            {label}
            {description ? <CriterionInfoToggle open={descOpen} onToggle={() => setDescOpen((v) => !v)} /> : null}
          </div>
          {scores.map((n) => (
            <button
              key={`b-${n}`}
              type="button"
              className={`arb-score-btn arb-score-btn-blue${blueValue === n ? " arb-score-btn-selected" : ""}`}
              disabled={disabled}
              onClick={() => onSelect("blue", criterionId, n)}
            >
              {n}
            </button>
          ))}
          {scores.map((n) => (
            <button
              key={`r-${n}`}
              type="button"
              className={`arb-score-btn arb-score-btn-red${redValue === n ? " arb-score-btn-selected" : ""}`}
              disabled={disabled}
              onClick={() => onSelect("red", criterionId, n)}
            >
              {n}
            </button>
          ))}
        </div>
        {description && descOpen ? <p className="arb-criterion-desc">{description}</p> : null}
      </div>

      <div className="arb-mobile-only arb-card" style={{ padding: 12, marginBottom: 8 }}>
        <div className="arb-criteria-label" style={{ marginBottom: descOpen ? 6 : 10 }}>
          {label}
          {description ? <CriterionInfoToggle open={descOpen} onToggle={() => setDescOpen((v) => !v)} /> : null}
        </div>
        {description && descOpen ? (
          <p className="arb-criterion-desc" style={{ marginBottom: 10 }}>
            {description}
          </p>
        ) : null}
        <div className="arb-corner-scores">
          <span className="arb-corner-scores-label arb-corner-blue">Azul</span>
          <div className="arb-corner-scores-btns">
            {scores.map((n) => (
              <button
                key={`mb-${n}`}
                type="button"
                className={`arb-score-btn arb-score-btn-blue${blueValue === n ? " arb-score-btn-selected" : ""}`}
                disabled={disabled}
                onClick={() => onSelect("blue", criterionId, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="arb-corner-scores" style={{ marginTop: 8 }}>
          <span className="arb-corner-scores-label arb-corner-red">Verm.</span>
          <div className="arb-corner-scores-btns">
            {scores.map((n) => (
              <button
                key={`mr-${n}`}
                type="button"
                className={`arb-score-btn arb-score-btn-red${redValue === n ? " arb-score-btn-selected" : ""}`}
                disabled={disabled}
                onClick={() => onSelect("red", criterionId, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
