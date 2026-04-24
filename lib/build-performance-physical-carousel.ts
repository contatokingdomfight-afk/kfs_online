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
  /** Altura/peso do perfil do aluno para escala fina da silhueta (opcional). */
  profileBodyMetrics?: ProfileBodyMetrics | null;
};

export type BuildPhysicalAvatarCarouselOptions = {
  /** Vista coach: textos na 3.ª pessoa quando ainda não há ficha na plataforma. */
  perspective?: "student" | "coach";
  /**
   * `true` quando existe linha em `StudentPhysicalAssessment` para o aluno (ex.: query de conquistas),
   * mesmo que a query principal com `formData` não devolva linha — evita mensagem «sem ficha» incorreta.
   */
  hasPhysicalAssessmentFromPlatform?: boolean;
  profileBodyMetrics?: ProfileBodyMetrics | null;
};

/**
 * Payload do 2.º painel (silhueta) na performance.
 * Sempre devolve um objeto válido: com ficha + antropometria → personalizado; com ficha sem medidas → neutro;
 * sem ficha na plataforma → silhueta de referência + texto a pedir registo / completar ficha.
 */
export function buildPhysicalAvatarCarouselForStudentView(
  t: (key: MessageKey) => string,
  lastPhysRow: { assessedAt: string | Date; formData?: unknown } | null | undefined,
  options?: BuildPhysicalAvatarCarouselOptions
): PhysicalAvatarCarouselPayload {
  const perspective = options?.perspective ?? "student";
  const hasRowPayload = lastPhysRow != null;
  const datasetSaysPhysical = Boolean(options?.hasPhysicalAssessmentFromPlatform);
  const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastPhysRow?.formData ?? null);
  const hasAnthro = normalizedPhysicalForm != null && hasIllustrativeAnthropometry(normalizedPhysicalForm);
  const assessedAtStr = hasRowPayload ? String(lastPhysRow.assessedAt).slice(0, 10) : "";
  const hasAnamnesis =
    normalizedPhysicalForm != null && hasAnamnesisOrNonAnthroAssessmentContent(normalizedPhysicalForm);

  const noFichaCaption =
    perspective === "coach" ? t("perfAvatarNoFichaCaptionCoach") : t("perfAvatarNoFichaCaption");

  /** Sem linha completa mas a plataforma indica ficha — não dizer «sem ficha». */
  const anomalyCaption =
    perspective === "coach"
      ? t("perfAvatarPhysicalRegisteredAnomalyCoach")
      : t("perfAvatarPhysicalRegisteredAnomaly");

  let slideBodyCaption: string;
  let studentAvatarCaption: string;

  if (hasAnthro) {
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

  return {
    formData: hasAnthro ? normalizedPhysicalForm : (normalizedPhysicalForm ?? {}),
    assessedAt: assessedAtStr,
    silhouettePersonalized: hasAnthro,
    profileBodyMetrics: options?.profileBodyMetrics ?? null,
    labels: {
      sectionTitle: t("perfCarouselSectionTitle"),
      slideRadarCaption: t("perfCarouselSlideRadarCaption"),
      slideBodyCaption,
      swipeHint: "",
      ariaPrev: t("dashboardCarouselPrev"),
      ariaNext: t("dashboardCarouselNext"),
      studentAvatarCaption,
      studentAvatarCaptionShort: hasAnthro
        ? t("perfAvatarCaptionShortPersonalized")
        : t("perfAvatarCaptionShortGeneric"),
      humanoid3dFootnoteShort: t("perfHumanoid3dFootnoteShort"),
      humanoid3dFootnoteDetail: t("perfHumanoid3dFootnoteDetail"),
      infoTipAriaSilhouette: t("perfInfoTipAriaSilhouette"),
      infoTipAriaHumanoid3d: t("perfInfoTipAriaHumanoid3d"),
    },
  };
}
