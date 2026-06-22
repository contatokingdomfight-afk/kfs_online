import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { buildSchoolModalityInsights } from "@/lib/school-modality-insights";
import { SchoolModalityInsightsView } from "@/components/school-insights/SchoolModalityInsightsView";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ school?: string; modality?: string }>;

export default async function AdminDesempenhoModalidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const params = await searchParams;

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  const schoolList = schools ?? [];
  const schoolId =
    params.school && schoolList.some((s) => s.id === params.school)
      ? params.school
      : schoolList[0]?.id ?? null;

  const { data: modalityRefs } = await supabase
    .from("ModalityRef")
    .select("code, name, sortOrder")
    .order("sortOrder", { ascending: true });

  const modalities = (modalityRefs ?? []).map((m) => ({
    code: m.code as string,
    label: (m.name as string) || MODALITY_LABELS[m.code as string] || (m.code as string),
  }));

  const selectedModality =
    params.modality && modalities.some((m) => m.code === params.modality)
      ? params.modality
      : modalities[0]?.code ?? null;

  const schoolName = schoolList.find((s) => s.id === schoolId)?.name ?? null;

  const insights =
    schoolId && selectedModality
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
          href="/admin"
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

      {schoolList.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {schoolList.map((s) => {
            const on = s.id === schoolId;
            const q = new URLSearchParams({ school: s.id });
            if (selectedModality) q.set("modality", selectedModality);
            return (
              <Link
                key={s.id}
                href={`/admin/desempenho-modalidades?${q.toString()}`}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  on
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
                ].join(" ")}
              >
                {s.name as string}
              </Link>
            );
          })}
        </div>
      ) : null}

      {!schoolId || !selectedModality || !insights ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("modalityInsightsNoSchool")}</p>
      ) : (
        <SchoolModalityInsightsView
          insights={insights}
          modalities={modalities}
          selectedModality={selectedModality}
          basePath="/admin/desempenho-modalidades"
          extraQuery={schoolId ? { school: schoolId } : {}}
          labels={{
            subtitle: t("modalityInsightsSubtitleAdmin"),
            athletes: t("modalityInsightsAthletes"),
            evaluations: t("modalityInsightsEvaluations"),
            noData: t("modalityInsightsNoData"),
            pickModality: t("modalityInsightsNoModalityCoach"),
            schoolLabel: t("modalityInsightsSchool"),
            schoolName: schoolName ?? undefined,
          }}
        />
      )}
    </div>
  );
}
