import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPlanAccess } from "@/lib/plan-access";
import { checkIn } from "@/app/dashboard/actions";

type Props = { params: Promise<{ lessonId: string }> };

export default async function CheckInPage({ params }: Props) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    redirect(`/sign-in?next=${encodeURIComponent(`/check-in/${lessonId}`)}`);
  }

  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);
  if (studentId && !planAccess.hasCheckIn) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("checkIn")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
          {locale === "pt" ? "O teu plano não inclui check-in de aulas presenciais." : "Your plan does not include in-person class check-in."}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("goToDashboard")}
        </Link>
      </div>
    );
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
    .select("id, modality, date, startTime, endTime")
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

  const result = await checkIn(lessonId);

  if (result.error) {
    return (
      <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
          {t("checkIn")}
        </h1>
        <p className="text-mobile-base" style={{ color: "var(--danger)", marginBottom: 24 }}>
          {result.error}
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("goToDashboard")}
        </Link>
      </div>
    );
  }

  const timeStr = result.checkedInAt
    ? new Date(result.checkedInAt).toLocaleTimeString(locale === "en" ? "en-GB" : "pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
      <h1 className="text-mobile-lg" style={{ color: "var(--success)", marginBottom: 12 }}>
        {t("checkInConfirmed")}
      </h1>
      <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
        {timeStr ? t("checkInConfirmedAt").replace("{time}", timeStr) : t("presenceRegisteredSuccess")}
      </p>
      <p className="text-mobile-sm" style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        {t("thankYou")}
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        {t("backToDashboard")}
      </Link>
    </div>
  );
}
