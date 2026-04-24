"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPoseTagSelector } from "@/components/avatar/AvatarPoseTagSelector";
import { mapFormDataToAvatarMeasurements, type Modality, type PoseTag } from "@/components/avatar/avatar-utils";
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
  /** Modalidade para equipamento e guarda por defeito (luvas / wraps / sem luvas). */
  modality?: Modality;
  /** Mostra chips «Guarda» / «Estrela» por cima do SVG. */
  showPoseTags?: boolean;
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
  showPoseTags = false,
}: Props) {
  const [poseTag, setPoseTag] = useState<PoseTag>("auto");

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
      {showPoseTags ? (
        <div className="mb-2">
          <AvatarPoseTagSelector value={poseTag} onChange={setPoseTag} />
        </div>
      ) : null}
      <Avatar modality={modality} measurements={measurements} poseTag={poseTag} />
    </div>
  );
}
