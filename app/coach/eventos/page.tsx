import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { fetchCoachUpcomingEvents, fetchSchoolCheckInEventIds } from "@/lib/coach-upcoming-events";
import { CoachEventosBoard } from "./CoachEventosBoard";

export default async function CoachEventosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN" && dbUser.role !== "ALUNO") redirect("/dashboard");

  const supabase = await createClient();
  const assistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (dbUser.role === "ALUNO" && !assistant) redirect("/coach");

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const events = await fetchCoachUpcomingEvents(supabase);
  const schoolCheckInEventIds =
    assistant != null
      ? [...(await fetchSchoolCheckInEventIds(supabase, assistant.schoolId))]
      : [];

  return (
    <div style={{ maxWidth: "min(640px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/coach" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
        ← {t("navHome")}
      </Link>
      <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("navEvents")}
      </h1>
      {assistant ? (
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("coachEventsSchoolCheckInHint")}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("coachEventsCoachHint")}
        </p>
      )}

      <CoachEventosBoard events={events} locale={locale as "pt" | "en"} schoolCheckInEventIds={schoolCheckInEventIds} />
    </div>
  );
}
