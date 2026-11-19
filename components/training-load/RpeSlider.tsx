"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RPE_MAX, RPE_MIN, RPE_STEP, formatRpe, rpeColor, rpeDescription } from "@/lib/rpe-labels";

type Props = {
  value: number | null;
  onChange: (v: number) => void;
  /** Chamado quando o utilizador larga o cursor (ou solta uma seta). */
  onCommit?: (v: number) => void;
  /** Se dado, grava o valor num input escondido para formulários. */
  name?: string;
  ariaLabel: string;
  pt?: boolean;
  /** Mostra o número grande e a descrição por cima da barra. */
  showReadout?: boolean;
  /** Texto do readout enquanto não há valor. */
  emptyText?: string;
  /** Etiquetas por baixo (esquerda, meio, direita). */
  scale?: [string, string, string];
  disabled?: boolean;
};

const PAD = 24;
const TRACK_BG = "linear-gradient(90deg,#4ade80,#a3e635 30%,#fbbf24 55%,#f97316 75%,#ef4444)";

/** Slider de cansaço 1–10 em meios pontos. Começa vazio (sem valor por omissão, para não puxar respostas). */
export function RpeSlider({ value, onChange, onCommit, name, ariaLabel, pt = true, showReadout = true, emptyText, scale, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const latest = useRef<number | null>(value);
  latest.current = value;

  const fromX = (clientX: number) => {
    const el = ref.current;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const raw = ((clientX - b.left - PAD) / Math.max(1, b.width - PAD * 2)) * (RPE_MAX - RPE_MIN) + RPE_MIN;
    const v = Math.min(RPE_MAX, Math.max(RPE_MIN, Math.round(raw / RPE_STEP) * RPE_STEP));
    if (v !== latest.current) {
      latest.current = v;
      onChange(v);
    }
    return v;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    fromX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) fromX(e.clientX);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (latest.current != null) onCommit?.(latest.current);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? RPE_STEP : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -RPE_STEP : 0;
    if (!delta) return;
    e.preventDefault();
    const base = latest.current ?? (delta > 0 ? RPE_MIN - RPE_STEP : RPE_MIN + RPE_STEP);
    const v = Math.min(RPE_MAX, Math.max(RPE_MIN, base + delta));
    latest.current = v;
    onChange(v);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(e.key) && latest.current != null) onCommit?.(latest.current);
  };

  const pct = value == null ? 0 : (value - RPE_MIN) / (RPE_MAX - RPE_MIN);
  const color = value == null ? "var(--text-secondary)" : rpeColor(value);

  return (
    <div style={{ display: "grid", gap: 6, opacity: disabled ? 0.6 : 1 }}>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {showReadout ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, minHeight: 38 }} aria-live="polite">
          <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color }}>{value == null ? "–" : formatRpe(value, pt)}</span>
          <span style={{ fontSize: 13, fontWeight: value == null ? 600 : 700, color }}>
            {value == null ? emptyText ?? (pt ? "Escolhe de 1 a 10" : "Pick 1 to 10") : rpeDescription(value, pt)}
          </span>
        </div>
      ) : null}
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={RPE_MIN}
        aria-valuemax={RPE_MAX}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value == null ? undefined : `${formatRpe(value, pt)} · ${rpeDescription(value, pt)}`}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        style={{ position: "relative", height: 48, touchAction: "none", cursor: disabled ? "not-allowed" : "pointer", userSelect: "none", outlineOffset: 4, borderRadius: 12 }}
      >
        <div
          aria-hidden
          style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 12, marginTop: -6, borderRadius: 6, background: TRACK_BG, opacity: value == null ? 0.35 : 1, transition: "opacity .2s" }}
        />
        {value == null ? (
          <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px #000", pointerEvents: "none" }}>
            {pt ? "Toca ou arrasta" : "Tap or drag"}
          </div>
        ) : (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: `calc(${PAD}px + (100% - ${PAD * 2}px) * ${pct})`,
              width: 48,
              height: 48,
              margin: "-24px 0 0 -24px",
              borderRadius: "50%",
              background: "#fff",
              border: `4px solid ${color}`,
              boxShadow: "0 2px 10px rgba(0,0,0,.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 14,
              color: "#111",
              pointerEvents: "none",
            }}
          >
            {formatRpe(value, pt)}
          </div>
        )}
      </div>
      {scale ? (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
          <span>{scale[0]}</span>
          <span>{scale[1]}</span>
          <span>{scale[2]}</span>
        </div>
      ) : null}
    </div>
  );
}

export function rpeScale(pt: boolean, group = false): [string, string, string] {
  if (group) return pt ? ["Saíram frescos", "Bem cansados", "Esgotados"] : ["Fresh", "Really tired", "Exhausted"];
  return pt ? ["Saí fresco", "Bem cansado", "Esgotado"] : ["Fresh", "Really tired", "Exhausted"];
}
