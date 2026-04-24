"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPoseTagSelector } from "@/components/avatar/AvatarPoseTagSelector";
import { buildAvatarPoseLayout } from "@/components/avatar/build-avatar-layout";
import { TechnicalRigSvg } from "@/components/avatar/TechnicalRigSvg";
import { mapFormDataToAvatarMeasurements, type Modality, type PoseTag } from "@/components/avatar/avatar-utils";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";

const Humanoid3DPanelLazy = dynamic(
  () => import("@/components/humanoid-3d/Humanoid3DPanel").then((m) => ({ default: m.Humanoid3DPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[272px] max-w-[220px] mx-auto items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
        A carregar vista 3D…
      </div>
    ),
  }
);

type BodyView = "illustration" | "technical" | "3d";

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
  /** Vista inicial: «technical» = diagrama ossos/malha; «illustration» = corpo suave + equipamento. */
  defaultBodyView?: "illustration" | "technical";
  /**
   * Quando true, mostra a opção «3D» (WebGL + Three.js). O chunk só é descarregado ao escolher 3D.
   * Usar só em `/dashboard/performance` e performance do coach no aluno.
   */
  allowLazyHumanoid3d?: boolean;
};

/**
 * Figura ilustrativa (2D ou 3D procedural); não representa diagnóstico nem composição corporal real.
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
  defaultBodyView = "technical",
  allowLazyHumanoid3d = false,
}: Props) {
  /** Por defeito «estrela» (braços abertos + pernas mais abertas); «Guarda» mantém a pose típica da modalidade. */
  const [poseTag, setPoseTag] = useState<PoseTag>("star");
  const [bodyView, setBodyView] = useState<BodyView>(defaultBodyView);

  useEffect(() => {
    if (!allowLazyHumanoid3d && bodyView === "3d") setBodyView("technical");
  }, [allowLazyHumanoid3d, bodyView]);

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
    "Figura meramente ilustrativa a partir das circunferências registadas (não é avaliação médica nem imagem do aluno)." +
    (assessedAtLabel ? ` Dados: ${assessedAtLabel}.` : "");

  const technicalExtra =
    bodyView === "3d" && allowLazyHumanoid3d
      ? " Vista 3D (WebGL + Three.js): modelo GLB base em `/models/human-base.glb` ajustado às medidas, com fallback procedural se o ficheiro não carregar. O chunk só é descarregado ao escolheres «3D». Ilustrativo, não clínico."
      : bodyView === "technical" && !neutralReference
        ? " Vista em diagrama (malha suave + ossos + guias) proporcional aos dados da ficha; ilustrativo, não é modelo 3D nem exame clínico."
        : bodyView === "technical" && neutralReference
          ? " Diagrama de referência; com mais medidas na ficha, as proporções aproximam-se ao teu perfil."
          : "";

  const caption =
    captionOverride?.trim() ||
    (neutralReference
      ? "Silhueta de referência genérica (preenche pelo menos duas circunferências na ficha para uma figura aproximada às tuas medidas)." +
          (assessedAtLabel ? ` Ficha: ${assessedAtLabel}.` : "")
      : defaultCaption) + technicalExtra;

  return (
    <div className={className}>
      <p className="text-text-secondary" style={{ fontSize: "clamp(11px, 2.8vw, 12px)", margin: "0 0 8px 0", lineHeight: 1.45 }}>
        {caption}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {showPoseTags ? <AvatarPoseTagSelector value={poseTag} onChange={setPoseTag} /> : null}
        <div
          className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs shrink-0"
          role="group"
          aria-label="Tipo de figura"
        >
          <button
            type="button"
            className={`px-2.5 py-1.5 font-medium transition-colors ${
              bodyView === "technical"
                ? "bg-[var(--primary)] text-[var(--primary-foreground,var(--bg))]"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]/40"
            }`}
            aria-pressed={bodyView === "technical"}
            onClick={() => setBodyView("technical")}
          >
            Diagrama
          </button>
          <button
            type="button"
            className={`px-2.5 py-1.5 font-medium transition-colors ${
              bodyView === "illustration"
                ? "bg-[var(--primary)] text-[var(--primary-foreground,var(--bg))]"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]/40"
            }`}
            aria-pressed={bodyView === "illustration"}
            onClick={() => setBodyView("illustration")}
          >
            Ilustração
          </button>
          {allowLazyHumanoid3d ? (
            <button
              type="button"
              className={`px-2.5 py-1.5 font-medium transition-colors ${
                bodyView === "3d"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground,var(--bg))]"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]/40"
              }`}
              aria-pressed={bodyView === "3d"}
              onClick={() => setBodyView("3d")}
            >
              3D
            </button>
          ) : null}
        </div>
      </div>
      {bodyView === "3d" && allowLazyHumanoid3d ? (
        <Humanoid3DPanelLazy scales={scales} pose={pose} className="max-w-[min(220px,88vw)]" />
      ) : bodyView === "technical" ? (
        <TechnicalRigSvg scales={scales} pose={pose} className="max-w-[min(220px,88vw)]" />
      ) : (
        <Avatar modality={modality} measurements={measurements} poseTag={poseTag} className="max-w-[min(220px,88vw)]" />
      )}
    </div>
  );
}
