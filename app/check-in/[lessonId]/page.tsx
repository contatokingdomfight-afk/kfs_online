import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPlanAccess } from "@/lib/plan-access";
import { getMonthlyCheckInLimit } from "@/lib/monthly-checkin-limit";
import { resolveOccurrenceYmd } from "@/lib/resolve-check-in-occurrence";
import { SCHOOL_PUBLIC_CONTACT } from "@/lib/school-contact";
import { CheckInFlow } from "./CheckInFlow";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

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

  const referenceMonth = occ.ymd.slice(0, 7);
  let usingDropInCreditsOnly = false;

  if (!planAccess.hasCheckIn && !isOpenClass) {
    const dropInMonthly = await getMonthlyCheckInLimit(supabase, studentId, 0, referenceMonth, lessonId);
    if ((dropInMonthly.remaining ?? 0) <= 0) {
      return (
        <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
          <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
            {t("checkIn")}
          </h1>
          <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
            {locale === "pt"
              ? "Não tens aulas avulsas disponíveis este mês. Fala com a secretaria."
              : "You have no drop-in classes available this month. Please contact the front desk."}
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            {t("goToDashboard")}
          </Link>
        </div>
      );
    }
    usingDropInCreditsOnly = true;
  }

  let monthlyLimit: { used: number; limit: number; remaining: number } | null = null;
  if (planAccess.maxCheckInsPerMonth !== null && !usingDropInCreditsOnly) {
    const monthly = await getMonthlyCheckInLimit(
      supabase,
      studentId,
      planAccess.maxCheckInsPerMonth,
      referenceMonth,
      lessonId
    );
    if (monthly.limit !== null) {
      monthlyLimit = { used: monthly.used, limit: monthly.limit, remaining: monthly.remaining ?? 0 };
    }
    if ((monthly.remaining ?? 0) <= 0) {
      const digits = SCHOOL_PUBLIC_CONTACT.phone.replace(/\D/g, "");
      const waMessage =
        locale === "pt"
          ? "Olá! Já usei as aulas do meu plano este mês e gostaria de adicionar mais aulas."
          : "Hi! I've used up my plan's classes for this month and would like to add more classes.";
      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(waMessage)}`;
      return (
        <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
          <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
            {t("checkIn")}
          </h1>
          <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
            {locale === "pt"
              ? `Já usaste as ${monthly.limit} aulas do teu plano este mês.`
              : `You've already used your plan's ${monthly.limit} classes this month.`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              {locale === "pt" ? "Fale connosco no WhatsApp" : "Message us on WhatsApp"}
            </a>
            <Link href="/dashboard" className="btn btn-secondary">
              {t("goToDashboard")}
            </Link>
          </div>
        </div>
      );
    }
  } else if (usingDropInCreditsOnly) {
    const dropInMonthly = await getMonthlyCheckInLimit(supabase, studentId, 0, referenceMonth, lessonId);
    if (dropInMonthly.limit !== null) {
      monthlyLimit = {
        used: dropInMonthly.used,
        limit: dropInMonthly.limit,
        remaining: dropInMonthly.remaining ?? 0,
      };
    }
  }

  const { data: wellnessRow } = await supabase
    .from("PreLessonWellness")
    .select("id")
    .eq("studentId", studentId)
    .eq("lessonId", lessonId)
    .eq("occurrenceDate", occ.ymd)
    .maybeSingle();
  const wellnessDone = Boolean(wellnessRow);

  const modalityLabel = MODALITY_LABELS[(lesson as { modality: string }).modality] ?? (lesson as { modality: string }).modality;
  const startTime = String((lesson as { startTime?: string | null }).startTime ?? "").slice(0, 5);

  const labels =
    loc === "pt"
      ? {
          title: "Check-in",
          intro: "3 toques para o teu coach saber como estás hoje.",
          lessonLine: `${modalityLabel} · ${startTime}`,
          submit: "Fazer check-in",
          skip: "Fazer check-in sem responder",
          missingOne: "Falta 1 resposta — ou faz check-in sem responder.",
          missingMany: "Faltam {n} respostas — ou faz check-in sem responder.",
          alreadyDone: "Bem-estar de hoje já registado.",
          redHint: "Se estiveres em zona vermelha, a aula conta para o treino mas não para conquistas de assiduidade — para não premiar o excesso de treino.",
          successTitle: "Check-in realizado com sucesso!",
          backDashboard: "Voltar ao painel",
          thankYou: "Obrigado.",
          confirmedAt: "Presença registada às {time}.",
        }
      : {
          title: "Check-in",
          intro: "3 taps so your coach knows how you feel today.",
          lessonLine: `${modalityLabel} · ${startTime}`,
          submit: "Check in",
          skip: "Check in without answering",
          missingOne: "1 answer missing — or check in without answering.",
          missingMany: "{n} answers missing — or check in without answering.",
          alreadyDone: "Today's wellness already logged.",
          redHint: "In the red zone, the class counts for training but not for attendance badges — to avoid rewarding overtraining.",
          successTitle: "Check-in completed successfully!",
          backDashboard: "Back to dashboard",
          thankYou: "Thank you.",
          confirmedAt: "Attendance registered at {time}.",
        };

  return (
    <CheckInFlow
      lessonId={lessonId}
      occurrenceDate={occ.ymd}
      labels={labels}
      locale={loc}
      monthlyLimit={monthlyLimit}
      wellnessDone={wellnessDone}
    />
  );
}
