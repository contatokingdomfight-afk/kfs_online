import Link from "next/link";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import type { StudentModalityGraduation } from "@/lib/graduation/load-student-progress";

/** Cartão-resumo de uma modalidade (grau atual e progresso) — abre o detalhe dessa modalidade. */
export function ModalitySummaryCard({ graduation, active }: { graduation: StudentModalityGraduation; active: boolean }) {
  const { current, next, checks, doneCount, isReadyForExam } = graduation.progress;
  const pct = next && checks.length > 0 ? Math.round((doneCount / checks.length) * 100) : 100;
  const status = isReadyForExam
    ? "Apto para exame"
    : next
      ? checks.length > 0
        ? `${doneCount}/${checks.length} requisitos para ${next.name}`
        : `Próximo: ${next.name}`
      : "Grau máximo";

  return (
    <Link
      href={`/dashboard/graduacao?m=${encodeURIComponent(graduation.modalityCode)}`}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className="block h-full rounded-2xl border p-3 text-inherit no-underline transition-colors"
      style={{
        borderColor: active ? "var(--primary)" : "var(--border)",
        background: active ? "color-mix(in srgb, var(--primary) 8%, var(--bg-secondary))" : "var(--bg-secondary)",
      }}
    >
      <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-secondary">{graduation.modalityName}</p>
      <div className="mt-2 flex items-center gap-2">
        <BeltSwatch colors={current?.colors ?? []} width={40} height={12} />
        <span className="min-w-0 truncate text-base font-bold text-text-primary">{current?.name ?? "Sem graduação"}</span>
      </div>
      <p className={`m-0 mt-2 text-xs ${isReadyForExam ? "font-bold text-success" : "text-text-secondary"}`}>{status}</p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
        <div className={`h-full rounded-full ${isReadyForExam ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
