"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MessageSquareText, Star } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { computeExamResult, EXAM_SCORE_MAX, type ExamSheet, type ExamSheetEntry } from "@/lib/graduation/exam";
import { GRADUATION_AXES, GRADUATION_AXIS_META, type GraduationAxis } from "@/lib/graduation/template";
import { saveExamScores } from "../../../actions";

type ScoreState = Record<string, { score: number | null; comment: string | null }>;

const SCORE_LABELS: Record<number, string> = {
  1: "Não executa",
  2: "Insuficiente",
  3: "Suficiente",
  4: "Bom",
  5: "Excelente",
};

type Props = {
  eventId: string;
  candidateId: string;
  studentName: string;
  sheet: ExamSheet;
  initialScores: ScoreState;
};

export function ExamScoringSheet({ eventId, candidateId, studentName, sheet, initialScores }: Props) {
  const [scores, setScores] = useState<ScoreState>(initialScores);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const router = useRouter();

  // Fila de gravação: as alterações juntam-se e seguem em lote (uma de cada vez), para não perder
  // notas com toques rápidos nem esperar uma ida ao servidor por cada nota.
  const pendingRef = useRef(new Map<string, { score: number | null; comment: string | null }>());
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myResult = useMemo(
    () =>
      computeExamResult(
        sheet,
        Object.entries(scores).map(([key, v]) => ({ key, score: v.score, examinerUserId: "me" }))
      ),
    [scores, sheet]
  );

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (inFlightRef.current) return false;
    if (pendingRef.current.size === 0) return true;
    const batch = [...pendingRef.current.entries()].map(([key, v]) => ({ key, ...v }));
    pendingRef.current.clear();
    inFlightRef.current = true;
    setSaveState("saving");
    const res = await saveExamScores(candidateId, batch).catch(() => ({ error: "Sem ligação ao servidor." }) as { error?: string });
    inFlightRef.current = false;
    if (res.error) {
      // Volta a pôr na fila o que não foi entretanto alterado de novo.
      for (const item of batch) if (!pendingRef.current.has(item.key)) pendingRef.current.set(item.key, { score: item.score, comment: item.comment });
      setError(res.error);
      setSaveState("error");
      return false;
    }
    setError(null);
    if (pendingRef.current.size > 0) return flush();
    setSaveState("saved");
    return true;
  }, [candidateId]);

  const queue = (key: string, value: { score: number | null; comment: string | null }) => {
    pendingRef.current.set(key, value);
    setSaveState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), 500);
  };

  useEffect(() => {
    if (saveState !== "pending" && saveState !== "saving" && saveState !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const setScore = (key: string, score: number) => {
    const previous = scores[key];
    // Tocar na nota já escolhida limpa-a.
    const next = { score: previous?.score === score ? null : score, comment: previous?.comment ?? null };
    setScores((s) => ({ ...s, [key]: next }));
    queue(key, next);
  };

  const setComment = (key: string, comment: string) => {
    const previous = scores[key];
    if ((previous?.comment ?? "") === comment.trim()) return;
    const next = { score: previous?.score ?? null, comment: comment.trim() || null };
    setScores((s) => ({ ...s, [key]: next }));
    queue(key, next);
  };

  const goToResult = async () => {
    // Garante que tudo foi gravado antes de sair da ficha.
    for (let i = 0; i < 20 && (pendingRef.current.size > 0 || inFlightRef.current); i++) {
      if (!(await flush()) && !inFlightRef.current) return;
      if (inFlightRef.current) await new Promise((r) => setTimeout(r, 300));
    }
    router.push(`/coach/graduacao/${eventId}/resultado/${candidateId}`);
  };

  const grade = sheet.targetGrade;
  const newByAxis = GRADUATION_AXES.map((axis) => ({ axis, entries: sheet.newEntries.filter((e) => e.axis === axis) })).filter(
    (g) => g.entries.length > 0
  );

  return (
    <div>
      <header style={{ margin: "var(--space-4) 0 var(--space-4)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700 }}>{studentName}</h1>
        <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Exame para <BeltSwatch colors={grade.colors} width={32} height={10} /> <strong style={{ color: "var(--text-primary)" }}>{grade.name}</strong>
        </p>
        <details style={{ marginTop: "var(--space-3)" }}>
          <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>Como pontuar</summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {Object.entries(SCORE_LABELS).map(([n, l]) => (
              <li key={n}>
                <strong>{n}</strong> — {l}
              </li>
            ))}
            <li>
              Para aprovar: média ≥ {formatScore(sheet.passMin)} nos itens novos e na revisão de cada eixo; itens ★ precisam de ≥ {formatScore(sheet.passMin)}{" "}
              individualmente.
            </li>
            <li>Toca de novo numa nota para a apagar. As notas são gravadas automaticamente.</li>
          </ul>
        </details>
      </header>

      {error && (
        <p role="alert" style={{ display: "flex", gap: 8, alignItems: "center", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--danger) 12%, transparent)", fontSize: "var(--text-sm)" }}>
          <AlertTriangle size={16} aria-hidden style={{ color: "var(--danger)", flexShrink: 0 }} /> {error}
        </p>
      )}

      <SectionTitle title={`Novo em ${grade.name}`} subtitle="Cada item avaliado individualmente" />
      {newByAxis.map(({ axis, entries }) => (
        <AxisBlock key={axis} axis={axis}>
          {entries.map((e) => (
            <EntryRow key={e.key} entry={e} state={scores[e.key]} passMin={sheet.passMin} onScore={setScore} onComment={setComment} />
          ))}
        </AxisBlock>
      ))}

      {sheet.reviewAxes.length > 0 && (
        <>
          <SectionTitle title="Revisão dos graus anteriores" subtitle="Uma nota por eixo sobre tudo o que foi aprendido antes" />
          {sheet.reviewAxes.map((r) => {
            const count = r.reference.reduce((s, g) => s + g.items.length, 0);
            return (
              <AxisBlock key={r.entry.key} axis={r.entry.axis}>
                <EntryRow
                  entry={{ ...r.entry, label: `Revisão ${GRADUATION_AXIS_META[r.entry.axis].label}`, description: `${count} itens de ${r.reference.length} ${r.reference.length === 1 ? "grau" : "graus"}` }}
                  state={scores[r.entry.key]}

                  passMin={sheet.passMin}
                  onScore={setScore}
                  onComment={setComment}
                />
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", padding: "4px 0" }}>
                    Ver itens de referência
                  </summary>
                  {r.reference.map((g) => (
                    <div key={g.gradeName} style={{ marginTop: 8 }}>
                      <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 700 }}>{g.gradeName}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {g.items.map((i) => i.label).join(" · ")}
                      </p>
                    </div>
                  ))}
                </details>
              </AxisBlock>
            );
          })}
        </>
      )}

      {sheet.reviewCriticalEntries.length > 0 && (
        <>
          <SectionTitle title="Itens fundamentais dos graus anteriores" subtitle="Avaliados individualmente" />
          <div className="card" style={{ padding: "var(--space-2) var(--space-3)" }}>
            {sheet.reviewCriticalEntries.map((e) => (
              <EntryRow
                key={e.key}
                entry={{ ...e, description: [e.gradeName, GRADUATION_AXIS_META[e.axis].label].filter(Boolean).join(" · ") }}
                state={scores[e.key]}
               
                passMin={sheet.passMin}
                onScore={setScore}
                onComment={setComment}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ position: "sticky", bottom: "calc(var(--space-3) + env(safe-area-inset-bottom, 0px))", marginTop: "var(--space-5)", paddingRight: 72, zIndex: 20 }}>
        <div className="card" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.35)", padding: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 120, fontSize: "var(--text-sm)", fontWeight: 600 }} role="status" aria-live="polite">
              {myResult.scoredCount}/{myResult.totalCount} avaliados
              <SaveStateLabel state={saveState} />
            </span>
            {saveState === "error" && (
              <button type="button" className="btn btn-secondary" onClick={() => void flush()}>
                Tentar de novo
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => void goToResult()} disabled={saveState === "error"}>
              {myResult.isComplete ? "Ver resultado" : "Resultado"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {myResult.axes.map((a) => {
              // Sem notas ainda = neutro (não "reprovado").
              const failed = (a.newPassed === false && a.newAvg != null) || (a.reviewPassed === false && a.reviewScore != null);
              const unknown = (a.newCount > 0 && a.newAvg == null) || (a.reviewPassed !== null && a.reviewScore == null);
              const color = failed ? "var(--danger)" : unknown ? "var(--text-secondary)" : "var(--success)";
              return (
                <span key={a.axis} style={{ fontSize: "var(--text-xs)", padding: "2px 8px", borderRadius: 999, border: `1px solid ${color}`, color }}>
                  {GRADUATION_AXIS_META[a.axis].emoji} {a.newAvg != null ? formatScore(a.newAvg) : "–"}
                  {a.reviewPassed !== null && ` · rev ${a.reviewScore != null ? formatScore(a.reviewScore) : "–"}`}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveStateLabel({ state }: { state: "idle" | "pending" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const [text, color] =
    state === "error"
      ? ["Erro ao gravar", "var(--danger)"]
      : state === "saved"
        ? ["Gravado", "var(--success)"]
        : ["A gravar…", "var(--text-secondary)"];
  return <span style={{ fontWeight: 400, color }}> · {text}</span>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ margin: "var(--space-5) 0 var(--space-3)" }}>
      <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>{title}</h2>
      <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{subtitle}</p>
    </div>
  );
}

function AxisBlock({ axis, children }: { axis: GraduationAxis; children: React.ReactNode }) {
  const meta = GRADUATION_AXIS_META[axis];
  return (
    <section className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-3)" }} aria-label={meta.label}>
      <p style={{ margin: "0 0 4px", fontSize: "var(--text-sm)", fontWeight: 700 }}>
        <span aria-hidden>{meta.emoji}</span> {meta.label}
      </p>
      {children}
    </section>
  );
}

function EntryRow({
  entry,
  state,
  passMin,
  onScore,
  onComment,
}: {
  entry: ExamSheetEntry;
  state: { score: number | null; comment: string | null } | undefined;
  passMin: number;
  onScore: (key: string, score: number) => void;
  onComment: (key: string, comment: string) => void;
}) {
  const [commentOpen, setCommentOpen] = useState(Boolean(state?.comment));
  const score = state?.score ?? null;
  const below = score != null && score < passMin;

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.35 }}>
            {entry.isCritical && <Star size={13} aria-label="Item fundamental" style={{ display: "inline", marginRight: 4, marginTop: -2, color: "var(--warning)", fill: "var(--warning)" }} />}
            {entry.label}
          </p>
          {entry.description && <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{entry.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setCommentOpen((o) => !o)}
          aria-label="Comentário"
          aria-expanded={commentOpen}
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            color: state?.comment ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          <MessageSquareText size={16} />
        </button>
      </div>
      <div role="radiogroup" aria-label={`Nota para ${entry.label}`} style={{ display: "grid", gridTemplateColumns: `repeat(${EXAM_SCORE_MAX}, 1fr)`, gap: 6, marginTop: 8 }}>
        {Array.from({ length: EXAM_SCORE_MAX }, (_, i) => i + 1).map((n) => {
          const active = score === n;
          const tone = n < passMin ? "var(--danger)" : "var(--success)";
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n} — ${SCORE_LABELS[n]}`}
              title={SCORE_LABELS[n]}
              onClick={() => onScore(entry.key, n)}
              style={{
                minHeight: 44,
                borderRadius: "var(--radius-md)",
                border: `1px solid ${active ? tone : "var(--border)"}`,
                background: active ? `color-mix(in srgb, ${tone} 22%, transparent)` : "var(--bg)",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "var(--text-base)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p style={{ margin: "4px 0 0", minHeight: 16, fontSize: "var(--text-xs)", color: below ? "var(--danger)" : "var(--text-secondary)" }}>
        {score != null ? `${SCORE_LABELS[score]}${below && entry.isCritical ? " — abaixo do mínimo num item fundamental" : ""}` : ""}
      </p>
      {commentOpen && (
        <textarea
          className="input"
          rows={2}
          defaultValue={state?.comment ?? ""}
          onBlur={(e) => onComment(entry.key, e.target.value)}
          placeholder="Comentário para o aluno (opcional)"
          aria-label={`Comentário sobre ${entry.label}`}
          style={{ marginTop: 6, fontSize: "var(--text-sm)", resize: "vertical" }}
        />
      )}
    </div>
  );
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

