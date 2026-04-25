"use client";

import { buildSilhouetteParts } from "@/lib/illustrative-body-silhouette";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

/** Pré-visualização do motor B (`buildSilhouetteParts`) para comparar com o `Avatar` modular no playground dev. */
export function SilhouetteMotorBPreview({ fd }: { fd: Partial<PhysicalAssessmentFormData> }) {
  const p = buildSilhouetteParts(fd);
  const rect = (r: { x: number; y: number; w: number; h: number }, k: string) => (
    <rect key={k} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill="currentColor" opacity={0.2} />
  );
  return (
    <svg
      viewBox="0 0 100 185"
      className="mx-auto block w-full max-w-[140px] text-[var(--text-secondary)]"
      aria-hidden
    >
      <polygon
        points={p.torsoPoints}
        fill="currentColor"
        opacity={0.18}
        stroke="currentColor"
        strokeWidth={0.35}
        strokeOpacity={0.5}
      />
      <ellipse cx={p.head.cx} cy={p.head.cy} rx={p.head.rx} ry={p.head.ry} fill="currentColor" opacity={0.26} />
      <rect x={p.neck.x} y={p.neck.y} width={p.neck.w} height={p.neck.h} fill="currentColor" opacity={0.22} />
      {rect(p.armL, "al")}
      {rect(p.armR, "ar")}
      {rect(p.thighL, "tl")}
      {rect(p.thighR, "tr")}
      {rect(p.calfL, "cl")}
      {rect(p.calfR, "cr")}
      {rect(p.footL, "fl")}
      {rect(p.footR, "fr")}
    </svg>
  );
}
