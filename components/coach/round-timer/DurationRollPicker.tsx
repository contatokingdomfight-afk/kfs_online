"use client";

import { useMemo, type ReactNode } from "react";

function clampTotal(total: number, minSec: number, maxSec: number): number {
  return Math.min(maxSec, Math.max(minSec, Math.floor(total)));
}

function splitSec(total: number): { m: number; s: number } {
  const t = Math.max(0, Math.floor(total));
  return { m: Math.floor(t / 60), s: t % 60 };
}

function secondRange(m: number, minSec: number, maxSec: number): { low: number; high: number } {
  const low = Math.max(0, minSec - m * 60);
  const high = Math.min(59, maxSec - m * 60);
  return { low, high };
}

function validMinutes(minSec: number, maxSec: number): number[] {
  const maxM = Math.floor(maxSec / 60);
  const out: number[] = [];
  for (let m = 0; m <= maxM; m++) {
    const { low, high } = secondRange(m, minSec, maxSec);
    if (low <= high) out.push(m);
  }
  return out;
}

export type DurationRollPickerProps = {
  label: ReactNode;
  valueSec: number;
  onChangeSec: (n: number) => void;
  minSec: number;
  maxSec: number;
  disabled?: boolean;
  ariaMinutes: string;
  ariaSeconds: string;
};

/**
 * Seletores de minutos e segundos (estilo rolo nativo no telemóvel) para durações longas.
 */
export function DurationRollPicker({
  label,
  valueSec,
  onChangeSec,
  minSec,
  maxSec,
  disabled,
  ariaMinutes,
  ariaSeconds,
}: DurationRollPickerProps) {
  const clamped = clampTotal(valueSec, minSec, maxSec);
  const { m, s } = splitSec(clamped);

  const minutesList = useMemo(() => validMinutes(minSec, maxSec), [minSec, maxSec]);

  const { low: sLow, high: sHigh } = useMemo(() => secondRange(m, minSec, maxSec), [m, minSec, maxSec]);

  const secondOptions = useMemo(() => {
    const opts: number[] = [];
    for (let sec = sLow; sec <= sHigh; sec++) opts.push(sec);
    return opts;
  }, [sLow, sHigh]);

  const onMinuteChange = (mNew: number) => {
    const { low, high } = secondRange(mNew, minSec, maxSec);
    const sNext = Math.min(high, Math.max(low, s));
    onChangeSec(clampTotal(mNew * 60 + sNext, minSec, maxSec));
  };

  const onSecondChange = (sNew: number) => {
    onChangeSec(clampTotal(m * 60 + sNew, minSec, maxSec));
  };

  return (
    <div className="duration-roll-field">
      <span className="duration-roll-label">{label}</span>
      <div className="duration-roll-row">
        <label className="duration-roll-wheel">
          <span className="duration-roll-sublabel">{ariaMinutes}</span>
          <select
            className="duration-roll-select"
            aria-label={ariaMinutes}
            disabled={disabled}
            value={m}
            onChange={(e) => onMinuteChange(Number(e.target.value))}
          >
            {minutesList.map((mi) => (
              <option key={mi} value={mi}>
                {mi}
              </option>
            ))}
          </select>
        </label>
        <span className="duration-roll-colon" aria-hidden>
          :
        </span>
        <label className="duration-roll-wheel">
          <span className="duration-roll-sublabel">{ariaSeconds}</span>
          <select
            className="duration-roll-select"
            aria-label={ariaSeconds}
            disabled={disabled}
            value={s}
            onChange={(e) => onSecondChange(Number(e.target.value))}
          >
            {secondOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
