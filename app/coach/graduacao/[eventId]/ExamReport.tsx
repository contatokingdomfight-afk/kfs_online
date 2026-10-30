"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Download, Lock, Search, X } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { loadCandidateReport, type CandidateReport } from "../actions";
import type { ExamReportRow, ReportGrade } from "./report-data";

type Filter = "ALL" | ExamReportRow["status"];

const STATUS: Record<ExamReportRow["status"], { label: string; color: string }> = {
  PASSED: { label: "Aprovado", color: "var(--success)" },
  FAILED: { label: "Reprovado", color: "var(--danger)" },
  ABSENT: { label: "Faltou", color: "var(--warning)" },
  CONVOKED: { label: "Por avaliar", color: "var(--text-secondary)" },
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "PASSED", label: "Aprovados" },
  { id: "FAILED", label: "Reprovados" },
  { id: "ABSENT", label: "Faltas" },
  { id: "CONVOKED", label: "Por decidir" },
];

const fmt = (n: number | null) => (n == null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function statusLabel(r: ExamReportRow): string {
  if (r.status === "CONVOKED" && r.scored > 0) return `Em avaliação · ${r.scored}/${r.total}`;
  if (r.isPlacement && r.status === "FAILED") return "Sem grau novo";
  return STATUS[r.status].label;
}

function GradeCell({ grade, muted }: { grade: ReportGrade | null; muted?: boolean }) {
  if (!grade) return <span style={{ color: "var(--text-secondary)" }}>Sem graduação</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: muted ? "var(--text-secondary)" : undefined }}>
      <BeltSwatch colors={grade.colors} width={24} height={8} /> {grade.name}
    </span>
  );
}

