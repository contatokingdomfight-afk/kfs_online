"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Eye, FileText, Plus, Sparkles } from "lucide-react";
import {
  accumulatedMonths,
  templatePublishWarnings,
  MAX_GRADES,
  type GraduationGradeDraft,
  type GraduationTemplateDraft,
} from "@/lib/graduation/template";
import { getGraduationStarterDraft, saveGraduationTemplate } from "../actions";
import { GradeCard } from "./GradeCard";

export type CourseOption = {
  id: string;
  name: string;
  modalityName: string | null;
  isActive: boolean;
  sameModality: boolean;
};

type Props = {
  modalityCode: string;
  modalityName: string;
  initialTemplate: GraduationTemplateDraft | null;
  courses: CourseOption[];
  copySources: { code: string; name: string }[];
};

export const newId = () => crypto.randomUUID();

export function emptyGrade(): GraduationGradeDraft {
  return {
    id: newId(),
    name: "",
    subtitle: null,
    motto: null,
    objective: null,
    notes: null,
    colors: [],
    minMonths: 3,
    minAttendances: null,
    minPerformanceAvg: null,
    physicalAssessmentMaxAgeMonths: 6,
    passMinAxisAvg: 3,
    items: [],
    courses: [],
    requirements: [],
  };
}

export function GraduationTemplateEditor({ modalityCode, modalityName, initialTemplate, courses, copySources }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<GraduationTemplateDraft | null>(initialTemplate);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialTemplate));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const dirty = JSON.stringify(draft) !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const accumulated = useMemo(() => (draft ? accumulatedMonths(draft.grades) : []), [draft]);
  const warnings = useMemo(() => (draft ? templatePublishWarnings(draft) : []), [draft]);

  if (!draft) {
    return (
      <StarterChooser
        modalityCode={modalityCode}
        modalityName={modalityName}
        copySources={copySources}
        onStart={(d) => {
          setDraft(d);
          setExpandedId(d.grades[0]?.id ?? null);
        }}
      />
    );
  }

  const setGrades = (fn: (grades: GraduationGradeDraft[]) => GraduationGradeDraft[]) =>
    setDraft((d) => (d ? { ...d, grades: fn(d.grades) } : d));

  const updateGrade = (id: string, patch: Partial<GraduationGradeDraft>) =>
    setGrades((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const moveGrade = (index: number, delta: -1 | 1) =>
    setGrades((gs) => {
      const target = index + delta;
      if (target < 0 || target >= gs.length) return gs;
      const next = [...gs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const duplicateGrade = (index: number) => {
    const source = draft.grades[index];
    const copy: GraduationGradeDraft = {
      ...source,
      id: newId(),
      name: `${source.name} (cópia)`,
      items: source.items.map((i) => ({ ...i, id: newId() })),
      requirements: source.requirements.map((r) => ({ ...r, id: newId() })),
      courses: source.courses.map((c) => ({ ...c })),
    };
    setGrades((gs) => [...gs.slice(0, index + 1), copy, ...gs.slice(index + 1)]);
    setExpandedId(copy.id);
  };

  const removeGrade = (index: number) => {
    const g = draft.grades[index];
    const itemsCount = g.items.length;
    const ok = window.confirm(
      `Remover o grau "${g.name || `Grau ${index + 1}`}"${itemsCount ? ` e os seus ${itemsCount} itens` : ""}? A remoção só fica definitiva quando guardares.`
    );
    if (ok) setGrades((gs) => gs.filter((_, i) => i !== index));
  };

  const addGrade = () => {
    const g = emptyGrade();
    setGrades((gs) => [...gs, g]);
    setExpandedId(g.id);
  };

  const save = () => {
    setFeedback(null);
    startSaving(async () => {
      const res = await saveGraduationTemplate(draft);
      if (res.error) {
        setFeedback({ kind: "error", text: res.error });
        return;
      }
      setSavedJson(JSON.stringify(draft));
      setFeedback({ kind: "success", text: "Template guardado." });
      router.refresh();
    });
  };

  const discard = () => {
    if (!window.confirm("Descartar todas as alterações não guardadas?")) return;
    const saved = JSON.parse(savedJson) as GraduationTemplateDraft | null;
    setDraft(saved);
    setFeedback(null);
  };

  const totalItems = draft.grades.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-secondary)" }}>
          Graduação · {modalityName}
        </p>
        <input
          className="input"
          aria-label="Nome do template"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Nome do template"
          style={{ marginTop: 6, fontSize: "var(--text-xl)", fontWeight: 600, background: "transparent", border: "1px solid transparent", paddingLeft: 0 }}
          onFocus={(e) => (e.currentTarget.style.paddingLeft = "0.75em")}
          onBlur={(e) => (e.currentTarget.style.paddingLeft = "0")}
        />
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          {draft.grades.length} {draft.grades.length === 1 ? "grau" : "graus"} · {totalItems} itens avaliados ·{" "}
          {accumulated[accumulated.length - 1] ?? 0} meses até ao grau máximo
        </p>
        {savedJson !== "null" && (
          <Link
            href={`/admin/graduacao/${encodeURIComponent(modalityCode)}/aluno`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
          >
            <Eye size={16} aria-hidden /> Ver como aluno
          </Link>
        )}
      </header>

      <section className="card" style={{ marginBottom: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--primary)", flexShrink: 0 }}
          />
          <span>
            <span style={{ display: "block", fontWeight: 600, fontSize: "var(--text-sm)" }}>Publicado</span>
            <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Quando publicado, os alunos de {modalityName} passam a ver o seu grau e o que falta para o próximo. Em rascunho só o admin vê.
            </span>
          </span>
        </label>
        {draft.isPublished && warnings.length > 0 && (
          <div
            role="status"
            style={{
              display: "flex",
              gap: 10,
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--warning) 12%, transparent)",
              fontSize: "var(--text-xs)",
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={16} aria-hidden style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Template incompleto</strong> — podes publicar na mesma, mas revê:
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {warnings.slice(0, 6).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {warnings.length > 6 && <li>e mais {warnings.length - 6}…</li>}
              </ul>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
          <label htmlFor="monthly-min" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            Um mês conta como tempo de treino com
          </label>
          <input
            id="monthly-min"
            type="number"
            min={1}
            max={31}
            className="input"
            value={draft.monthlyMinAttendances}
            onChange={(e) => setDraft({ ...draft, monthlyMinAttendances: Number(e.target.value) || 1 })}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>presenças</span>
          <p style={{ margin: 0, width: "100%", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            Meses com menos presenças em {modalityName} não contam para o tempo mínimo de cada grau (pausas e férias não somam).
          </p>
        </div>
      </section>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {draft.grades.map((grade, index) => (
          <GradeCard
            key={grade.id}
            grade={grade}
            index={index}
            total={draft.grades.length}
            accumulatedMonths={accumulated[index] ?? 0}
            expanded={expandedId === grade.id}
            onToggle={() => setExpandedId(expandedId === grade.id ? null : grade.id)}
            onChange={(patch) => updateGrade(grade.id, patch)}
            onMove={(delta) => moveGrade(index, delta)}
            onDuplicate={() => duplicateGrade(index)}
            onRemove={() => removeGrade(index)}
            courses={courses}
          />
        ))}
      </ol>

      {draft.grades.length < MAX_GRADES && (
        <button type="button" className="btn btn-secondary" onClick={addGrade} style={{ marginTop: "var(--space-4)", width: "100%", gap: 8 }}>
          <Plus size={16} aria-hidden /> Adicionar grau
        </button>
      )}

      <SaveBar dirty={dirty} saving={saving} feedback={feedback} onSave={save} onDiscard={discard} />
    </div>
  );
}

function SaveBar({
  dirty,
  saving,
  feedback,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  feedback: { kind: "error" | "success"; text: string } | null;
  onSave: () => void;
  onDiscard: (() => void) | null;
}) {
  if (!dirty && !feedback) return null;
  return (
    <div
      style={{
        position: "sticky",
        bottom: "calc(var(--space-3) + env(safe-area-inset-bottom, 0px))",
        marginTop: "var(--space-5)",
        // Espaço para o botão flutuante do assistente do admin (canto inferior direito).
        paddingRight: 72,
        zIndex: 20,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          borderColor: feedback?.kind === "error" ? "var(--danger)" : "var(--border)",
        }}
      >
        <span style={{ flex: 1, minWidth: 160, fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: 8 }}>
          {feedback?.kind === "error" ? (
            <>
              <AlertTriangle size={16} aria-hidden style={{ color: "var(--danger)", flexShrink: 0 }} />
              {feedback.text}
            </>
          ) : dirty ? (
            "Tens alterações por guardar."
          ) : (
            <>
              <CheckCircle2 size={16} aria-hidden style={{ color: "var(--success)", flexShrink: 0 }} />
              {feedback?.text}
            </>
          )}
        </span>
        {dirty && (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {onDiscard && (
              <button type="button" className="btn btn-secondary" onClick={onDiscard} disabled={saving}>
                Descartar
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StarterChooser({
  modalityCode,
  modalityName,
  copySources,
  onStart,
}: {
  modalityCode: string;
  modalityName: string;
  copySources: { code: string; name: string }[];
  onStart: (draft: GraduationTemplateDraft) => void;
}) {
  const [copyFrom, setCopyFrom] = useState(copySources[0]?.code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const load = (source: Parameters<typeof getGraduationStarterDraft>[1]) => {
    setError(null);
    startLoading(async () => {
      const res = await getGraduationStarterDraft(modalityCode, source);
      if (res.error || !res.draft) setError(res.error ?? "Não foi possível carregar.");
      else onStart(res.draft);
    });
  };

  const optionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
    textAlign: "left",
    alignItems: "flex-start",
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: "var(--text-xl)", fontWeight: 600 }}>Graduação · {modalityName}</h1>
      <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Esta modalidade ainda não tem graduação. Escolhe um ponto de partida — podes editar tudo antes de guardar.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
        <div className="card" style={optionStyle}>
          <Sparkles size={20} aria-hidden style={{ color: "var(--primary)" }} />
          <strong style={{ fontSize: "var(--text-base)" }}>Modelo Kingdom</strong>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
            Os 10 graus da Matriz de Graduação Kingdom (Branco → Preto/Prata/Branco/Vermelho), com todos os itens técnicos, táticos,
            teóricos e físicos e os tempos mínimos.
          </span>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => load({ kind: "kingdom" })}>
            Usar modelo Kingdom
          </button>
        </div>
        {copySources.length > 0 && (
          <div className="card" style={optionStyle}>
            <Copy size={20} aria-hidden style={{ color: "var(--text-secondary)" }} />
            <strong style={{ fontSize: "var(--text-base)" }}>Copiar de outra modalidade</strong>
            <select className="input" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-label="Modalidade de origem">
              {copySources.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", flex: 1 }}>Copia graus e itens (os cursos não são copiados).</span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || !copyFrom}
              onClick={() => load({ kind: "copy", fromModalityCode: copyFrom })}
            >
              Copiar
            </button>
          </div>
        )}
        <div className="card" style={optionStyle}>
          <FileText size={20} aria-hidden style={{ color: "var(--text-secondary)" }} />
          <strong style={{ fontSize: "var(--text-base)" }}>Começar do zero</strong>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
            Um template vazio para construíres os graus um a um.
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() =>
              onStart({ modalityCode, name: `Graduação ${modalityName}`, isPublished: false, monthlyMinAttendances: 4, grades: [emptyGrade()] })
            }
          >
            Começar do zero
          </button>
        </div>
      </div>
      {loading && <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>A carregar…</p>}
      {error && <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
