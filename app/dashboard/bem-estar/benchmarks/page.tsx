import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { BenchmarkForm } from "./BenchmarkForm";
import { BENCHMARK_PRESETS } from "@/lib/benchmark-presets";

export const metadata = {
  title: "Benchmarks | KFS",
};

export default async function BenchmarksPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("PhysicalBenchmarkEntry")
    .select("benchmarkKey, value, unit, recordedAt, notes")
    .eq("studentId", studentId)
    .order("recordedAt", { ascending: false })
    .limit(40);

  const rows = (entries ?? []) as Array<{
    benchmarkKey: string;
    value: number;
    unit: string;
    recordedAt: string;
    notes: string | null;
  }>;

  const label = (key: string) => {
    const p = BENCHMARK_PRESETS.find((x) => x.key === key);
    if (!p) return key;
    return loc === "pt" ? p.labelPt : p.labelEn;
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/dashboard/bem-estar" style={{ color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
          ← {loc === "pt" ? "Bem-estar" : "Wellness"}
        </Link>
      </p>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Testes físicos" : "Physical benchmarks"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Regista resultados periódicos (flexões, prancha, etc.) para veres evolução ao longo do tempo."
          : "Log periodic results (push-ups, plank, etc.) to track progress over time."}
      </p>

      <BenchmarkForm locale={loc} />

      {rows.length > 0 && (
        <ul style={{ marginTop: 28, padding: 0, listStyle: "none" }}>
          {rows.map((r, i) => (
            <li
              key={`${r.benchmarkKey}-${r.recordedAt}-${i}`}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>{label(r.benchmarkKey)}</strong> · {r.value} {r.unit} ·{" "}
              {String(r.recordedAt).slice(0, 10)}
              {r.notes ? ` — ${r.notes}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
