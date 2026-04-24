"use client";

import type { CSSProperties } from "react";
import { type AvatarProps } from "./avatar-utils";
import { buildAvatarPoseLayout } from "./build-avatar-layout";
import { Body } from "./Body";
import { Equipment } from "./Equipment";
import { getWorldHandPositions, Pose } from "./Pose";

const ROOT_STYLE: CSSProperties = {
  ["--avatar-fill" as string]: "color-mix(in srgb, var(--text-secondary) 86%, transparent)",
  ["--avatar-stroke" as string]: "color-mix(in srgb, var(--border) 92%, var(--text-secondary) 8%)",
  ["--avatar-gear" as string]: "color-mix(in srgb, var(--primary) 82%, var(--text-secondary) 18%)",
};

/**
 * Avatar SVG modular: corpo curvo, pose por modalidade, equipamento (luvas / wraps).
 */
export function Avatar({ modality = "boxing", measurements, className, poseTag = "auto" }: AvatarProps) {
  const { scales, pose } = buildAvatarPoseLayout(measurements, modality, poseTag);
  const hands = getWorldHandPositions(pose);

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="0 0 200 400" className="mx-auto block w-full max-w-[200px]" style={{ overflow: "visible" }} aria-hidden>
        <Body scales={scales} pose={pose} />
        <Pose type={modality} poseTag={poseTag} />
        <Equipment type={modality} handL={hands.handL} handR={hands.handR} />
      </svg>
    </div>
  );
}
