import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { filterCoachNavAreas, getCoachNavAreas, type CoachAreaId } from "@/lib/coach-sidebar-links";

export const dynamic = "force-dynamic";

const INTRO: Record<CoachAreaId, string> = {
  hoje: "",
  aulas: "Presenças, horário, timer, exames e eventos.",
  alunos: "Fichas, atletas, carga de treino e avaliações.",
  conteudo: "Tema da semana, cursos e biblioteca.",
  conta: "Financeiro, definições e a tua área de aluno.",
};

/** Página de cada área do menu do professor, com todos os atalhos dessa área. */
export default async function CoachAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaId } = await params;
  const [dbUser, locale, access, coachStudentId, supabase] = await Promise.all([
    getCurrentDbUser(),
    getLocaleFromCookies(),
    getCachedResolvedAdminAccess(),
    getCoachStudentId(),
    createClient(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const isSchoolAssistant = dbUser?.role === "ALUNO" ? Boolean(await getActiveSchoolAssistantForUserId(supabase, dbUser.id)) : false;
  const areas = filterCoachNavAreas(
    getCoachNavAreas(t, { showAdminEntry: dbUser?.role === "ADMIN", coachStudentId: coachStudentId || null, isSchoolAssistant }),
    access
  );
  const area = areas.find((a) => a.id === areaId);
  if (!area || area.id === "hoje") notFound();

  const badges: Record<string, string> = {};
  if (area.id === "alunos") {
    const { count } = await supabase
      .from("TrialClass")
      .select("id", { count: "exact", head: true })
      .eq("lessonDate", calendarDateLisbon(new Date()))
      .eq("convertedToStudent", false);
    if (count) badges["/coach/experimentais"] = `${count} hoje`;
  }

  return (
    <div style={{ maxWidth: 760, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>{area.label}</h1>
        {INTRO[area.id] ? <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{INTRO[area.id]}</p> : null}
      </header>
      <nav aria-label={area.label} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 10 }}>
        {area.items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 60, textDecoration: "none", color: "var(--text-primary)" }}
          >
            <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {it.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{it.label}</span>
              {it.hint ? <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>{it.hint}</span> : null}
            </span>
            {badges[it.href] ? (
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--primary)", whiteSpace: "nowrap" }}>
                {badges[it.href]}
              </span>
            ) : null}
            <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
