"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BodyScaleFactors } from "@/components/avatar/avatar-utils";
import type { PoseLayout } from "@/components/avatar/Pose";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";
import { mountProceduralHumanoidScene } from "@/lib/procedural-humanoid-scene";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

/**
 * Painel WebGL isolado (Three.js imperativo, sem R3F — evita erros #525 / React duplicado no Next).
 */
export function Humanoid3DPanel({ scales, pose, className }: Props) {
  const joints = useMemo(() => computeAvatarRigJoints(scales, pose), [scales, pose]);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const { destroy } = mountProceduralHumanoidScene(el, joints);
    return destroy;
  }, [joints]);

  return (
    <div className={className}>
      <div
        ref={mountRef}
        className="h-[272px] w-full max-w-[220px] mx-auto rounded-xl border border-[var(--border)] overflow-hidden bg-[color-mix(in_srgb,var(--bg-secondary)_94%,transparent)]"
      />
      <p className="text-[10px] text-center text-[var(--text-secondary)] px-2 pt-1 m-0 leading-snug">
        Modelo 3D procedural (sem ficheiros externos). Ilustrativo, não clínico.
      </p>
    </div>
  );
}
