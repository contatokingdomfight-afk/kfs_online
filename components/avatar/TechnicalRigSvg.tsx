"use client";

import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";
import { useId } from "react";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

const ROOT_STYLE = {
  ["--avatar-stroke" as string]: "color-mix(in srgb, var(--border) 92%, var(--text-secondary) 8%)",
  ["--rig-bone" as string]: "color-mix(in srgb, var(--primary) 72%, #6b21a8 28%)",
  ["--rig-bone-deep" as string]: "color-mix(in srgb, var(--primary) 58%, #4c1d95 42%)",
  ["--rig-joint" as string]: "color-mix(in srgb, var(--primary) 55%, var(--text-secondary) 45%)",
  ["--rig-joint-hi" as string]: "color-mix(in srgb, var(--primary) 42%, white 24%)",
  ["--rig-ik" as string]: "color-mix(in srgb, var(--text-secondary) 45%, transparent)",
  ["--rig-mesh" as string]: "color-mix(in srgb, var(--text-secondary) 22%, transparent)",
  ["--rig-mesh-edge" as string]: "color-mix(in srgb, var(--primary) 35%, var(--text-secondary) 20%)",
} as const;

/**
 * Vista técnica 2D estilo «mesh + ossos»: linhas de ossos, nós, guias tipo IK e malha muito suave.
 * Usa os mesmos `BodyScaleFactors` e `PoseLayout` que o avatar ilustrativo (dados da ficha 6.4 + perfil).
 * Manter paridade com `Body.tsx` / `lib/avatar-rig-joints.ts` — ver `DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md` §7.
 */
export function TechnicalRigSvg({ scales, pose, className }: Props) {
  const j = computeAvatarRigJoints(scales, pose);
  const rid = `rig-${useId().replace(/:/g, "")}`;
  const gidBone = `${rid}-bone`;
  const gidJoint = `${rid}-joint`;
  const gidGlow = `${rid}-glow`;

  const jointPts = [
    j.headC,
    j.neckBase,
    j.sternum,
    j.thorax,
    j.lumbar,
    j.pelvis,
    j.shoulderLw,
    j.shoulderRw,
    j.elbowL,
    j.elbowR,
    j.wristL,
    j.wristR,
    j.kneeL,
    j.kneeR,
    j.ankleL,
    j.ankleR,
  ];

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="-18 -4 236 404" className="mx-auto block w-full max-w-[200px]" style={{ overflow: "visible" }} aria-hidden>
        <defs>
          <linearGradient id={gidBone} gradientUnits="userSpaceOnUse" x1="72" y1="300" x2="128" y2="36">
            <stop offset="0%" stopColor="var(--rig-bone-deep)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--rig-bone)" stopOpacity={1} />
          </linearGradient>
          <radialGradient id={gidJoint} cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor="var(--rig-joint-hi)" stopOpacity={1} />
            <stop offset="70%" stopColor="var(--rig-joint)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--rig-bone-deep)" stopOpacity={0.95} />
          </radialGradient>
          <filter id={gidGlow} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity={0.09} stroke="var(--avatar-stroke)" strokeWidth={0.35} fill="none">
          {Array.from({ length: 9 }, (_, col) => (
            <line key={`gv-${col}`} x1={col * 25} y1={0} x2={col * 25} y2={400} opacity={0.45} />
          ))}
        </g>

        <g opacity={0.2} fill="var(--rig-mesh)" stroke="var(--rig-mesh-edge)" strokeWidth={0.45}>
          <ellipse
            cx={j.cx}
            cy={j.headCy}
            rx={j.headRx}
            ry={j.headRy}
            transform={`rotate(${j.torsoDeg}, ${j.torsoPivot.x}, ${j.torsoPivot.y})`}
          />
          <path d={j.torsoPath} transform={`rotate(${j.torsoDeg}, ${j.torsoPivot.x}, ${j.torsoPivot.y})`} />
        </g>

        <g stroke="var(--rig-ik)" strokeWidth={0.5} strokeDasharray="3.5 5.5" opacity={0.5} fill="none" strokeLinecap="round">
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.ankleL.x} y2={j.ankleL.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.ankleR.x} y2={j.ankleR.y} />
          <line x1={j.ankleL.x} y1={j.ankleL.y} x2={j.ankleR.x} y2={j.ankleR.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.wristL.x} y2={j.wristL.y} opacity={0.42} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.wristR.x} y2={j.wristR.y} opacity={0.42} />
        </g>

        <g stroke={`url(#${gidBone})`} strokeWidth={2.15} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.95}>
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.lumbar.x} y2={j.lumbar.y} />
          <line x1={j.lumbar.x} y1={j.lumbar.y} x2={j.thorax.x} y2={j.thorax.y} />
          <line x1={j.thorax.x} y1={j.thorax.y} x2={j.sternum.x} y2={j.sternum.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.neckBase.x} y2={j.neckBase.y} />
          <line x1={j.neckBase.x} y1={j.neckBase.y} x2={j.headC.x} y2={j.headC.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.shoulderLw.x} y2={j.shoulderLw.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.shoulderRw.x} y2={j.shoulderRw.y} />
          <line x1={j.shoulderLw.x} y1={j.shoulderLw.y} x2={j.elbowL.x} y2={j.elbowL.y} />
          <line x1={j.elbowL.x} y1={j.elbowL.y} x2={j.wristL.x} y2={j.wristL.y} />
          <line x1={j.shoulderRw.x} y1={j.shoulderRw.y} x2={j.elbowR.x} y2={j.elbowR.y} />
          <line x1={j.elbowR.x} y1={j.elbowR.y} x2={j.wristR.x} y2={j.wristR.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.hipL0.x} y2={j.hipL0.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.hipR0.x} y2={j.hipR0.y} />
          <line x1={j.hipL0.x} y1={j.hipL0.y} x2={j.kneeL.x} y2={j.kneeL.y} />
          <line x1={j.kneeL.x} y1={j.kneeL.y} x2={j.ankleL.x} y2={j.ankleL.y} />
          <line x1={j.hipR0.x} y1={j.hipR0.y} x2={j.kneeR.x} y2={j.kneeR.y} />
          <line x1={j.kneeR.x} y1={j.kneeR.y} x2={j.ankleR.x} y2={j.ankleR.y} />
        </g>

        <g filter={`url(#${gidGlow})`}>
          {jointPts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={j.jointR + 1.1} fill="none" stroke="var(--rig-bone)" strokeOpacity={0.28} strokeWidth={0.85} />
              <circle cx={p.x} cy={p.y} r={j.jointR} fill={`url(#${gidJoint})`} stroke="var(--avatar-stroke)" strokeOpacity={0.35} strokeWidth={0.4} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
