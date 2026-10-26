import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import { formatExamDate } from "@/components/graduation/ExamStatusChip";
import { AptosList, type AptoRow, type AptoState } from "./AptosList";

export type AptosFilter = "aptos" | "sem" | "todos";

const FILTERS: { value: AptosFilter; label: string }[] = [
  { value: "aptos", label: "Aptos" },
  { value: "sem", label: "Aptos sem exame marcado" },
  { value: "todos", label: "Todos" },
];

const chip = (on: boolean): React.CSSProperties => ({
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 999,
  border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
  background: on ? "var(--text-primary)" : "var(--bg-secondary)",
  color: on ? "var(--bg)" : "var(--text-secondary)",
  textDecoration: "none",
  whiteSpace: "nowrap",
});

/** Separador «Alunos aptos»: quem pode fazer exame numa modalidade, e a decisão manual do coach/admin. */
export async function AptosTab({
  supabase,
  modalities,
  modalityParam,
  filterParam,
}: {
  supabase: SupabaseClient;
  modalities: { code: string; name: string }[];
  modalityParam?: string;
  filterParam?: string;
}) {
  const { data: templates } = await supabase.from("GraduationTemplate").select("modalityCode");
  const withGraduation = new Set((templates ?? []).map((t) => t.modalityCode as string));
  const options = modalities.filter((m) => withGraduation.has(m.code));
  if (options.length === 0) {
    return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Ainda não há modalidades com graduação configurada.</p>;
  }

  const selected = options.find((m) => m.code === modalityParam) ?? options[0];
  const filter: AptosFilter = FILTERS.some((f) => f.value === filterParam) ? (filterParam as AptosFilter) : "aptos";
  const href = (m: string, f: AptosFilter) => `/coach/graduacao?tab=aptos&m=${encodeURIComponent(m)}&f=${f}`;

  const readiness = await loadModalityReadiness(supabase, selected.code);
  const rows: AptoRow[] = [];
  for (const s of readiness?.students ?? []) {
    const { progress } = s;
    if (!progress.next) continue;
    const manual = progress.manualReadiness;
    const state: AptoState = manual?.status === "READY" ? "manual" : manual?.status === "NOT_READY" ? "blocked" : progress.isReadyForExam ? "auto" : "no";
    const pending = progress.checks.filter((c) => c.status === "pending").map((c) => c.label);
    rows.push({
      studentId: s.studentId,
      name: s.name,
      modalityCode: selected.code,
      nextName: progress.next.name,
      nextColors: progress.next.colors,
      state,
      detail: manual ? manual.reason : state === "no" ? pending.slice(0, 3).join(" · ") || null : null,
      booking: s.activeConvocation ? formatExamDate(s.activeConvocation.slotStartsAt ?? s.activeConvocation.scheduledAt) : null,
    });
  }

  const isApto = (r: AptoRow) => r.state === "auto" || r.state === "manual";
  const visible = rows.filter((r) => (filter === "todos" ? true : filter === "sem" ? isApto(r) && !r.booking : isApto(r)));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-2)" }} aria-label="Modalidade">
        {options.map((m) => (
          <Link key={m.code} href={href(m.code, filter)} style={chip(m.code === selected.code)}>
            {m.name}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-3)" }} aria-label="Filtro">
        {FILTERS.map((f) => (
          <Link key={f.value} href={href(selected.code, f.value)} style={chip(f.value === filter)}>
            {f.label}
          </Link>
        ))}
      </div>
      <AptosList rows={visible} />
    </div>
  );
}
