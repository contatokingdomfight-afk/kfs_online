import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Target,
  Gauge,
  Scale,
  Activity,
  HeartPulse,
  Dumbbell,
  BookOpen,
  ChevronRight,
  PlayCircle,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getPlanAccess } from "@/lib/plan-access";
import { getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { normalizeModalityCode } from "@/lib/modality-normalize";
import { getAccessibleLibraryCoursesForStudent } from "@/lib/accessible-library-courses";
import { BENCHMARK_PRESETS } from "@/lib/benchmark-presets";
import { PAIN_REGIONS } from "@/lib/pain-regions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Treino | KFS",
};

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(ymd: string, pt: boolean): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(pt ? "pt-PT" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

function StatTile({
  href,
  icon,
  iconBg,
  iconFg,
  label,
  value,
  hint,
}: {
  href: string;
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit", minHeight: 120 }}
    >
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 20, fontWeight: 800, marginTop: 2 }}>{value}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{hint}</span>
      </span>
    </Link>
  );
}

const CATEGORY_STYLE: Record<string, { bg: string; fg: string; pt: string; en: string }> = {
  TECHNIQUE: { bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", pt: "Técnica", en: "Technique" },
  MINDSET: { bg: "rgba(167,139,250,0.16)", fg: "#a78bfa", pt: "Mindset", en: "Mindset" },
  PERFORMANCE: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c", pt: "Performance", en: "Performance" },
};

export default async function TreinoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const pt = locale !== "en";
  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  const weekStart = getWeekStartMondayLisbon();
  const from14 = ymdDaysAgo(14);
  const from30 = ymdDaysAgo(30);

  const [
    { data: studentRow },
    { count: rpePending },
    { data: weights },
    { data: profile },
    { data: pains },
    { data: benchmarks },
    { data: wellness },
    { data: weekThemes },
    library,
  ] = await Promise.all([
    supabase.from("Student").select("primaryModality, planId").eq("id", studentId).maybeSingle(),
    supabase
      .from("Attendance")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "CONFIRMED")
      .is("rpe", null)
      .gte("occurrenceDate", from14),
    supabase.from("BodyWeightEntry").select("weightKg, recordedAt").eq("studentId", studentId).order("recordedAt", { ascending: false }).limit(2),
    supabase.from("StudentProfile").select("weightKg, weightGoalKg").eq("studentId", studentId).maybeSingle(),
    supabase
      .from("PainSelfReport")
      .select("bodyRegion, intensity, reportedAt")
      .eq("studentId", studentId)
      .gte("reportedAt", from14)
      .order("reportedAt", { ascending: false }),
    supabase.from("PhysicalBenchmarkEntry").select("benchmarkKey, value, unit, recordedAt").eq("studentId", studentId).order("recordedAt", { ascending: false }).limit(1),
    supabase.from("PreLessonWellness").select("wellnessZone").eq("studentId", studentId).gte("occurrenceDate", from30),
    supabase.from("WeekTheme").select("modality, title, description, course_id").eq("week_start", weekStart),
    getAccessibleLibraryCoursesForStudent(supabase, studentId).catch(() => ({ courses: [], primaryModality: null })),
  ]);

  const primaryModality = normalizeModalityCode((studentRow as { primaryModality?: string | null } | null)?.primaryModality ?? null);
  const hasPlan = Boolean((studentRow as { planId?: string | null } | null)?.planId);

  // Tema da semana: a modalidade principal do aluno, senão a primeira com título.
  const themes = (weekThemes ?? []).filter((w) => (w as { title?: string }).title?.trim());
  const theme =
    themes.find((w) => normalizeModalityCode((w as { modality?: string }).modality ?? null) === primaryModality) ?? themes[0] ?? null;

  // Peso: último registo (ou o do perfil) e meta.
  const latestWeight = weights?.[0] ? Number(weights[0].weightKg) : (profile as { weightKg?: number | null } | null)?.weightKg ?? null;
  const prevWeight = weights?.[1] ? Number(weights[1].weightKg) : null;
  const goal = (profile as { weightGoalKg?: number | null } | null)?.weightGoalKg ?? null;
  const weightHint =
    goal != null && latestWeight != null
      ? `${pt ? "Meta" : "Goal"}: ${Number(goal).toFixed(1).replace(".", pt ? "," : ".")} kg`
      : prevWeight != null && latestWeight != null
        ? `${latestWeight - prevWeight <= 0 ? "" : "+"}${(latestWeight - prevWeight).toFixed(1).replace(".", pt ? "," : ".")} kg`
        : pt
          ? "Regista o teu peso"
          : "Log your weight";

  // Dores nos últimos 14 dias.
  const painList = (pains ?? []) as Array<{ bodyRegion: string; intensity: number; reportedAt: string }>;
  const painLabel = (key: string) => PAIN_REGIONS.find((r) => r.key === key)?.[pt ? "labelPt" : "labelEn"] ?? key;
  const painHint = painList[0]
    ? `${painLabel(painList[0].bodyRegion)} · ${painList[0].intensity}/10`
    : pt
      ? "Sem dores registadas"
      : "No pain logged";

  // Último teste físico.
  const bench = (benchmarks?.[0] ?? null) as { benchmarkKey: string; value: number; unit: string; recordedAt: string } | null;
  const benchPreset = bench ? BENCHMARK_PRESETS.find((p) => p.key === bench.benchmarkKey) : null;

  // Prontidão pré-aula (últimos 30 dias).
  const zones = (wellness ?? []) as Array<{ wellnessZone: string }>;
  const greenPct = zones.length > 0 ? Math.round((zones.filter((z) => z.wellnessZone === "GREEN").length / zones.length) * 100) : null;

  // Biblioteca: o curso do tema primeiro, depois a modalidade principal.
  const courses = library.courses
    .slice()
    .sort((a, b) => {
      const score = (c: { id: string; modality: string | null }) =>
        (theme && c.id === (theme as { course_id?: string | null }).course_id ? -2 : 0) +
        (primaryModality && normalizeModalityCode(c.modality) === primaryModality ? -1 : 0);
      return score(a) - score(b);
    })
    .slice(0, 4);

  const pendingRpe = rpePending ?? 0;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800 }}>{pt ? "Treino" : "Training"}</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          {pt ? "Corpo, técnica e recuperação." : "Body, technique and recovery."}
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
        {/* Tema da semana */}
        <Link
          href={theme && (theme as { course_id?: string | null }).course_id ? `/dashboard/biblioteca/${(theme as { course_id: string }).course_id}` : "/dashboard/tema-semana"}
          style={{
            ...card,
            flex: "1 1 340px",
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 16,
            textDecoration: "none",
            color: "inherit",
            borderColor: theme ? "var(--primary)" : "var(--border)",
          }}
        >
          <span aria-hidden style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 14, backgroundColor: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={26} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              {pt ? "Tema da semana" : "Theme of the week"}
              {theme ? ` · ${MODALITY_LABELS[(theme as { modality: string }).modality] ?? (theme as { modality: string }).modality}` : ""}
            </span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 800, marginTop: 2 }}>
              {theme ? (theme as { title: string }).title : pt ? "Ainda sem tema esta semana" : "No theme yet this week"}
            </span>
            {theme && (theme as { description?: string | null }).description ? (
              <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                {(theme as { description: string }).description}
              </span>
            ) : null}
          </span>
          <ChevronRight size={20} color="var(--text-secondary)" aria-hidden />
        </Link>

        {/* RPE por classificar */}
        {hasPlan && planAccess.hasCheckIn && (
          <Link
            href="/dashboard/bem-estar/rpe"
            style={{
              ...card,
              flex: "1 1 260px",
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 14,
              textDecoration: "none",
              color: "inherit",
              borderColor: pendingRpe > 0 ? "var(--warning)" : "var(--border)",
            }}
          >
            <span aria-hidden style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, backgroundColor: "rgba(250,204,21,0.16)", color: "#facc15", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gauge size={24} />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>
                {pendingRpe > 0
                  ? pt
                    ? `${pendingRpe} ${pendingRpe === 1 ? "treino" : "treinos"} por classificar`
                    : `${pendingRpe} ${pendingRpe === 1 ? "session" : "sessions"} to rate`
                  : pt
                    ? "Esforço pós-treino em dia"
                    : "Post-training effort up to date"}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {pt ? "Diz ao coach quão duro foi cada treino (1–10)" : "Tell your coach how hard each session was (1–10)"}
              </span>
            </span>
            <ChevronRight size={20} color="var(--text-secondary)" aria-hidden />
          </Link>
        )}
      </div>

      {/* Corpo e recuperação */}
      <section aria-labelledby="treino-corpo" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="treino-corpo" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {pt ? "Corpo e recuperação" : "Body and recovery"}
          </h2>
          <Link href="/dashboard/bem-estar" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
            {pt ? "Ver tudo" : "See all"}
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))", gap: 10 }}>
          <StatTile
            href="/dashboard/bem-estar/peso"
            icon={<Scale size={20} />}
            iconBg="rgba(96,165,250,0.16)"
            iconFg="#60a5fa"
            label={pt ? "Peso" : "Weight"}
            value={latestWeight != null ? `${Number(latestWeight).toFixed(1).replace(".", pt ? "," : ".")} kg` : "—"}
            hint={weightHint}
          />
          <StatTile
            href="/dashboard/bem-estar/dores"
            icon={<Activity size={20} />}
            iconBg="rgba(248,113,113,0.16)"
            iconFg="#f87171"
            label={pt ? "Dores (14 dias)" : "Pain (14 days)"}
            value={String(painList.length)}
            hint={painHint}
          />
          <StatTile
            href="/dashboard/bem-estar/benchmarks"
            icon={<Dumbbell size={20} />}
            iconBg="rgba(251,146,60,0.16)"
            iconFg="#fb923c"
            label={bench && benchPreset ? (pt ? benchPreset.labelPt : benchPreset.labelEn) : pt ? "Testes físicos" : "Benchmarks"}
            value={bench ? `${bench.value} ${bench.unit}` : "—"}
            hint={bench ? formatShortDate(bench.recordedAt, pt) : pt ? "Regista um teste" : "Log a test"}
          />
          <StatTile
            href="/dashboard/bem-estar"
            icon={<HeartPulse size={20} />}
            iconBg="rgba(74,222,128,0.16)"
            iconFg="#4ade80"
            label={pt ? "Pronto para treinar" : "Ready to train"}
            value={greenPct != null ? `${greenPct}%` : "—"}
            hint={
              greenPct != null
                ? pt
                  ? `dos check-ins (30 dias)`
                  : `of check-ins (30 days)`
                : pt
                  ? "Responde ao marcar presença"
                  : "Answer when checking in"
            }
          />
        </div>
      </section>

      {/* Biblioteca */}
      <section aria-labelledby="treino-biblioteca" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="treino-biblioteca" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {pt ? "Para treinares em casa" : "Train at home"}
          </h2>
          <Link href="/dashboard/biblioteca" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
            {pt ? "Abrir biblioteca" : "Open library"}
          </Link>
        </div>
        {courses.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            {courses.map((c) => {
              const cat = CATEGORY_STYLE[c.category] ?? { bg: "var(--bg)", fg: "var(--text-secondary)", pt: c.category, en: c.category };
              const isThemeCourse = theme && c.id === (theme as { course_id?: string | null }).course_id;
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/biblioteca/${c.id}`}
                  style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
                >
                  <span aria-hidden style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 12, backgroundColor: cat.bg, color: cat.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PlayCircle size={26} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                      {isThemeCourse ? (pt ? "Tema da semana · " : "Theme of the week · ") : ""}
                      {pt ? cat.pt : cat.en}
                      {c.modality ? ` · ${MODALITY_LABELS[c.modality] ?? c.modality}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <Link href="/dashboard/biblioteca" style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
            <BookOpen size={22} color="var(--primary)" aria-hidden />
            <span style={{ flex: 1, fontSize: 14 }}>
              {pt ? "Explora os vídeos e cursos da biblioteca." : "Explore the library videos and courses."}
            </span>
            <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
          </Link>
        )}
      </section>

      {hasPlan && (
        <Link href="/dashboard/tema-semana" style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
          <CalendarDays size={20} color="var(--text-secondary)" aria-hidden />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{pt ? "Temas do mês, dia a dia" : "This month's themes, day by day"}</span>
          <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
        </Link>
      )}
    </div>
  );
}
