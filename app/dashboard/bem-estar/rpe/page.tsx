import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPlanAccess } from "@/lib/plan-access";
import { RpeQuickForm } from "./RpeQuickForm";

export const metadata = {
  title: "RPE pós-treino | KFS",
};

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function RpePage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";
  const t = getTranslations(loc);

  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  const from = ymdDaysAgo(14);

  const { data: rows } = await supabase
    .from("Attendance")
    .select("id, occurrenceDate, lessonId")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED")
    .is("rpe", null)
    .gte("occurrenceDate", from)
    .order("occurrenceDate", { ascending: false });

  const att = (rows ?? []) as Array<{ id: string; occurrenceDate: string; lessonId: string }>;
  const lessonIds = [...new Set(att.map((a) => a.lessonId))];
  const { data: lessons } =
    lessonIds.length > 0
      ? await supabase.from("Lesson").select("id, modality").in("id", lessonIds)
      : { data: [] as { id: string; modality: string }[] };
  const modByLesson = new Map((lessons ?? []).map((l) => [l.id as string, l.modality as string]));

  const pageTitle = loc === "pt" ? "Esforço percebido (RPE)" : "Perceived effort (RPE)";
  const pageIntro =
    loc === "pt"
      ? "Após o treino, classifica o esforço de 1 (muito leve) a 10 (máximo). Usa as aulas recentes abaixo."
      : "After training, rate effort from 1 (very light) to 10 (maximum). Use the recent classes below.";

  return (
    <>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {pageTitle}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>{pageIntro}</p>

      {att.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "clamp(20px, 5vw, 24px)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(16px, 4vw, 18px)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("rpeEmptyTitle")}
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {t("rpeEmptyWhy")}
          </p>
          <p style={{ margin: "0 0 20px", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {t("rpeEmptyWhatNext")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            {planAccess.hasCheckIn ? (
              <Link href="/dashboard/historico" className="btn btn-primary" style={{ textDecoration: "none" }}>
                {t("rpeEmptyCtaAttendance")}
              </Link>
            ) : (
              <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>
                {t("rpeEmptyCtaHome")}
              </Link>
            )}
            {planAccess.hasCheckIn ? (
              <Link
                href="/dashboard"
                style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                {t("rpeEmptyCtaHome")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        att.map((a) => {
          const mod = modByLesson.get(a.lessonId) ?? "";
          const modalityLabel = MODALITY_LABELS[mod] ?? mod;
          const occ = String(a.occurrenceDate).slice(0, 10);
          return (
            <RpeQuickForm
              key={a.id}
              attendanceId={a.id}
              modalityLabel={modalityLabel}
              occurrenceDate={occ}
              saveLabel={loc === "pt" ? "Guardar RPE" : "Save RPE"}
              weightLabel={loc === "pt" ? "Peso (kg)" : "Weight (kg)"}
              weightOptionalHint={
                loc === "pt"
                  ? "Opcional: peso após o treino (ajuda a estimar perda de líquido por sessão)."
                  : "Optional: post-training weight (helps estimate fluid loss per session)."
              }
            />
          );
        })
      )}
    </>
  );
}
