"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, MessageSquareText, Star } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { computeExamResult, EXAM_SCORE_MAX, type ExamSheet, type ExamSheetEntry } from "@/lib/graduation/exam";
import { GRADUATION_AXES, GRADUATION_AXIS_META } from "@/lib/graduation/template";
import { advancePlacement, saveExamScores } from "../../../actions";

type ScoreState = Record<string, { score: number | null; comment: string | null }>;

const SCORE_LABELS: Record<number, string> = {
  1: "Não executa",
  2: "Insuficiente",
  3: "Suficiente",
  4: "Bom",
  5: "Excelente",
};

/** Notas para «Preencher o resto com…». */
const FILL_SCORES = [3, 4];

type Props = {
  eventId: string;
  candidateId: string;
  studentName: string;
  sheet: ExamSheet;
  initialScores: ScoreState;
  /** Nivelamento: ficha de cada grau avaliado (o último é o atual). */
  placement?: { levelSheets: ExamSheet[]; nextGradeName: string | null } | null;
};

/** Um separador da folha: um eixo dos itens novos, o grau anterior ou a revisão. */
type Section = {
  id: string;
  label: string;
  emoji?: string;
  subtitle: string;
  entries: ExamSheetEntry[];
  /** Referência dos graus antigos por chave de revisão (só na secção de revisão). */
  reference?: Record<string, { gradeName: string; labels: string[] }[]>;
};

function buildSections(sheet: ExamSheet, placement: Props["placement"]): Section[] {
  const current = placement?.levelSheets[placement.levelSheets.length - 1] ?? null;
  const base = current ?? sheet;
  const axisSections: Section[] = GRADUATION_AXES.flatMap((axis) => {
    const entries = base.newEntries.filter((e) => e.axis === axis);
    if (entries.length === 0) return [];
    const meta = GRADUATION_AXIS_META[axis];
    return [{ id: `new-${axis}`, label: meta.label, emoji: meta.emoji, subtitle: `Novo em ${base.targetGrade.name} · ${meta.hint}`, entries }];
  });
  if (current) return axisSections;

  const sections = [...axisSections];
  if (sheet.previousGradeName && sheet.previousEntries.length > 0) {
    sections.push({
      id: "previous",
      label: sheet.previousGradeName,
      emoji: "↩️",
      subtitle: `Grau anterior — cada item avaliado individualmente`,
      entries: sheet.previousEntries,
    });
  }
  const reviewEntries = [
    ...sheet.reviewAxes.map((r) => ({
      ...r.entry,
      label: `Revisão ${GRADUATION_AXIS_META[r.entry.axis].label}`,
      description: `${r.reference.reduce((s, g) => s + g.items.length, 0)} itens de ${r.reference.length} ${r.reference.length === 1 ? "grau" : "graus"} — uma nota para o conjunto`,
    })),
    ...sheet.reviewCriticalEntries.map((e) => ({ ...e, description: [e.gradeName, GRADUATION_AXIS_META[e.axis].label, e.description].filter(Boolean).join(" · ") })),
  ];
  if (reviewEntries.length > 0) {
    sections.push({
      id: "review",
      label: "Revisão",
      emoji: "📋",
      subtitle: "Graus mais antigos: uma nota por eixo + itens fundamentais",
      entries: reviewEntries,
      reference: Object.fromEntries(
        sheet.reviewAxes.map((r) => [r.entry.key, r.reference.map((g) => ({ gradeName: g.gradeName, labels: g.items.map((i) => i.label) }))])
      ),
    });
  }
  return sections;
}

