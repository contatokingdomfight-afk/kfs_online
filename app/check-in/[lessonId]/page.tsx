import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPlanAccess } from "@/lib/plan-access";
import { resolveOccurrenceYmd } from "@/lib/resolve-check-in-occurrence";
import { CheckInFlow } from "./CheckInFlow";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function CheckInPage({ params, searchParams }: Props) {
  const { lessonId } = await params;
  const sp = await searchParams;
  const dateParam = typeof sp.date === "string" ? sp.date.trim().slice(0, 10) : undefined;

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const loc = locale === "en" ? "en" : "pt";

  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    const next = dateParam
      ? `/check-in/${lessonId}?date=${encodeURIComponent(dateParam)}`
      : `/check-in/${lessonId}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);
  let hasPlan = false;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).single();
    hasPlan = !!student?.planId;
  }

  if (!studentId) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("checkIn")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          {t("onlyStudentsCanCheckIn")}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("goToDashboard")}
        </Link>
      </div>
    );
  }

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, isOpenClass, weekday")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("lessonNotFound")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          {t("lessonNotFoundHint")}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("goToDashboard")}
        </Link>
      </div>
    );
  }

  const isOpenClass = Boolean((lesson as { isOpenClass?: boolean }).isOpenClass);
  if (!planAccess.hasCheckIn && !isOpenClass) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("checkIn")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
          {locale === "pt"
            ? "O teu plano não inclui check-in de aulas presenciais."
            : "Your plan does not include in-person class check-in."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          {!hasPlan && (
            <Link href="/escolher-plano" className="btn btn-primary">
              {locale === "pt" ? "Ver planos e preços" : "View plans and prices"}
            </Link>
          )}
          <Link href="/dashboard" className="btn btn-secondary">
            {t("goToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const occ = resolveOccurrenceYmd(
    {
      date: (lesson as { date?: string | null }).date ?? null,
      weekday: (lesson as { weekday?: number | null }).weekday ?? null,
    },
    { occurrenceDate: dateParam }
  );

  if (!occ.ok) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("checkIn")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
          {occ.error}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("goToDashboard")}
        </Link>
      </div>
    );
  }

  const labels =
    loc === "pt"
      ? {
          title: "Check-in e bem-estar",
          intro: "Antes de confirmar a presença, indica como te sentes hoje (ajuda o teu coach e a plataforma).",
          sleepHours: "Horas de sono (última noite)",
          sleepQuality: "Qualidade do sono",
          hydration: "Hidratação",
          hydrationYes: "Bem hidratado",
          stress: "Stress",
          fatigue: "Fadiga",
          lowHigh: "1 = pior · 5 = melhor",
          skipQuestionnaire: "Saltar questionário e só fazer check-in",
          submitWithWellness: "Confirmar presença com este registo",
          backDashboard: "Voltar ao painel",
          thankYou: "Obrigado.",
          confirmedAt: "Presença registada às {time}.",
          zoneGreen: "Verde: pronto a treinar",
          zoneYellow: "Amarelo: atenção",
          zoneRed: "Vermelho: priorizar recuperação (esta aula não conta para conquistas por assiduidade)",
          wellnessHint:
            "Se estiveres em zona vermelha, a tua presença conta para o treino, mas não para badges de assiduidade — para não premiar overtraining.",
        }
      : {
          title: "Check-in & wellness",
          intro: "Before confirming attendance, share how you feel today (helps your coach and the app).",
          sleepHours: "Sleep hours (last night)",
          sleepQuality: "Sleep quality",
          hydration: "Hydration",
          hydrationYes: "Well hydrated",
          stress: "Stress",
          fatigue: "Fatigue",
          lowHigh: "1 = worst · 5 = best",
          skipQuestionnaire: "Skip questionnaire and check in only",
          submitWithWellness: "Confirm attendance with this log",
          backDashboard: "Back to dashboard",
          thankYou: "Thank you.",
          confirmedAt: "Attendance registered at {time}.",
          zoneGreen: "Green: ready to train",
          zoneYellow: "Yellow: caution",
          zoneRed: "Red: prioritize recovery (this class won’t count toward attendance badges)",
          wellnessHint:
            "In the red zone, your class still counts for training, but not for attendance badges — to avoid rewarding overtraining.",
        };

  return <CheckInFlow lessonId={lessonId} occurrenceDate={occ.ymd} labels={labels} locale={loc} />;
}
