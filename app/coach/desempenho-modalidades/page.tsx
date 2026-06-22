import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getCoachLessonModalities } from "@/lib/coach-modalities-scope";
import { buildSchoolModalityInsights } from "@/lib/school-modality-insights";
import { SchoolModalityInsightsView } from "@/components/school-insights/SchoolModalityInsightsView";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ modality?: string }>;

export default async function CoachDesempenhoModalidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();
  const schoolAssistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN" && !schoolAssistant) redirect("/dashboard");
  if (schoolAssistant) redirect("/coach");

  const coachId = await getCurrentCoachId();
  if (!coachId) redirect("/dashboard?message=coach-access-revoked");

  const schoolId = await getCurrentSchoolId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  if (!schoolId) {
    return <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("modalityInsightsNoSchoolCoach")}</p>;
  }

  const params = await searchParams;

  const allowedCodes = await getCoachLessonModalities(supabase, coachId);

  const { data: modalityRefs } = await supabase
    .from("ModalityRef")
    .select("code, name, sortOrder")
    .order("sortOrder", { ascending: true });

  const modalities = (modalityRefs ?? [])
    .filter((m) => allowedCodes.includes(m.code as string))
    .map((m) => ({
      code: m.code as string,
      label: (m.name as string) || MODALITY_LABELS[m.code as string] || (m.code as string),
    }));

  const selectedModality =
    params.modality && modalities.some((m) => m.code === params.modality)
      ? params.modality
      : modalities[0]?.code ?? null;

  const insights =
    selectedModality
      ? await buildSchoolModalityInsights(
          supabase,
          schoolId,
          selectedModality,
          modalities.find((m) => m.code === selectedModality)?.label ?? selectedModality
        )
      : null;

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("navHome")}
        </Link>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("navModalityInsights")}
        </h1>
      </div>

      {!selectedModality || !insights ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("modalityInsightsNoModalityCoach")}</p>
      ) : (
        <SchoolModalityInsightsView
          insights={insights}
          modalities={modalities}
          selectedModality={selectedModality}
          basePath="/coach/desempenho-modalidades"
          labels={{
            subtitle: t("modalityInsightsSubtitleCoach"),
            athletes: t("modalityInsightsAthletes"),
            evaluations: t("modalityInsightsEvaluations"),
            noData: t("modalityInsightsNoData"),
            pickModality: t("modalityInsightsNoModalityCoach"),
          }}
        />
      )}
    </div>
  );
}