/** Relatório do dia de exame: resultado, grau atual (novo se aprovado) e médias; notas do aluno em modal. */
export function ExamReport({ eventId, rows, revealLabel }: { eventId: string; rows: ExamReportRow[]; revealLabel: string | null }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === "ALL" || r.status === filter) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, filter, query]);
  const count = (s: ExamReportRow["status"]) => rows.filter((r) => r.status === s).length;
  const axisLabels = rows.find((r) => r.axes.length > 0)?.axes.map((a) => a.label) ?? [];
  const hidden = rows.some((r) => r.status !== "CONVOKED" && !r.revealed);

  const exportCsv = () => {
    const header = ["Aluno", "Horário", "Exame para", "Resultado", "Grau atual", "Grau novo", ...axisLabels];
    const lines = rows.map((r) => [
      r.name,
      r.slot ?? "",
      r.examFor,
      `${statusLabel(r)}${r.override ? " (com justificação)" : ""}`,
      r.currentGrade?.name ?? "Sem graduação",
      r.newGrade?.name ?? "",
      ...axisLabels.map((_, i) => fmt(r.axes[i]?.avg ?? null)),
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-exame.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="exam-report-kpis">
        {(
          [
            ["PASSED", "Aprovados"],
            ["FAILED", "Reprovados"],
            ["ABSENT", "Faltas"],
            ["CONVOKED", "Por decidir"],
          ] as const
        ).map(([s, label]) => (
          <div key={s} className="card" style={{ padding: "10px 12px" }}>
            <strong style={{ display: "block", fontSize: "var(--text-xl)", color: s === "CONVOKED" ? undefined : STATUS[s].color }}>{count(s)}</strong>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>

      {hidden && revealLabel && (
        <p
          style={{
            margin: "0 0 var(--space-3)",
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)",
            background: "color-mix(in srgb, var(--warning) 6%, transparent)",
          }}
        >
          <Lock size={14} aria-hidden /> Resultados escondidos dos alunos até {revealLabel}.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <div style={{ position: "relative", flex: "1 1 180px" }}>
          <Search size={15} aria-hidden style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar aluno" aria-label="Procurar aluno" style={{ paddingLeft: 34 }} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} style={{ gap: 6 }} disabled={rows.length === 0}>
          <Download size={15} aria-hidden /> Exportar CSV
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "var(--space-3)" }} role="tablist" aria-label="Filtrar por resultado">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className="exam-tab"
            style={{ borderColor: filter === f.id ? "var(--text-primary)" : "var(--border)", color: filter === f.id ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{rows.length === 0 ? "Ainda ninguém convocado para este exame." : "Nenhum aluno com este filtro."}</p>
      ) : (
        <>
          <div className="exam-report-table card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr>
                  {["Aluno", "Horário", "Resultado", "Grau atual", ...axisLabels].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px", fontSize: "var(--text-xs)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.candidateId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 10 }}>
                      <button type="button" className="exam-report-name" onClick={() => setOpenId(r.candidateId)}>
                        {r.name}
                      </button>
                      <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Exame: {r.examFor}</span>
                    </td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{r.slot ?? "—"}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                        <Pill text={statusLabel(r)} color={STATUS[r.status].color} />
                        {r.override && <Pill text="com justificação" color="var(--warning)" />}
                      </span>
                      {r.status !== "CONVOKED" && !r.revealed && (
                        <span style={{ display: "block", marginTop: 3, fontSize: 11, color: "var(--text-secondary)" }}>🔒 por revelar</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {r.newGrade ? (
                        <>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                            <BeltSwatch colors={r.newGrade.colors} width={24} height={8} /> {r.newGrade.name}
                            <span style={{ fontSize: 11, color: "var(--success)" }}>novo</span>
                          </span>
                          <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>antes: {r.currentGrade?.name ?? "sem graduação"}</span>
                        </>
                      ) : (
                        <GradeCell grade={r.currentGrade} />
                      )}
                    </td>
                    {axisLabels.map((label, i) => {
                      const a = r.axes[i];
                      return (
                        <td key={label} style={{ padding: 10, fontWeight: 700, color: a?.avg == null ? "var(--text-secondary)" : a.below ? "var(--danger)" : "var(--success)" }}>
                          {fmt(a?.avg ?? null)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="exam-report-cards">
            {visible.map((r) => (
              <li key={r.candidateId} className="card" style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <button type="button" className="exam-report-name" onClick={() => setOpenId(r.candidateId)}>
                    {r.name}
                  </button>
                  <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Pill text={statusLabel(r)} color={STATUS[r.status].color} />
                    {r.override && <Pill text="justificado" color="var(--warning)" />}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {r.slot ?? "Sem horário"} · {r.newGrade ? `${r.currentGrade?.name ?? "Sem graduação"} → ` : ""}
                  <strong style={{ color: "var(--text-primary)" }}>{(r.newGrade ?? r.currentGrade)?.name ?? "Sem graduação"}</strong>
                  {r.axes.some((a) => a.avg != null) && ` · médias ${r.axes.map((a) => fmt(a.avg)).join(" / ")}`}
                  {r.status !== "CONVOKED" && !r.revealed && " · 🔒 por revelar"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {openId && <CandidateReportModal key={openId} eventId={eventId} candidateId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function CandidateReportModal({ eventId, candidateId, onClose }: { eventId: string; candidateId: string; onClose: () => void }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; report?: CandidateReport }>({ loading: true });
  useEffect(() => {
    let cancelled = false;
    loadCandidateReport(candidateId)
      .then((r) => !cancelled && setState({ loading: false, ...r }))
      .catch(() => !cancelled && setState({ loading: false, error: "Sem ligação ao servidor." }));
    return () => {
      cancelled = true;
    };
  }, [candidateId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const r = state.report;

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 30000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={r ? `Notas de ${r.name}` : "Notas do aluno"}
        onClick={(e) => e.stopPropagation()}
        className="card exam-report-modal"
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>{r?.name ?? "A carregar…"}</h2>
            {r && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                Exame: {r.examFor}
                {r.examiners.length > 0 && ` · avaliadores: ${r.examiners.join(", ")}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {state.error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{state.error}</p>}
        {state.loading && <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>A carregar as notas…</p>}

        {r && (
          <>
            <div style={{ marginTop: 8 }}>
              <Pill text={STATUS[r.status].label} color={STATUS[r.status].color} />
            </div>
            <div className="exam-axes" style={{ marginTop: 10 }}>
              {r.axes.map((a) => (
                <div key={a.label} className="exam-axis">
                  <span>{a.label}</span>
                  <strong style={{ color: a.avg == null ? "var(--text-secondary)" : a.below ? "var(--danger)" : "var(--success)" }}>{fmt(a.avg)}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {r.sections.map((s, i) => (
                <details key={s.title} open={i === 0} style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }}>
                  <summary style={{ cursor: "pointer", padding: "9px 11px", fontSize: "var(--text-sm)", fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{s.title}</span>
                    <span style={{ fontWeight: 400, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{s.items.length} itens</span>
                  </summary>
                  {s.items.map((it) => (
                    <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 11px", borderTop: "1px solid var(--border)", fontSize: "var(--text-sm)" }}>
                      <span style={{ minWidth: 0 }}>
                        {it.critical && <span style={{ color: "var(--warning)" }}>★ </span>}
                        {it.label}
                        {it.comments.map((c, j) => (
                          <span key={j} style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 2 }}>
                            💬 {c}
                          </span>
                        ))}
                      </span>
                      <strong style={{ minWidth: 28, textAlign: "right", color: it.avg == null ? "var(--text-secondary)" : it.avg < r.passMin ? "var(--danger)" : undefined }}>
                        {fmt(it.avg)}
                      </strong>
                    </div>
                  ))}
                </details>
              ))}
            </div>

            {r.feedback && (
              <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", fontSize: "var(--text-sm)" }}>
                <strong>Feedback ao aluno</strong>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-line", color: "var(--text-secondary)" }}>{r.feedback}</p>
              </div>
            )}
            {r.overrideReason && (
              <div
                style={{
                  marginTop: 10,
                  padding: "9px 11px",
                  borderRadius: 10,
                  border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)",
                  background: "color-mix(in srgb, var(--warning) 6%, transparent)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <strong>Aprovado com justificação</strong> <span style={{ color: "var(--text-secondary)" }}>(interno)</span>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-line", color: "var(--text-secondary)" }}>{r.overrideReason}</p>
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <Link href={`/coach/graduacao/${eventId}/resultado/${candidateId}`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Abrir ficha completa
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

