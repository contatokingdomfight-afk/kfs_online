import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { PainForm } from "./PainForm";
import { PAIN_REGIONS } from "@/lib/pain-regions";

export const metadata = {
  title: "Dores | KFS",
};

export default async function DoresPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";

  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("PainSelfReport")
    .select("id, bodyRegion, intensity, notes, reportedAt, createdAt")
    .eq("studentId", studentId)
    .order("reportedAt", { ascending: false })
    .limit(60);

  const list = (reports ?? []) as Array<{
    id: string;
    bodyRegion: string;
    intensity: number;
    notes: string | null;
    reportedAt: string;
  }>;

  const labelFor = (key: string) =>
    PAIN_REGIONS.find((r) => r.key === key)?.[loc === "pt" ? "labelPt" : "labelEn"] ?? key;

  const chart = [...list]
    .filter((r) => r.reportedAt)
    .slice(0, 21)
    .reverse();
  const maxI = Math.max(10, ...chart.map((c) => c.intensity));

  return (
    <>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Dores e desconfortos" : "Pain & discomfort"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Registo rápido para acompanhares padrões com o teu coach. Não substitui avaliação médica."
          : "Quick log to track patterns with your coach. Not a substitute for medical advice."}
      </p>

      <PainForm locale={loc} />

      {chart.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", marginBottom: 12, color: "var(--text-primary)" }}>
            {loc === "pt" ? "Últimos registos (intensidade)" : "Recent entries (intensity)"}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 100,
              padding: "8px 0",
            }}
          >
            {chart.map((r) => (
              <div
                key={r.id}
                title={`${labelFor(r.bodyRegion)} · ${r.intensity}`}
                style={{
                  flex: 1,
                  minWidth: 8,
                  background: "var(--accent, #ED1C24)",
                  height: `${(r.intensity / maxI) * 100}%`,
                  minHeight: 4,
                  borderRadius: 2,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {list.length > 0 && (
        <ul style={{ marginTop: 24, padding: 0, listStyle: "none" }}>
          {list.map((r) => (
            <li
              key={r.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>{labelFor(r.bodyRegion)}</strong> · {r.intensity}/10 ·{" "}
              {String(r.reportedAt).slice(0, 10)}
              {r.notes ? ` — ${r.notes}` : ""}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
