"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BodyScaleFactors } from "@/components/avatar/avatar-utils";
import type { PoseLayout } from "@/components/avatar/Pose";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";
import { mountHumanoidGltfOrProcedural, type HumanoidGltfBodyHint } from "@/lib/humanoid-gltf-scene";
import type { HumanoidMountHandle } from "@/lib/procedural-humanoid-scene";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
  gltfBodyHint?: HumanoidGltfBodyHint;
  /** Se definido, nota curta + tooltip em vez de parágrafo longo fixo. */
  footnote?: { short: string; detail: string; infoAria: string } | null;
};

/**
 * Painel WebGL: GLB base em `/models/human-base.glb` (substituível) com escala a partir da ficha;
 * se o ficheiro falhar, cai no humanóide procedural.
 */
export function Humanoid3DPanel({
  scales,
  pose,
  className,
  gltfBodyHint = "auto",
  footnote = null,
}: Props) {
  const joints = useMemo(() => computeAvatarRigJoints(scales, pose), [scales, pose]);
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HumanoidMountHandle | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cancelled = false;
    void mountHumanoidGltfOrProcedural(el, joints, undefined, gltfBodyHint).then((h) => {
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
  }, [joints, gltfBodyHint]);

  const defaultFootnote =
    "Modelo 3D a partir de ficheiro base (GLB) ajustado às tuas medidas; se não existir GLB, mostra-se o manequim procedural. Ilustrativo, não clínico.";

  return (
    <div className={className}>
      <div
        ref={mountRef}
        className="h-[272px] w-full max-w-[220px] mx-auto rounded-xl border border-[var(--border)] overflow-hidden bg-[color-mix(in_srgb,var(--bg-secondary)_94%,transparent)]"
      />
      {footnote ? (
        <div className="flex items-start justify-center gap-1.5 px-2 pt-1">
          <p className="text-[10px] text-center text-[var(--text-secondary)] m-0 leading-snug flex-1 min-w-0">
            {footnote.short}
          </p>
          <InlineInfoTip detail={footnote.detail} ariaLabel={footnote.infoAria} className="pt-0.5" />
        </div>
      ) : (
        <p className="text-[10px] text-center text-[var(--text-secondary)] px-2 pt-1 m-0 leading-snug">
          {defaultFootnote}
        </p>
      )}
    </div>
  );
}
