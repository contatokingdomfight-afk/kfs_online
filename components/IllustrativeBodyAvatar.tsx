"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AvatarPoseTagSelector } from "@/components/avatar/AvatarPoseTagSelector";
import { buildAvatarPoseLayout } from "@/components/avatar/build-avatar-layout";
import { mapFormDataToAvatarMeasurements, type Modality, type PoseTag } from "@/components/avatar/avatar-utils";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { humanoidHintFromFormVariant } from "@/lib/humanoid-gltf-scene";

const Humanoid3DPanelLazy = dynamic(
  () => import("@/components/humanoid-3d/Humanoid3DPanel").then((m) => ({ default: m.Humanoid3DPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] max-w-[min(280px,92vw)] mx-auto items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
        A carregar vista 3D…
      </div>
    ),
  }
);

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
  /** Altura/peso do perfil (Meus dados) ou da ficha para escala global meramente ilustrativa. */
  bodyScaleFromProfile?: { heightCm?: number | null; weightKg?: number | null } | null;
  /** Modalidade para pose «Guarda» (chips) e equipamento implícito no rig 3D. */
  modality?: Modality;
  /** Mostra chips «Guarda» / «Estrela» (afeta a pose do modelo 3D). */
  showPoseTags?: boolean;
  /** `tooltip`: linha curta + ícone com texto completo (ex.: carrossel de performance). */
  explainCaption?: "inline" | "tooltip";
  /** Obrigatório com `explainCaption="tooltip"` — texto visível antes do «i». */
  captionSummary?: string | null;
  /** Nota curta + detalhe sob o viewport 3D (i18n); opcional (ex. carrossel de performance). */
  humanoidFootnote?: { short: string; detail: string; infoAria: string } | null;
  /** Dica de controlos 3D (orbit / zoom / pan), ex. i18n `perfHumanoid3dOrbitHint`. */
  humanoid3dOrbitHint?: string | null;
  /** `aria-label` do «i» da legenda principal em modo tooltip. */
  silhouetteInfoAria?: string | null;
};

/**
 * Silhueta ilustrativa em 3D (WebGL); não representa diagnóstico nem composição corporal real.
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
  explainCaption = "inline",
  captionSummary = null,
  humanoidFootnote = null,
  humanoid3dOrbitHint = null,
  silhouetteInfoAria = null,
}: Props) {
  /** Por defeito «estrela» (braços abertos + pernas mais abertas); «Guarda» mantém a pose típica da modalidade. */
  const [poseTag, setPoseTag] = useState<PoseTag>("star");

  const parsed = normalizePhysicalFormDataJson(formData);
  const fd = neutralReference ? (parsed ?? {}) : parsed;
  if (!fd) return null;
  if (!neutralReference && !hasIllustrativeAnthropometry(fd)) return null;

  const measurements = neutralReference
    ? mapFormDataToAvatarMeasurements({}, bodyScaleFromProfile)
    : mapFormDataToAvatarMeasurements(fd, bodyScaleFromProfile);

  const { scales, pose } = useMemo(
    () => buildAvatarPoseLayout(measurements, modality, poseTag),
    [measurements, modality, poseTag]
  );

  const defaultCaption =
    "Figura meramente ilustrativa em 3D a partir das circunferências registadas (não é avaliação médica nem imagem do aluno)." +
    (assessedAtLabel ? ` Dados: ${assessedAtLabel}.` : "");

  const caption =
    captionOverride?.trim() ||
    (neutralReference
      ? "Silhueta de referência genérica em 3D (preenche pelo menos duas circunferências na ficha para uma figura aproximada às tuas medidas)." +
          (assessedAtLabel ? ` Ficha: ${assessedAtLabel}.` : "")
      : defaultCaption);

  const gltfBodyHint = humanoidHintFromFormVariant(fd.humanoid3dBodyVariant);
  const captionTooltipMode = explainCaption === "tooltip" && Boolean(captionSummary?.trim());

  return (
    <div className={className}>
      {captionTooltipMode ? (
        <div
          className="flex items-start gap-1.5"
          style={{ margin: "0 0 8px 0", fontSize: "clamp(11px, 2.8vw, 12px)", lineHeight: 1.45 }}
        >
          <p className="text-text-secondary m-0 flex-1 min-w-0">{captionSummary}</p>
          <InlineInfoTip
            detail={caption}
            ariaLabel={silhouetteInfoAria?.trim() || "Sobre esta figura ilustrativa"}
            className="shrink-0"
          />
        </div>
      ) : (
        <p className="text-text-secondary" style={{ fontSize: "clamp(11px, 2.8vw, 12px)", margin: "0 0 8px 0", lineHeight: 1.45 }}>
          {caption}
        </p>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {showPoseTags ? <AvatarPoseTagSelector value={poseTag} onChange={setPoseTag} /> : null}
      </div>
      <Humanoid3DPanelLazy
        scales={scales}
        pose={pose}
        className="max-w-[min(280px,92vw)]"
        gltfBodyHint={gltfBodyHint}
        footnote={humanoidFootnote}
        orbitHint={humanoid3dOrbitHint}
      />
    </div>
  );
}
