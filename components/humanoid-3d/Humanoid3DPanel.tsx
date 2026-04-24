"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { BodyScaleFactors } from "@/components/avatar/avatar-utils";
import type { PoseLayout } from "@/components/avatar/Pose";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";
import { ProceduralHumanoid } from "./ProceduralHumanoid";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

/**
 * Painel WebGL isolado: só monta quando o utilizador escolhe «3D» (import dinâmico no pai).
 * Humanóide procedural — sem GLB nem serviços pagos.
 */
export function Humanoid3DPanel({ scales, pose, className }: Props) {
  const joints = useMemo(() => computeAvatarRigJoints(scales, pose), [scales, pose]);

  return (
    <div className={className}>
      <div className="h-[272px] w-full max-w-[220px] mx-auto rounded-xl border border-[var(--border)] overflow-hidden bg-[color-mix(in_srgb,var(--bg-secondary)_94%,transparent)]">
        <Canvas
          gl={{ alpha: true, antialias: true, powerPreference: "low-power", stencil: false, depth: true }}
          dpr={[1, 1.2]}
          camera={{ position: [0, 0.8, 1.38], fov: 40, near: 0.08, far: 22 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={null}>
            <ProceduralHumanoid joints={joints} />
          </Suspense>
        </Canvas>
      </div>
      <p className="text-[10px] text-center text-[var(--text-secondary)] px-2 pt-1 m-0 leading-snug">
        Modelo 3D procedural (sem ficheiros externos). Ilustrativo, não clínico.
      </p>
    </div>
  );
}
