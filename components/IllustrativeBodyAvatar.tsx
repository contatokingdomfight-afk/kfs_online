"use client";

import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { buildSilhouetteParts, hasIllustrativeAnthropometry } from "@/lib/illustrative-body-silhouette";

type Props = {
  formData: unknown;
  /** ISO date da avaliação (mostrado na legenda) */
  assessedAtLabel?: string | null;
  className?: string;
  /** Se definido, substitui o parágrafo explicativo (ex.: i18n na área do aluno). */
  captionOverride?: string | null;
};

/**
 * Silhueta 2D meramente ilustrativa com base em medidas opcionais da ficha; não representa diagnóstico nem composição corporal real.
 */
export function IllustrativeBodyAvatar({ formData, assessedAtLabel, className, captionOverride }: Props) {
  if (!formData || typeof formData !== "object") return null;
  const fd = formData as Partial<PhysicalAssessmentFormData>;
  if (!hasIllustrativeAnthropometry(fd)) return null;

  const p = buildSilhouetteParts(fd);

  const defaultCaption =
    "Figura meramente ilustrativa a partir das circunferências registadas (não é avaliação médica nem imagem do aluno)." +
    (assessedAtLabel ? ` Dados: ${assessedAtLabel}.` : "");

  return (
    <div className={className}>
      <p className="text-text-secondary" style={{ fontSize: "clamp(11px, 2.8vw, 12px)", margin: "0 0 8px 0", lineHeight: 1.45 }}>
        {captionOverride?.trim() ? captionOverride : defaultCaption}
      </p>
      <svg
        viewBox="0 0 100 232"
        className="w-full max-w-[140px] mx-auto block"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <g
          fill="var(--text-secondary)"
          fillOpacity={0.28}
          stroke="var(--border)"
          strokeWidth={0.35}
          strokeOpacity={0.9}
        >
          <ellipse cx={p.head.cx} cy={p.head.cy} rx={p.head.rx} ry={p.head.ry} />
          <rect x={p.neck.x} y={p.neck.y} width={p.neck.w} height={p.neck.h} rx={1.2} />
          <polygon points={p.torsoPoints} />
          <rect x={p.armL.x} y={p.armL.y} width={p.armL.w} height={p.armL.h} rx={1.5} />
          <rect x={p.armR.x} y={p.armR.y} width={p.armR.w} height={p.armR.h} rx={1.5} />
          <rect x={p.thighL.x} y={p.thighL.y} width={p.thighL.w} height={p.thighL.h} rx={1.2} />
          <rect x={p.thighR.x} y={p.thighR.y} width={p.thighR.w} height={p.thighR.h} rx={1.2} />
          <rect x={p.calfL.x} y={p.calfL.y} width={p.calfL.w} height={p.calfL.h} rx={1} />
          <rect x={p.calfR.x} y={p.calfR.y} width={p.calfR.w} height={p.calfR.h} rx={1} />
          <rect x={p.footL.x} y={p.footL.y} width={p.footL.w} height={p.footL.h} rx={1.2} />
          <rect x={p.footR.x} y={p.footR.y} width={p.footR.w} height={p.footR.h} rx={1.2} />
        </g>
      </svg>
    </div>
  );
}