export function ExamScoringSheet({ eventId, candidateId, studentName, sheet, initialScores, placement = null }: Props) {
  const [scores, setScores] = useState<ScoreState>(initialScores);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const router = useRouter();

  // Fila de gravação: as alterações juntam-se e seguem em lote (uma de cada vez), para não perder
  // notas com toques rápidos nem esperar uma ida ao servidor por cada nota.
  const pendingRef = useRef(new Map<string, { score: number | null; comment: string | null }>());
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No nivelamento, a barra mostra o grau a ser avaliado agora.
  const currentLevel = placement?.levelSheets[placement.levelSheets.length - 1] ?? null;
  const evaluated = currentLevel ?? sheet;
  const myResult = useMemo(
    () =>
      computeExamResult(
        evaluated,
        Object.entries(scores).map(([key, v]) => ({ key, score: v.score, examinerUserId: "me" }))
      ),
    [scores, evaluated]
  );
  const [advancing, setAdvancing] = useState(false);

  const sections = useMemo(() => buildSections(sheet, placement), [sheet, placement]);
  const [activeId, setActiveId] = useState(() => sections.find((s) => s.entries.some((e) => initialScores[e.key]?.score == null))?.id ?? sections[0]?.id);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  const passMin = evaluated.passMin;
  const topRef = useRef<HTMLDivElement>(null);

  // Barra de baixo: minimizada (só contagem e botões) ou maximizada (com as médias por eixo).
  // A escolha fica guardada neste dispositivo.
  const [barOpen, setBarOpen] = useState(false);
  useEffect(() => {
    try {
      setBarOpen(window.localStorage.getItem("exam-sheet-bar-open") === "1");
    } catch {
      /* sem armazenamento: fica minimizada */
    }
  }, []);
  const toggleBar = () =>
    setBarOpen((open) => {
      try {
        window.localStorage.setItem("exam-sheet-bar-open", open ? "0" : "1");
      } catch {
        /* ignora */
      }
      return !open;
    });

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

  /** Dá a mesma nota a todos os itens ainda sem nota da secção (depois ajustam-se as exceções). */
  const fillRest = (section: Section, score: number) => {
    const missing = section.entries.filter((e) => scores[e.key]?.score == null);
    if (missing.length === 0) return;
    const updates: ScoreState = {};
    for (const e of missing) {
      const value = { score, comment: scores[e.key]?.comment ?? null };
      updates[e.key] = value;
      pendingRef.current.set(e.key, value);
    }
    setScores((s) => ({ ...s, ...updates }));
    setSaveState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), 300);
  };

  const selectSection = (id: string) => {
    setActiveId(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Leva ao próximo item sem nota: nesta secção ou na seguinte que ainda tenha itens por avaliar. */
  const goToNextMissing = () => {
    const order = [...sections.slice(sections.indexOf(active)), ...sections.slice(0, sections.indexOf(active))];
    for (const s of order) {
      const missing = s.entries.find((e) => scores[e.key]?.score == null);
      if (!missing) continue;
      if (s.id !== active.id) setActiveId(s.id);
      // Espera o separador desenhar antes de deslizar.
      setTimeout(() => document.getElementById(`entry-${missing.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), s.id === active.id ? 0 : 60);
      return;
    }
  };

  const goToResult = async () => {
    // Garante que tudo foi gravado antes de sair da ficha.
    for (let i = 0; i < 20 && (pendingRef.current.size > 0 || inFlightRef.current); i++) {
      if (!(await flush()) && !inFlightRef.current) return;
      if (inFlightRef.current) await new Promise((r) => setTimeout(r, 300));
    }
    router.push(`/coach/graduacao/${eventId}/resultado/${candidateId}`);
  };

  const advance = async () => {
    for (let i = 0; i < 20 && (pendingRef.current.size > 0 || inFlightRef.current); i++) {
      if (!(await flush()) && !inFlightRef.current) return;
      if (inFlightRef.current) await new Promise((r) => setTimeout(r, 300));
    }
    setAdvancing(true);
    const res = await advancePlacement(candidateId).catch(() => ({ error: "Sem ligação ao servidor." }) as { error?: string });
    setAdvancing(false);
    if (res.error) setError(res.error);
    else {
      setError(null);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const grade = sheet.targetGrade;
  const missingCount = myResult.totalCount - myResult.scoredCount;
  const doneLevels = placement ? placement.levelSheets.slice(0, -1) : [];

  return (
    <div>
      <header style={{ margin: "var(--space-4) 0 var(--space-3)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700 }}>{studentName}</h1>
        {placement ? (
          <>
            <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              🧭 Nivelamento — avalia grau a grau. Podes terminar quando quiseres.
            </p>
            <ol style={{ listStyle: "none", padding: 0, margin: "var(--space-3) 0 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {placement.levelSheets.map((l, i) => {
                const current = i === placement.levelSheets.length - 1;
                return (
                  <li
                    key={l.targetGrade.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "var(--text-xs)",
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${current ? "var(--primary)" : "color-mix(in srgb, var(--success) 45%, transparent)"}`,
                      color: current ? "var(--text-primary)" : "var(--success)",
                    }}
                  >
                    {!current && "✓"} <BeltSwatch colors={l.targetGrade.colors} width={20} height={8} /> {l.targetGrade.name}
                    {current && " · a avaliar"}
                  </li>
                );
              })}
              {placement.nextGradeName && (
                <li style={{ fontSize: "var(--text-xs)", padding: "4px 10px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  🔒 {placement.nextGradeName}
                </li>
              )}
            </ol>
          </>
        ) : (
          <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Exame para <BeltSwatch colors={grade.colors} width={32} height={10} /> <strong style={{ color: "var(--text-primary)" }}>{grade.name}</strong>
            <span>· mínimo {formatScore(sheet.passMin)} por eixo</span>
          </p>
        )}
        <details style={{ marginTop: "var(--space-3)" }}>
          <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>Como pontuar</summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {Object.entries(SCORE_LABELS).map(([n, l]) => (
              <li key={n}>
                <strong>{n}</strong> — {l}
              </li>
            ))}
            <li>
              Para aprovar: média ≥ {formatScore(sheet.passMin)} nos itens novos, nos itens do grau anterior e na revisão de cada eixo; itens ★ precisam de ≥ {formatScore(sheet.passMin)}{" "}
              individualmente.
            </li>
            <li>«Preencher o resto» dá a nota a todos os itens ainda sem nota do separador; depois ajusta só as exceções.</li>
            <li>Toca de novo numa nota para a apagar. As notas são gravadas automaticamente.</li>
          </ul>
        </details>
      </header>

      {error && (
        <p role="alert" style={{ display: "flex", gap: 8, alignItems: "center", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--danger) 12%, transparent)", fontSize: "var(--text-sm)" }}>
          <AlertTriangle size={16} aria-hidden style={{ color: "var(--danger)", flexShrink: 0 }} /> {error}
        </p>
      )}

      {doneLevels.map((level) => (
        <details key={level.targetGrade.id} className="card" style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)" }}>
          <summary style={{ cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: 700, padding: "var(--space-1) 0", color: "var(--success)" }}>
            ✓ {level.targetGrade.name} — cumprido (tocar para rever as notas)
          </summary>
          {level.newEntries.map((e) => (
            <EntryRow key={e.key} entry={e} state={scores[e.key]} passMin={level.passMin} onScore={setScore} onComment={setComment} />
          ))}
        </details>
      ))}

      <div ref={topRef} style={{ scrollMarginTop: 72 }} />
      <nav className="exam-tabs" aria-label="Partes do exame">
        {sections.map((s) => {
          const done = s.entries.filter((e) => scores[e.key]?.score != null).length;
          const complete = done === s.entries.length;
          const on = s.id === active.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSection(s.id)}
              aria-current={on ? "true" : undefined}
              className="exam-tab"
              style={{
                borderColor: on ? "var(--text-primary)" : complete ? "color-mix(in srgb, var(--success) 45%, transparent)" : "var(--border)",
                color: on ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span
                aria-hidden
                className="exam-tab-ring"
                style={{ background: `conic-gradient(${complete ? "var(--success)" : "var(--primary)"} ${(done / s.entries.length) * 360}deg, var(--border) 0)` }}
              />
              {s.emoji && <span aria-hidden>{s.emoji}</span>}
              {s.label}
              <span className="exam-tab-count" style={complete ? { color: "var(--success)", background: "color-mix(in srgb, var(--success) 15%, transparent)" } : undefined}>
                {done}/{s.entries.length}
              </span>
            </button>
          );
        })}
      </nav>

      {active && (
        <section aria-label={active.label}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap", margin: "var(--space-4) 0 var(--space-3)" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>
                {active.emoji && <span aria-hidden>{active.emoji} </span>}
                {active.label}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{active.subtitle}</p>
            </div>
            {active.entries.some((e) => scores[e.key]?.score == null) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                Preencher o resto com
                {FILL_SCORES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => fillRest(active, n)}
                    aria-label={`Dar ${n} a todos os itens sem nota de ${active.label}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border: "1px dashed var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          {active.entries.map((e) => (
            <div key={e.key}>
              <EntryRow entry={e} state={scores[e.key]} passMin={passMin} onScore={setScore} onComment={setComment} />
              {active.reference?.[e.key] && (
                <details style={{ margin: "-4px 0 var(--space-2)", padding: "0 var(--space-3)" }}>
                  <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", padding: "4px 0" }}>
                    Ver itens de referência
                  </summary>
                  {active.reference[e.key].map((g) => (
                    <p key={g.gradeName} style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--text-primary)" }}>{g.gradeName}:</strong> {g.labels.join(" · ")}
                    </p>
                  ))}
                </details>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="sticky-action-bar" style={{ marginTop: "var(--space-5)" }}>
        <div className="card" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.35)", padding: barOpen ? "var(--space-3)" : "8px 10px" }}>
          <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden", marginBottom: 8 }} aria-hidden>
            <div
              style={{
                height: "100%",
                width: `${myResult.totalCount ? (myResult.scoredCount / myResult.totalCount) * 100 : 0}%`,
                background: missingCount === 0 ? "var(--success)" : "var(--primary)",
                borderRadius: 99,
                transition: "width 200ms ease",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: barOpen || placement?.nextGradeName ? "wrap" : "nowrap" }}>
            <span style={{ flex: "1 1 auto", minWidth: 0, fontSize: "var(--text-sm)", fontWeight: 700 }} role="status" aria-live="polite">
              {currentLevel && barOpen && `${currentLevel.targetGrade.name}: `}
              {barOpen ? `${myResult.scoredCount} de ${myResult.totalCount} avaliados` : `${myResult.scoredCount}/${myResult.totalCount}`}
              <span style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 400, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {barOpen ? (missingCount > 0 ? `faltam ${missingCount}` : "tudo avaliado") : missingCount > 0 ? "avaliados" : "completo"}
                <SaveStateLabel state={saveState} />
              </span>
            </span>
            {saveState === "error" && (
              <button type="button" className="btn btn-secondary" onClick={() => void flush()}>
                Tentar de novo
              </button>
            )}
            {missingCount > 0 && (
              <button type="button" className="btn btn-secondary" onClick={goToNextMissing} style={{ gap: 4 }}>
                Próximo <ChevronDown size={14} aria-hidden />
              </button>
            )}
            {placement?.nextGradeName && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void advance()}
                disabled={!myResult.passed || advancing || saveState === "error"}
                title={myResult.passed ? undefined : "Fica ativo quando o grau atual estiver completo e cumprido"}
              >
                {advancing ? "A avançar…" : `Avançar para ${placement.nextGradeName} →`}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => void goToResult()} disabled={saveState === "error"}>
              {placement ? "Terminar" : "Resultado"}
            </button>
            <button
              type="button"
              onClick={toggleBar}
              aria-expanded={barOpen}
              aria-label={barOpen ? "Minimizar a barra" : "Mostrar as médias por eixo"}
              title={barOpen ? "Minimizar" : "Mostrar médias"}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {barOpen ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
            </button>
          </div>
          {barOpen && (
          <div className="exam-axes">
            {myResult.axes.map((a) => {
              const parts = [
                a.newCount > 0 ? { label: "novo", value: a.newAvg, passed: a.newPassed } : null,
                (a.prevCount ?? 0) > 0 ? { label: "anterior", value: a.prevAvg ?? null, passed: a.prevPassed ?? null } : null,
                a.reviewPassed !== null ? { label: "revisão", value: a.reviewScore, passed: a.reviewPassed } : null,
              ].filter((p): p is { label: string; value: number | null; passed: boolean | null } => p != null);
              const main = parts[0];
              const tone = (p: { value: number | null; passed: boolean | null }) =>
                p.value == null ? "var(--text-secondary)" : p.passed === false ? "var(--danger)" : "var(--success)";
              return (
                <div key={a.axis} className="exam-axis">
                  <span>
                    {GRADUATION_AXIS_META[a.axis].emoji} {GRADUATION_AXIS_META[a.axis].label}
                  </span>
                  <strong style={{ color: main ? tone(main) : "var(--text-secondary)" }}>{main?.value != null ? formatScore(main.value) : "–"}</strong>
                  {parts.length > 1 && (
                    <span style={{ fontSize: 10 }}>
                      {parts
                        .slice(1)
                        .map((p) => `${p.label} ${p.value != null ? formatScore(p.value) : "–"}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveStateLabel({ state }: { state: "idle" | "pending" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const [text, color] =
    state === "error"
      ? ["erro ao gravar", "var(--danger)"]
      : state === "saved"
        ? ["gravado ✓", "var(--success)"]
        : ["a gravar…", "var(--text-secondary)"];
  return <span style={{ color }}> · {text}</span>;
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
    <div
      id={`entry-${entry.key}`}
      className="exam-entry"
      style={{
        borderColor:
          score == null
            ? "var(--border)"
            : below
              ? "color-mix(in srgb, var(--danger) 50%, transparent)"
              : "color-mix(in srgb, var(--success) 35%, transparent)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.35 }}>
          {entry.isCritical && <Star size={13} aria-label="Item fundamental" style={{ display: "inline", marginRight: 4, marginTop: -2, color: "var(--warning)", fill: "var(--warning)" }} />}
          {entry.label}
        </p>
        {entry.description && <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.45 }}>{entry.description}</p>}
      </div>
      <div className="exam-scores" role="radiogroup" aria-label={`Nota para ${entry.label}`}>
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
                background: active ? `color-mix(in srgb, ${tone} 28%, transparent)` : "var(--bg)",
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
        <button
          type="button"
          onClick={() => setCommentOpen((o) => !o)}
          aria-label="Comentário"
          aria-expanded={commentOpen}
          title="Comentário"
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${state?.comment ? "var(--primary)" : "var(--border)"}`,
            background: "var(--bg)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            color: state?.comment ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          <MessageSquareText size={16} />
        </button>
      </div>
      {score != null && (
        <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: "var(--text-xs)", color: below ? "var(--danger)" : "var(--text-secondary)" }}>
          {score} · {SCORE_LABELS[score]}
          {below && ` — abaixo do mínimo ${formatScore(passMin)}${entry.isCritical ? " num item fundamental" : ""}`}
        </p>
      )}
      {commentOpen && (
        <textarea
          className="input"
          rows={2}
          defaultValue={state?.comment ?? ""}
          onBlur={(e) => onComment(entry.key, e.target.value)}
          placeholder="Comentário para o aluno (opcional)"
          aria-label={`Comentário sobre ${entry.label}`}
          style={{ gridColumn: "1 / -1", fontSize: "var(--text-sm)", resize: "vertical" }}
        />
      )}
    </div>
  );
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}
