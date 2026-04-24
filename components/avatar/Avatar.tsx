"use client";

import type { CSSProperties } from "react";
import { buildBodyScaleFactors, type AvatarProps } from "./avatar-utils";
import { Body } from "./Body";
import { Equipment } from "./Equipment";
import { getPoseLayout, getWorldHandPositions, Pose } from "./Pose";

const ROOT_STYLE: CSSProperties = {
  ["--avatar-fill" as string]: "color-mix(in srgb, var(--text-secondary) 72%, transparent)",
  ["--avatar-stroke" as string]: "var(--border)",
  ["--avatar-gear" as string]: "color-mix(in srgb, var(--primary) 78%, var(--text-secondary) 22%)",
};

/**
 * Avatar SVG modular: corpo curvo, pose por modalidade, equipamento (luvas / wraps).
 */
export function Avatar({ modality = "boxing", measurements, className }: AvatarProps) {
  const scales = buildBodyScaleFactors(measurements);
  const armLenBase = 58 * scales.arm * scales.bulk;
  const pose = getPoseLayout(modality, armLenBase);
  const hands = getWorldHandPositions(pose);

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="0 0 200 400" className="mx-auto block w-full max-w-[180px]" style={{ overflow: "visible" }} aria-hidden>
        <Body scales={scales} pose={pose} />
        <Pose type={modality} />
        <Equipment type={modality} handL={hands.handL} handR={hands.handR} />
      </svg>
    </div>
  );
}
