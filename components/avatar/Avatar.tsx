"use client";

import type { CSSProperties } from "react";
import { useId } from "react";
import { type AvatarProps } from "./avatar-utils";
import { buildAvatarPoseLayout } from "./build-avatar-layout";
import { Body } from "./Body";
import { Cosmetics } from "./Cosmetics";
import { Equipment } from "./Equipment";
import { getWorldHandPositions, Pose } from "./Pose";
import { getCosmeticValue } from "@/lib/avatar-cosmetics";

const ROOT_STYLE: CSSProperties = {
  ["--avatar-fill" as string]: "color-mix(in srgb, var(--text-secondary) 86%, transparent)",
  ["--avatar-fill-mid" as string]: "color-mix(in srgb, var(--text-secondary) 78%, var(--border) 14%)",
  ["--avatar-fill-hi" as string]: "color-mix(in srgb, var(--text-secondary) 72%, white 18%)",
  ["--avatar-stroke" as string]: "color-mix(in srgb, var(--border) 92%, var(--text-secondary) 8%)",
  ["--avatar-gear" as string]: "color-mix(in srgb, var(--primary) 82%, var(--text-secondary) 18%)",
};

/**
 * Avatar SVG modular: corpo curvo, pose por modalidade, equipamento (luvas / wraps).
 */
export function Avatar({
  modality = "boxing",
  measurements,
  className,
  poseTag = "star",
  avatarConfig,
  beltColor,
}: AvatarProps) {
  const { scales, pose } = buildAvatarPoseLayout(measurements, modality, poseTag);
  const hands = getWorldHandPositions(pose);
  const rawId = useId().replace(/:/g, "");
  const pid = `av-${rawId}`;
  const gearColorOverride = avatarConfig ? getCosmeticValue("gearColor", avatarConfig.gearColor) : undefined;

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="-18 -4 236 404" className="mx-auto block w-full max-w-[200px]" style={{ overflow: "visible" }} aria-hidden>
        <defs>
          <radialGradient id={`${pid}-head`} cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor="var(--avatar-fill-hi)" stopOpacity={1} />
            <stop offset="55%" stopColor="var(--avatar-fill)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--avatar-fill-mid)" stopOpacity={1} />
          </radialGradient>
          <linearGradient id={`${pid}-torso`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--avatar-fill-hi)" stopOpacity={0.95} />
            <stop offset="48%" stopColor="var(--avatar-fill)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--avatar-fill-mid)" stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`${pid}-neck`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="var(--avatar-fill-hi)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--avatar-fill-mid)" stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`${pid}-limb`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--avatar-stroke)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--avatar-stroke)" stopOpacity={0.88} />
          </linearGradient>
          <filter id={`${pid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.8" floodColor="#0f172a" floodOpacity="0.14" />
          </filter>
        </defs>
        <Body scales={scales} pose={pose} paintIds={{ head: `${pid}-head`, torso: `${pid}-torso`, neck: `${pid}-neck`, limb: `${pid}-limb`, softShadow: `${pid}-soft` }} />
        <Pose type={modality} poseTag={poseTag} />
        <Equipment type={modality} handL={hands.handL} handR={hands.handR} colorOverride={gearColorOverride} />
        <Cosmetics scales={scales} pose={pose} avatarConfig={avatarConfig} beltColor={beltColor} />
      </svg>
    </div>
  );
}
