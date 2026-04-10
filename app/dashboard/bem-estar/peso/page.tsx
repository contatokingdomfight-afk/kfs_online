import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { WeightEntryForm, WeightGoalsForm } from "./WeightForms";

export const metadata = {
  title: "Peso | KFS",
};

export default async function PesoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";

  const supabase = await createClient();
  const [{ data: entries }, { data: profile }] = await Promise.all([
    supabase
      .from("BodyWeightEntry")
      .select("weightKg, recordedAt")
      .eq("studentId", studentId)
      .order("recordedAt", { ascending: true })
      .limit(120),
    supabase
      .from("StudentProfile")
      .select("weightGoalKg, weightGoalTargetDate")
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  const series = (entries ?? []) as Array<{ weightKg: number; recordedAt: string }>;
  const minW = series.length ? Math.min(...series.map((s) => Number(s.weightKg))) : 0;
  const maxW = series.length ? Math.max(...series.map((s) => Number(s.weightKg))) : 1;
  const span = Math.max(0.5, maxW - minW);

  const prof = profile as {
    weightGoalKg?: number | null;
    weightGoalTargetDate?: string | null;
  } | null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/dashboard/bem-estar" style={{ color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
          ← {loc === "pt" ? "Bem-estar" : "Wellness"}
        </Link>
      </p>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Peso e metas" : "Weight & goals"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Histórico de medições e meta opcional (ex.: corte de peso para competição)."
          : "Measurement history and an optional goal (e.g. competition weight cut)."}
      </p>

      {series.length > 1 && (
        <div
          style={{
            marginBottom: 24,
            padding: 12,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <h2 style={{ fontSize: "clamp(15px, 3.8vw, 17px)", margin: "0 0 12px", color: "var(--text-primary)" }}>
            {loc === "pt" ? "Tendência" : "Trend"}
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 96 }}>
            {series.slice(-40).map((s, i) => {
              const w = Number(s.weightKg);
              const h = ((w - minW) / span) * 100;
              return (
                <div
                  key={`${s.recordedAt}-${i}`}
                  title={`${w} kg · ${String(s.recordedAt).slice(0, 10)}`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    background: "var(--accent, #ED1C24)",
                    height: `${Math.max(8, h)}%`,
                    borderRadius: 2,
                    opacity: 0.85,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <WeightEntryForm locale={loc} />
        <WeightGoalsForm
          locale={loc}
          currentGoalKg={prof?.weightGoalKg != null ? Number(prof.weightGoalKg) : null}
          currentGoalDate={prof?.weightGoalTargetDate ? String(prof.weightGoalTargetDate).slice(0, 10) : null}
        />
      </div>

      {series.length > 0 && (
        <ul style={{ marginTop: 24, padding: 0, listStyle: "none" }}>
          {[...series].reverse().map((s, i) => (
            <li
              key={`${s.recordedAt}-${i}`}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>{Number(s.weightKg)} kg</strong> ·{" "}
              {String(s.recordedAt).slice(0, 10)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
