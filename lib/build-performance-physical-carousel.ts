import type { PerformanceAvatarCarouselLabels } from "@/components/fighter/PerformanceRadarAvatarCarousel";
import {
  hasIllustrativeAnthropometry,
  normalizePhysicalFormDataJson,
  type ProfileBodyMetrics,
} from "@/lib/illustrative-body-silhouette";
import { hasAnamnesisOrNonAnthroAssessmentContent } from "@/lib/physical-assessment-content-flags";
import type { MessageKey } from "@/lib/i18n";

export type { ProfileBodyMetrics };

export type PhysicalAvatarCarouselPayload = {
  formData: unknown;
  assessedAt: string;
  silhouettePersonalized: boolean;
  labels: PerformanceAvatarCarouselLabels;
  profileBodyMetrics?: ProfileBodyMetrics | null;
  /** Sem linha de avaliação física na plataforma — 2.º painel mostra convite (esqueleto + CTA). */
  invitePhysicalAssessment: boolean;
  /** Destino do botão «agendar / renovar» no convite. */
  inviteScheduleHref: string;
  locale: "pt" | "en";
};

export type BuildPhysicalAvatarCarouselOptions = {
  perspective?: "student" | "coach";
  hasPhysicalAssessmentFromPlatform?: boolean;
  profileBodyMetrics?: ProfileBodyMetrics | null;
  inviteScheduleHref?: string;
  locale?: "pt" | "en";
};

/**
 * Payload do 2.º painel (mapa corporal) na performance.
 */
export function buildPhysicalAvatarCarouselForStudentView(
  t: (key: MessageKey) => string,
  lastPhysRow: { assessedAt: string | Date; formData?: unknown } | null | undefined,
  options?: BuildPhysicalAvatarCarouselOptions
): PhysicalAvatarCarouselPayload {
  const perspective = options?.perspective ?? "student";
  const locale = options?.locale ?? "pt";
  const inviteScheduleHref = options?.inviteScheduleHref ?? "/dashboard/performance";

  const hasRowPayload = lastPhysRow != null;
  const datasetSaysPhysical = Boolean(options?.hasPhysicalAssessmentFromPlatform);
  const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastPhysRow?.formData ?? null);
  const hasAnthro = normalizedPhysicalForm != null && hasIllustrativeAnthropometry(normalizedPhysicalForm);
  const assessedAtStr = hasRowPayload ? String(lastPhysRow.assessedAt).slice(0, 10) : "";
  const hasAnamnesis =
    normalizedPhysicalForm != null && hasAnamnesisOrNonAnthroAssessmentContent(normalizedPhysicalForm);

  const invitePhysicalAssessment = !hasRowPayload && !datasetSaysPhysical;

  const noFichaCaption =
    perspective === "coach" ? t("perfAvatarNoFichaCaptionCoach") : t("perfAvatarNoFichaCaption");

  const anomalyCaption =
    perspective === "coach"
      ? t("perfAvatarPhysicalRegisteredAnomalyCoach")
      : t("perfAvatarPhysicalRegisteredAnomaly");

  let slideBodyCaption: string;
  let studentAvatarCaption: string;

  if (invitePhysicalAssessment) {
    slideBodyCaption = t("perfCarouselSlideBodyCaptionNoFicha");
    studentAvatarCaption = noFichaCaption;
  } else if (hasAnthro) {
    slideBodyCaption = t("perfCarouselSlideBodyCaption");
    studentAvatarCaption = t("perfAvatarStudentCaption").replace("{date}", assessedAtStr);
  } else if (hasRowPayload) {
    if (hasAnamnesis) {
      slideBodyCaption = t("perfCarouselSlideBodyAnamnesis");
      studentAvatarCaption = t("perfAvatarAnamnesisNoAnthroCaption").replace("{date}", assessedAtStr);
    } else {
      slideBodyCaption = t("perfCarouselSlideBodyCaptionNeutral");
      studentAvatarCaption = t("perfAvatarNeutralCaption").replace("{date}", assessedAtStr);
    }
  } else if (datasetSaysPhysical) {
    slideBodyCaption = t("perfCarouselSlideBodyCaptionNeutral");
    studentAvatarCaption = anomalyCaption;
  } else {
    slideBodyCaption = t("perfCarouselSlideBodyCaptionNoFicha");
    studentAvatarCaption = noFichaCaption;
  }

  const swipeHint = "";

  return {
    formData: hasAnthro ? normalizedPhysicalForm : (normalizedPhysicalForm ?? {}),
    assessedAt: assessedAtStr,
    silhouettePersonalized: hasAnthro,
    profileBodyMetrics: options?.profileBodyMetrics ?? null,
    invitePhysicalAssessment,
    inviteScheduleHref,
    locale: locale as "pt" | "en",
    labels: {
      sectionTitle: t("perfCarouselSectionTitle"),
      slideRadarCaption: t("perfCarouselSlideRadarCaption"),
      slideBodyCaption,
      swipeHint,
      ariaPrev: t("dashboardCarouselPrev"),
      ariaNext: t("dashboardCarouselNext"),
      studentAvatarCaption,
      bodyMapDisclaimerTipAria: t("perfInfoTipAriaBodyMapDisclaimer"),
    },
  };
}
