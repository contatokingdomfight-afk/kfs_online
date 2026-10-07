"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { MIGRATION_REASON_LABEL, type MigrationProposal } from "@/lib/graduation/migration";
import { applyInitialGrades } from "../../actions";

export type MigrationRow = {
  studentId: string;
  name: string;
  isPrimary: boolean;
  legacyBeltName: string | null;
  legacyXp: number | null;
  qualifyingMonths: number;
  proposal: MigrationProposal;
  current: { gradeIndex: number; source: string } | null;
};

type Grade = { id: string; name: string; colors: string[] };

export function MigrationTable({ modalityCode, grades, rows }: { modalityCode: string; grades: Grade[]; rows: MigrationRow[] }) {
  const router = useRouter();
  const initial = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.studentId, r.current ? r.current.gradeIndex : r.proposal.gradeIndex])),
    [rows]
  );
  const [selected, setSelected] = useState<Record<string, number>>(initial);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Alterações face ao que está gravado (ou "sem graduação" para quem ainda não tem registo).
  const changes = rows.filter((r) => !isLocked(r) && selected[r.studentId] !== (r.current ? r.current.gradeIndex : -1));
  const visible = rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));

  const apply = () => {
    if (!window.confirm(`Aplicar ${changes.length} ${changes.length === 1 ? "alteração" : "alterações"} de grau?`)) return;
    setMessage(null);
    start(async () => {
      const res = await applyInitialGrades(
        modalityCode,
        changes.map((r) => ({ studentId: r.studentId, gradeId: selected[r.studentId] >= 0 ? grades[selected[r.studentId]].id : null }))
      );
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "success", text: `${res.applied} ${res.applied === 1 ? "grau aplicado" : "graus aplicados"}.` });
        router.refresh();
      }
    });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar aluno" aria-label="Procurar aluno" style={{ flex: "1 1 220px" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{rows.length} alunos</span>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {visible.map((r) => {
          const locked = isLocked(r);
          const value = selected[r.studentId];
          const changed = !locked && value !== (r.current ? r.current.gradeIndex : -1);
          return (
            <li key={r.studentId} className="card" style={{ padding: "var(--space-3)", borderColor: changed ? "var(--primary)" : undefined }}>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <strong style={{ fontSize: "var(--text-sm)" }}>{r.name}</strong>
                  {!r.isPrimary && <span style={{ marginLeft: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>(não é a modalidade principal)</span>}
                  <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Faixa antiga: {r.legacyBeltName ?? "—"}
                    {r.legacyXp != null && ` (${r.legacyXp} XP)`} · {r.qualifyingMonths} {r.qualifyingMonths === 1 ? "mês registado" : "meses registados"} · Proposta:{" "}
                    {r.proposal.gradeIndex >= 0 ? grades[r.proposal.gradeIndex].name : "Sem graduação"} ({MIGRATION_REASON_LABEL[r.proposal.reason].toLowerCase()})
                  </p>
                  {r.current && (
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>
                      Atual: {r.current.gradeIndex >= 0 ? grades[r.current.gradeIndex]?.name : "—"} ({sourceLabel(r.current.source)})
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BeltSwatch colors={value >= 0 ? grades[value]?.colors ?? [] : []} width={36} height={12} />
                  <select
                    className="input"
                    value={value}
                    disabled={locked}
                    onChange={(e) => setSelected((s) => ({ ...s, [r.studentId]: Number(e.target.value) }))}
                    aria-label={`Grau de ${r.name}`}
                    title={locked ? "Grau obtido em exame — não pode ser alterado aqui" : undefined}
                    style={{ width: 210 }}
                  >
                    <option value={-1}>Sem graduação</option>
                    {grades.map((g, i) => (
                      <option key={g.id} value={i}>
                        {i + 1}. {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ position: "sticky", bottom: "calc(var(--space-3) + env(safe-area-inset-bottom, 0px))", marginTop: "var(--space-4)", paddingRight: 72, zIndex: 20 }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
          <span role="status" aria-live="polite" style={{ flex: 1, minWidth: 160, fontSize: "var(--text-sm)", color: message?.kind === "error" ? "var(--danger)" : undefined }}>
            {message?.text ??
              (changes.length === 0 ? "Sem alterações por aplicar." : `${changes.length} ${changes.length === 1 ? "alteração" : "alterações"} por aplicar`)}
          </span>
          {changes.length > 0 && (
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setSelected(initial)}>
              Repor
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={pending || changes.length === 0} onClick={apply}>
            {pending ? "A aplicar…" : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Graus obtidos em exame não se alteram por migração. */
function isLocked(r: MigrationRow): boolean {
  return r.current?.source === "EXAM";
}

function sourceLabel(source: string): string {
  return source === "EXAM" ? "exame" : source === "MIGRATION" ? "migração" : "atribuição manual";
}
