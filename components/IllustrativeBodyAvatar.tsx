"use client";

import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { Avatar } from "@/components/avatar/Avatar";
import { mapFormDataToAvatarMeasurements, type Modality } from "@/components/avatar/avatar-utils";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";

type Props = {
  formData: unknown;
  /** ISO date da avaliação (mostrado na legenda) */
  assessedAtLabel?: string | null;
  className?: string;
  /** Se definido, substitui o parágrafo explicativo (ex.: i18n na área do aluno). */
  captionOverride?: string | null;
  /**
   * Silhueta de referência (proporções por defeito) quando a ficha existe mas não há antropometria suficiente.
   * Requer `captionOverride` com texto explicativo (i18n).
   */
  neutralReference?: boolean;
  /** Altura/peso do perfil (Meus dados) para escala global meramente ilustrativa da silhueta. */
  bodyScaleFromProfile?: { heightCm?: number | null; weightKg?: number | null } | null;
  /** Modalidade para pose e equipamento (luvas / wraps / sem luvas). */
  modality?: Modality;
};

/**
 * Figura 2D ilustrativa (SVG modular); não representa diagnóstico nem composição corporal real.
 */
export function IllustrativeBodyAvatar({
  formData,
  assessedAtLabel,
  className,
  captionOverride,
  neutralReference = false,
  bodyScaleFromProfile = null,
  modality = "boxing",
}: Props) {
  const parsed = normalizePhysicalFormDataJson(formData);
  const fd = neutralReference ? (parsed ?? {}) : parsed;
  if (!fd) return null;
  if (!neutralReference && !hasIllustrativeAnthropometry(fd)) return null;

  const measurements = neutralReference
    ? mapFormDataToAvatarMeasurements({}, bodyScaleFromProfile)
    : mapFormDataToAvatarMeasurements(fd, bodyScaleFromProfile);

  const defaultCaption =
    "Figura meramente ilustrativa a partir das circunferências registadas (não é avaliação médica nem imagem do aluno)." +
    (assessedAtLabel ? ` Dados: ${assessedAtLabel}.` : "");

  const caption =
    captionOverride?.trim() ||
    (neutralReference
      ? "Silhueta de referência genérica (preenche pelo menos duas circunferências na ficha para uma figura aproximada às tuas medidas)." +
          (assessedAtLabel ? ` Ficha: ${assessedAtLabel}.` : "")
      : defaultCaption);

  return (
    <div className={className}>
      <p className="text-text-secondary" style={{ fontSize: "clamp(11px, 2.8vw, 12px)", margin: "0 0 8px 0", lineHeight: 1.45 }}>
        {caption}
      </p>
      <Avatar modality={modality} measurements={measurements} />
    </div>
  );
}
