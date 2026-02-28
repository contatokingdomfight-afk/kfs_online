import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { syncUser } from "@/lib/auth/sync-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { markPresence } from "@/app/dashboard/actions";

type Props = { params: Promise<{ lessonId: string }> };

export default async function CheckInPage({ params }: Props) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    redirect(`/sign-in?next=${encodeURIComponent(`/check-in/${lessonId}`)}`);
  }

  const dbUser = await syncUser(supabaseUser);
  const studentId = await getCurrentStudentId();

  if (!dbUser) redirect("/sign-in");
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

  const result = await markPresence(lessonId);

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

  return (
    <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
      <h1 className="text-mobile-lg" style={{ color: "var(--text-primary)", marginBottom: 12 }}>
        {t("presenceRegistered")}
      </h1>
      <p className="text-mobile-base" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
        {t("presenceRegisteredSuccess")}
      </p>
      <p className="text-mobile-sm" style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        {t("coachWillConfirm")} {t("thankYou")}
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        {t("backToDashboard")}
      </Link>
    </div>
  );
}
