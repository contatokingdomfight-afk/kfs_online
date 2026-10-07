import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getPlanAccess } from "@/lib/plan-access";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getLeaderboardV2 } from "@/lib/leaderboard";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { summarizeXp, isXpSource, type XpSource, type XpSummaryRow } from "@/lib/xp-rules";
import { MyXpCard } from "./MyXpCard";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { displayGradeLabel, loadDisplayGrades } from "@/lib/graduation/display-grade";
import { getEvolutionLeaderboard } from "@/lib/leaderboard-evolution";
import { getBeltIndexFromXp, getBeltName } from "@/lib/belts";
import {
  parseRankAgeParam,
  parseRankModalityParam,
  parseRankModeParam,
  parseRankPeriodParam,
  rankMedal,
  rankPeriodToStartDate,
} from "@/lib/rank-filters";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { RankFiltersForm } from "./RankFiltersForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ school?: string; modality?: string; age?: string; period?: string; mode?: string }>;
};

export default async function DashboardRankPage({ searchParams }: PageProps) {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasPerformanceTracking) {
    redirect("/dashboard?message=plan-no-performance");
  }

  const [{ data: studentRow }, params] = await Promise.all([
    supabase.from("Student").select("schoolId").eq("id", studentId).single(),
    searchParams,
  ]);

  const mySchoolId = (studentRow as { schoolId?: string } | null)?.schoolId ?? "";
  if (!mySchoolId) redirect("/dashboard");

  const { data: schoolsData } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name");

  const schools = (schoolsData ?? []).map((s) => ({
    id: String(s.id),
    name: String(s.name ?? s.id),
  }));

  const schoolIds = new Set(schools.map((s) => s.id));
  const rawSchool = params.school?.trim();
  const resolvedSchoolId =
    rawSchool && schoolIds.has(rawSchool) ? rawSchool : mySchoolId;

  const modality = parseRankModalityParam(params.modality);
  const ageBucket = parseRankAgeParam(params.age);
  const period = parseRankPeriodParam(params.period);
  const mode = parseRankModeParam(params.mode);
  const periodStart = rankPeriodToStartDate(period);

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const leaderboardFilters = { schoolId: resolvedSchoolId, modality, ageBucket };

  const [xpResult, summaryRes, rulesRes, modalityRefs] =
    mode === "XP"
      ? await Promise.all([
          getLeaderboardV2(supabase, { ...leaderboardFilters, periodStart }, 200),
          supabase.rpc("get_my_xp_summary", { p_period_start: periodStart }),
          supabase.from("XpRule").select("source, xp"),
          getCachedModalityRefs(supabase),
        ])
      : [null, null, null, []];
  const modalityNames = new Map<string, string>(modalityRefs.map((m) => [m.code, m.name ?? m.code]));
  const xpSummary = summarizeXp((summaryRes?.data as XpSummaryRow[] | null) ?? []);
  const xpRules: Partial<Record<XpSource, number>> = Object.fromEntries(
    ((rulesRes?.data as { source: string; xp: number }[] | null) ?? []).filter((r) => isXpSource(r.source)).map((r) => [r.source, r.xp])
  );
  const periodLabel =
    period === "WEEK" ? t("rankPeriodWeek") : period === "MONTH" ? t("rankPeriodMonth") : period === "LAST_30D" ? t("rankPeriodLast30d") : null;

  const evolutionResult =
    mode === "EVOLUTION"
      ? await getEvolutionLeaderboard(supabase, leaderboardFilters, periodStart, calendarDateLisbon(new Date()), 100)
      : null;

  const rows = xpResult?.rows ?? [];
  const error = xpResult?.error ?? evolutionResult?.error ?? null;
  const displayGrades = rows.length ? await loadDisplayGrades(rows.map((r) => r.student_id)) : new Map();
  const me = rows.find((r) => r.is_current_user) ?? null;
  // A RPC inclui sempre o aluno; se ficou fora do top, não conta para o total listado.
  const totalRanked = me && me.rank > rows.length ? me.rank : rows.length;
  const evolutionRows = evolutionResult?.rows ?? [];
  const excludedCount = evolutionResult?.excludedCount ?? 0;

  const filterMessages = {
    filtersToggle: t("rankFiltersToggle"),
    filterSchool: t("rankFilterSchool"),
    filterModality: t("rankFilterModality"),
    filterAge: t("rankFilterAge"),
    filterAll: t("rankFilterAll"),
    filterReset: t("rankFilterReset"),
    filterLoading: t("rankFilterLoading"),
    ageKids: t("rankAgeKids"),
    ageTeens: t("rankAgeTeens"),
    ageAdults: t("rankAgeAdults"),
    ageMasters: t("rankAgeMasters"),
    modalityMuay: t("rankModalityMuay"),
    modalityBoxing: t("rankModalityBoxing"),
    modalityKick: t("rankModalityKick"),
    modalityMma: t("rankModalityMma"),
    filterPeriod: t("rankFilterPeriod"),
    periodAll: t("rankPeriodAll"),
    periodWeek: t("rankPeriodWeek"),
    periodMonth: t("rankPeriodMonth"),
    periodLast30d: t("rankPeriodLast30d"),
    filterMode: t("rankFilterMode"),
    modeXp: t("rankModeXp"),
    modeEvolution: t("rankModeEvolution"),
  };

  return (
    <div className="max-w-[min(720px,100%)] mx-auto pb-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--text-secondary)] text-sm sm:text-base font-medium no-underline hover:text-[var(--text-primary)]"
        >
          ← {t("navHome")}
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">{t("rankTitle")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{t("rankSubtitle")}</p>

      <RankFiltersForm
        schools={schools}
        defaultSchoolId={mySchoolId}
        currentSchoolId={resolvedSchoolId}
        currentModality={modality}
        currentAge={ageBucket}
        currentPeriod={period}
        currentMode={mode}
        messages={filterMessages}
      />

      {mode === "XP" && !error && (
        <MyXpCard
          summary={xpSummary}
          me={me}
          totalRanked={totalRanked}
          modality={modality}
          modalityNames={modalityNames}
          rules={xpRules}
          periodLabel={periodLabel}
          locale={locale}
        />
      )}

      {error ? (
        <div
          className="card p-4 text-sm"
          style={{ color: "var(--danger)", borderColor: "var(--border)" }}
        >
          {t("rankError")}: {error}
        </div>
      ) : mode === "XP" ? (
        rows.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("rankEmptyFiltered")}</p>
        ) : (
          <div className="card overflow-x-auto" style={{ padding: 0 }}>
            <table className="w-full text-sm border-collapse" style={{ minWidth: 280 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th
                    scope="col"
                    className="text-left py-3 px-3 font-semibold text-[var(--text-primary)]"
                    style={{ width: 56 }}
                  >
                    #
                  </th>
                  <th scope="col" className="text-left py-3 px-2 font-semibold text-[var(--text-primary)]">
                    {t("rankColName")}
                  </th>
                  <th scope="col" className="text-left py-3 px-2 font-semibold text-[var(--text-primary)] hidden sm:table-cell">
                    {t("rankColBelt")}
                  </th>
                  <th scope="col" className="text-right py-3 px-3 font-semibold text-[var(--text-primary)]">
                    {modality ? "XP" : "Pontos"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  // Grau de graduação (modalidade publicada); senão a faixa antiga por XP.
                  const grade = displayGrades.get(row.student_id);
                  const beltLabel = grade ? displayGradeLabel(grade) : getBeltName(getBeltIndexFromXp(row.legacy_xp));
                  const highlight = row.is_current_user;
                  const medal = rankMedal(row.rank);
                  return (
                    <tr
                      key={row.student_id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        backgroundColor: highlight ? "var(--bg-secondary)" : undefined,
                      }}
                    >
                      <td className="py-3 px-3 align-middle text-[var(--text-primary)] font-medium">
                        {medal ? (
                          <span style={{ fontSize: 20, lineHeight: 1 }}>
                            <span aria-hidden="true">{medal}</span>
                            <span className="sr-only">{`#${row.rank}`}</span>
                          </span>
                        ) : (
                          row.rank
                        )}
                      </td>
                      <td className="py-3 px-2 align-middle text-[var(--text-primary)]">
                        {row.display_name || "—"}
                        {highlight && (
                          <span
                            className="ml-2 text-xs font-semibold"
                            style={{ color: "var(--primary)" }}
                          >
                            ({t("rankYou")})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 align-middle text-[var(--text-secondary)] hidden sm:table-cell">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {grade && <BeltSwatch colors={grade.colors} width={22} height={8} />}
                          {beltLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-right font-semibold text-[var(--primary)]">
                        {row.score.toLocaleString(locale === "en" ? "en-GB" : "pt-PT")}
                        {!modality && (
                          <span className="block text-xs font-normal text-[var(--text-secondary)]">
                            {row.xp.toLocaleString(locale === "en" ? "en-GB" : "pt-PT")} XP
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : evolutionRows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("rankEmptyFiltered")}</p>
      ) : (
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: 280 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th scope="col" className="text-left py-3 px-3 font-semibold text-[var(--text-primary)]" style={{ width: 56 }}>
                  #
                </th>
                <th scope="col" className="text-left py-3 px-2 font-semibold text-[var(--text-primary)]">
                  {t("rankColName")}
                </th>
                <th scope="col" className="text-right py-3 px-3 font-semibold text-[var(--text-primary)]">
                  {t("rankColEvolution")}
                </th>
              </tr>
            </thead>
            <tbody>
              {evolutionRows.map((row) => {
                const highlight = row.is_current_user;
                const positive = row.delta > 0;
                const negative = row.delta < 0;
                const medal = rankMedal(row.rank);
                return (
                  <tr
                    key={row.student_id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: highlight ? "var(--bg-secondary)" : undefined,
                    }}
                  >
                    <td className="py-3 px-3 align-middle text-[var(--text-primary)] font-medium">
                      {medal ? (
                        <span style={{ fontSize: 20, lineHeight: 1 }}>
                          <span aria-hidden="true">{medal}</span>
                          <span className="sr-only">{`#${row.rank}`}</span>
                        </span>
                      ) : (
                        row.rank
                      )}
                    </td>
                    <td className="py-3 px-2 align-middle text-[var(--text-primary)]">
                      {row.display_name || "—"}
                      {highlight && (
                        <span className="ml-2 text-xs font-semibold" style={{ color: "var(--primary)" }}>
                          ({t("rankYou")})
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 px-3 align-middle text-right font-semibold"
                      style={{ color: positive ? "var(--success)" : negative ? "var(--danger)" : "var(--text-secondary)" }}
                    >
                      {positive ? "+" : ""}
                      {row.delta.toLocaleString(locale === "en" ? "en-GB" : "pt-PT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {excludedCount > 0 && (
            <p className="text-xs text-[var(--text-secondary)] p-3">
              {t("rankEvolutionExcludedNote").replace("{count}", String(excludedCount))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
