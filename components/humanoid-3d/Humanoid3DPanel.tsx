"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BodyScaleFactors } from "@/components/avatar/avatar-utils";
import type { PoseLayout } from "@/components/avatar/Pose";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";
import { mountHumanoidGltfOrProcedural } from "@/lib/humanoid-gltf-scene";
import type { HumanoidMountHandle } from "@/lib/procedural-humanoid-scene";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

/**
 * Painel WebGL: GLB base em `/models/human-base.glb` (substituível) com escala a partir da ficha;
 * se o ficheiro falhar, cai no humanóide procedural.
 */
export function Humanoid3DPanel({ scales, pose, className }: Props) {
  const joints = useMemo(() => computeAvatarRigJoints(scales, pose), [scales, pose]);
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HumanoidMountHandle | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cancelled = false;
    void mountHumanoidGltfOrProcedural(el, joints).then((h) => {
      if (cancelled) {
        h.destroy();
        return;
      }
      handleRef.current?.destroy();
      handleRef.current = h;
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [joints]);

  return (
    <div className={className}>
      <div
        ref={mountRef}
        className="h-[272px] w-full max-w-[220px] mx-auto rounded-xl border border-[var(--border)] overflow-hidden bg-[color-mix(in_srgb,var(--bg-secondary)_94%,transparent)]"
      />
      <p className="text-[10px] text-center text-[var(--text-secondary)] px-2 pt-1 m-0 leading-snug">
        Modelo 3D a partir de ficheiro base (GLB) ajustado às tuas medidas; se não existir GLB, mostra-se o
        manequim procedural. Ilustrativo, não clínico.
      </p>
    </div>
  );
}
