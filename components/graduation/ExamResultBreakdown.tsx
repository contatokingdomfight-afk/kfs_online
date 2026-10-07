import { CheckCircle2, Star, XCircle } from "lucide-react";
import type { ExamResult } from "@/lib/graduation/exam";
import { GRADUATION_AXES, GRADUATION_AXIS_META, type GraduationAxis } from "@/lib/graduation/template";

export type ExamScoreRowView = {
  scoreKey: string;
  examinerUserId: string;
  section: "NEW" | "REVIEW_ITEM" | "REVIEW_AXIS";
  axis: GraduationAxis;
  label: string;
  isCritical: boolean;
  score: number | null;
  comment: string | null;
};

const fmt = (n: number | null) => (n == null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/**
 * Resultado de um exame: resumo por eixo e notas item a item (média entre avaliadores) com comentários.
 * Usa os textos gravados com as notas — não depende do template atual.
 */
export function ExamResultBreakdown({
  result,
  rows,
  examinerNames,
  keyOrder,
}: {
  result: ExamResult;
  rows: ExamScoreRowView[];
  /** Ordem das entradas (chaves da ficha); as que não constarem vão para o fim. */
  keyOrder?: string[];
  /** Quando passado, mostra o nome de quem escreveu cada comentário (vista do treinador). */
  examinerNames?: Map<string, string>;
}) {
  const byKey = new Map<string, { row: ExamScoreRowView; scores: number[]; comments: { by: string; text: string }[] }>();
  for (const r of rows) {
    const entry = byKey.get(r.scoreKey) ?? { row: r, scores: [], comments: [] };
    if (r.score != null) entry.scores.push(r.score);
    if (r.comment) entry.comments.push({ by: r.examinerUserId, text: r.comment });
    byKey.set(r.scoreKey, entry);
  }
  const entries = [...byKey.values()].map((e) => ({
    ...e,
    avg: e.scores.length ? Math.round((e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10) / 10 : null,
  }))
  if (keyOrder) {
    const pos = new Map(keyOrder.map((k, i) => [k, i]));
    entries.sort((a, b) => (pos.get(a.row.scoreKey) ?? Infinity) - (pos.get(b.row.scoreKey) ?? Infinity));
  }

  const sections: { title: string; filter: (s: ExamScoreRowView["section"]) => boolean }[] = [
    { title: "Conteúdo novo", filter: (s) => s === "NEW" },
    { title: "Graus anteriores", filter: (s) => s === "REVIEW_AXIS" || s === "REVIEW_ITEM" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="card" style={{ padding: "var(--space-3)" }}>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          Mínimo para aprovar: {fmt(result.passMin)} em cada eixo (itens novos, grau anterior e revisão) e nos itens fundamentais.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-2)" }}>
          {result.axes.map((a) => {
            const failed = a.newPassed === false || a.prevPassed === false || a.reviewPassed === false;
            return (
              <div key={a.axis} style={{ border: `1px solid ${failed ? "var(--danger)" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "8px 10px", background: "var(--bg)" }}>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden>{GRADUATION_AXIS_META[a.axis].emoji}</span> {GRADUATION_AXIS_META[a.axis].label}
                  {failed ? (
                    <XCircle size={14} aria-label="Abaixo do mínimo" style={{ color: "var(--danger)", marginLeft: "auto" }} />
                  ) : a.newPassed !== null || (a.prevPassed ?? null) !== null || a.reviewPassed !== null ? (
                    <CheckCircle2 size={14} aria-label="Cumpre o mínimo" style={{ color: "var(--success)", marginLeft: "auto" }} />
                  ) : null}
                </p>
                {a.newCount > 0 && <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Novo: {fmt(a.newAvg)}</p>}
                {(a.prevCount ?? 0) > 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Grau anterior: {fmt(a.prevAvg ?? null)}</p>
                )}
                {a.reviewPassed !== null && <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Revisão: {fmt(a.reviewScore)}</p>}
              </div>
            );
          })}
        </div>
        {result.criticalFailures.length > 0 && (
          <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
            Itens fundamentais abaixo do mínimo: {result.criticalFailures.map((c) => `${c.label} (${fmt(c.score)})`).join(", ")}
          </p>
        )}
      </div>

      {sections.map((section) => {
        const list = entries.filter((e) => section.filter(e.row.section));
        if (list.length === 0) return null;
        return (
          <section key={section.title}>
            <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 700 }}>{section.title}</h3>
            {GRADUATION_AXES.map((axis) => {
              const axisList = list.filter((e) => e.row.axis === axis);
              if (axisList.length === 0) return null;
              return (
                <div key={axis} className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "var(--text-sm)", fontWeight: 700 }}>
                    <span aria-hidden>{GRADUATION_AXIS_META[axis].emoji}</span> {GRADUATION_AXIS_META[axis].label}
                  </p>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {axisList.map((e) => {
                      const below = e.avg != null && e.avg < result.passMin;
                      return (
                        <li key={e.row.scoreKey} style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)" }}>
                              {e.row.isCritical && <Star size={12} aria-label="Item fundamental" style={{ display: "inline", marginRight: 4, color: "var(--warning)", fill: "var(--warning)" }} />}
                              {e.row.section === "REVIEW_AXIS" ? `Revisão ${GRADUATION_AXIS_META[axis].label}` : e.row.label}
                            </span>
                            <strong style={{ fontSize: "var(--text-sm)", color: below ? "var(--danger)" : "var(--text-primary)" }}>{fmt(e.avg)}</strong>
                          </div>
                          {e.comments.map((c, i) => (
                            <p key={i} style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontStyle: "italic" }}>
                              “{c.text}”{examinerNames ? ` — ${examinerNames.get(c.by) ?? "Avaliador"}` : ""}
                            </p>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
