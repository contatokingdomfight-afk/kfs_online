import type { PerformanceAvatarCarouselLabels } from "@/components/fighter/PerformanceRadarAvatarCarousel";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import type { MessageKey } from "@/lib/i18n";

export type PhysicalAvatarCarouselPayload = {
  formData: unknown;
  assessedAt: string;
  silhouettePersonalized: boolean;
  labels: PerformanceAvatarCarouselLabels;
};

export type BuildPhysicalAvatarCarouselOptions = {
  /** Vista coach: textos na 3.ª pessoa quando ainda não há ficha na plataforma. */
  perspective?: "student" | "coach";
  /**
   * `true` quando existe linha em `StudentPhysicalAssessment` para o aluno (ex.: query de conquistas),
   * mesmo que a query principal com `formData` não devolva linha — evita mensagem «sem ficha» incorreta.
   */
  hasPhysicalAssessmentFromPlatform?: boolean;
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

  const noFichaCaption =
    perspective === "coach" ? t("perfAvatarNoFichaCaptionCoach") : t("perfAvatarNoFichaCaption");

  /** Sem linha completa mas a plataforma indica ficha — não dizer «sem ficha». */
  const anomalyCaption =
    perspective === "coach"
      ? t("perfAvatarPhysicalRegisteredAnomalyCoach")
      : t("perfAvatarPhysicalRegisteredAnomaly");

  return {
    formData: hasAnthro ? normalizedPhysicalForm : (normalizedPhysicalForm ?? {}),
    assessedAt: assessedAtStr,
    silhouettePersonalized: hasAnthro,
    labels: {
      sectionTitle: t("perfCarouselSectionTitle"),
      slideRadarCaption: t("perfCarouselSlideRadarCaption"),
      slideBodyCaption: hasAnthro
        ? t("perfCarouselSlideBodyCaption")
        : hasRowPayload || datasetSaysPhysical
          ? t("perfCarouselSlideBodyCaptionNeutral")
          : t("perfCarouselSlideBodyCaptionNoFicha"),
      swipeHint: "",
      ariaPrev: t("dashboardCarouselPrev"),
      ariaNext: t("dashboardCarouselNext"),
      studentAvatarCaption: hasAnthro
        ? t("perfAvatarStudentCaption").replace("{date}", assessedAtStr)
        : hasRowPayload
          ? t("perfAvatarNeutralCaption").replace("{date}", assessedAtStr)
          : datasetSaysPhysical
            ? anomalyCaption
            : noFichaCaption,
    },
  };
}
