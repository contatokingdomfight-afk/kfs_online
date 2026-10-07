"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ClipboardPaste, Copy, MessageSquareText, Plus, Star, Trash2, X } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import {
  GRADUATION_AXES,
  GRADUATION_AXIS_META,
  MAX_COLORS_PER_GRADE,
  parsePastedItemLabels,
  type GraduationAxis,
  type GraduationGradeDraft,
  type GraduationItemDraft,
} from "@/lib/graduation/template";
import type { CourseOption } from "./GraduationTemplateEditor";

const COLOR_PRESETS = [
  { name: "Branco", hex: "#F5F5F5" },
  { name: "Amarelo", hex: "#FACC15" },
  { name: "Laranja", hex: "#F97316" },
  { name: "Vermelho", hex: "#DC2626" },
  { name: "Azul celeste", hex: "#38BDF8" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Roxo", hex: "#7C3AED" },
  { name: "Verde limão", hex: "#84CC16" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Castanho", hex: "#92400E" },
  { name: "Prata", hex: "#A8A9AD" },
  { name: "Dourado", hex: "#D4A017" },
  { name: "Preto", hex: "#111111" },
];

const newId = () => crypto.randomUUID();

type Props = {
  grade: GraduationGradeDraft;
  index: number;
  total: number;
  accumulatedMonths: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<GraduationGradeDraft>) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  courses: CourseOption[];
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 var(--space-3)",
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "var(--text-secondary)",
};

const fieldLabel: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 4 };
const hint: React.CSSProperties = { margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.4 };

function iconButton(extra?: React.CSSProperties): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    flexShrink: 0,
    ...extra,
  };
}

export function GradeCard({
  grade,
  index,
  total,
  accumulatedMonths,
  expanded,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  courses,
}: Props) {
  const counts = GRADUATION_AXES.map((a) => grade.items.filter((i) => i.axis === a).length);
  const requiredCourses = grade.courses.filter((c) => c.isRequired).length;
  const panelId = `grade-panel-${grade.id}`;

  return (
    <li className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "transparent",
            border: "none",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <BeltSwatch colors={grade.colors} width={48} height={12} />
              <strong style={{ fontSize: "var(--text-base)" }}>{grade.name || <em style={{ color: "var(--text-secondary)" }}>Sem nome</em>}</strong>
              {grade.motto && <span style={{ fontSize: "var(--text-sm)", fontStyle: "italic", color: "var(--text-secondary)" }}>“{grade.motto}”</span>}
            </span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <Chip>
                {grade.minMonths} {grade.minMonths === 1 ? "mês" : "meses"} · {accumulatedMonths} acumulados
              </Chip>
              {GRADUATION_AXES.map((a, i) => (
                <Chip key={a} muted={counts[i] === 0} title={GRADUATION_AXIS_META[a].label}>
                  {GRADUATION_AXIS_META[a].emoji} {counts[i]}
                </Chip>
              ))}
              {grade.courses.length > 0 && <Chip>📺 {requiredCourses}/{grade.courses.length} cursos</Chip>}
              {grade.requirements.length > 0 && <Chip>✅ {grade.requirements.length} requisitos</Chip>}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            style={{ color: "var(--text-secondary)", flexShrink: 0, transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
          />
        </button>
      </div>

      {expanded && (
        <div id={panelId} style={{ borderTop: "1px solid var(--border)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: -8, marginBottom: -8 }}>
            <button type="button" style={iconButton()} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover grau para cima" title="Mover para cima">
              <ArrowUp size={16} />
            </button>
            <button type="button" style={iconButton()} onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Mover grau para baixo" title="Mover para baixo">
              <ArrowDown size={16} />
            </button>
            <button type="button" style={iconButton()} onClick={onDuplicate} aria-label="Duplicar grau" title="Duplicar">
              <Copy size={16} />
            </button>
            <button type="button" style={iconButton({ color: "var(--danger)" })} onClick={onRemove} aria-label="Remover grau" title="Remover">
              <Trash2 size={16} />
            </button>
          </div>

          <IdentitySection grade={grade} onChange={onChange} />
          <KnowledgeSection grade={grade} onChange={onChange} />
          <PrerequisitesSection grade={grade} accumulatedMonths={accumulatedMonths} onChange={onChange} />
          <CoursesSection grade={grade} courses={courses} onChange={onChange} />
          <RequirementsSection grade={grade} onChange={onChange} />
        </div>
      )}
    </li>
  );
}

function Chip({ children, muted, title }: { children: React.ReactNode; muted?: boolean; title?: string }) {
  return (
    <span
      title={title}
      style={{
        fontSize: "var(--text-xs)",
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--bg)",
        border: "1px solid var(--border)",
        color: muted ? "var(--danger)" : "var(--text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

type SectionProps = { grade: GraduationGradeDraft; onChange: (patch: Partial<GraduationGradeDraft>) => void };

function IdentitySection({ grade, onChange }: SectionProps) {
  const setText = (key: "name" | "subtitle" | "motto" | "objective" | "notes") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ [key]: key === "name" ? e.target.value : e.target.value || null });

  return (
    <section>
      <h3 style={sectionTitle}>Identidade</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
        <div>
          <label style={fieldLabel} htmlFor={`name-${grade.id}`}>
            Nome do grau *
          </label>
          <input id={`name-${grade.id}`} className="input" value={grade.name} onChange={setText("name")} placeholder="ex.: Branco/Laranja" />
        </div>
        <div>
          <label style={fieldLabel} htmlFor={`subtitle-${grade.id}`}>
            Significado
          </label>
          <input id={`subtitle-${grade.id}`} className="input" value={grade.subtitle ?? ""} onChange={setText("subtitle")} placeholder="ex.: Despertar da Vontade" />
        </div>
        <div>
          <label style={fieldLabel} htmlFor={`motto-${grade.id}`}>
            Lema
          </label>
          <input id={`motto-${grade.id}`} className="input" value={grade.motto ?? ""} onChange={setText("motto")} placeholder="ex.: Eu me comprometo." />
        </div>
      </div>
      <div style={{ marginTop: "var(--space-3)" }}>
        <label style={fieldLabel} htmlFor={`objective-${grade.id}`}>
          Objetivo
        </label>
        <textarea
          id={`objective-${grade.id}`}
          className="input"
          rows={2}
          value={grade.objective ?? ""}
          onChange={setText("objective")}
          placeholder="O que este grau representa na jornada do aluno"
          style={{ resize: "vertical" }}
        />
      </div>
      <div style={{ marginTop: "var(--space-3)" }}>
        <span style={fieldLabel}>Cores da faixa (até {MAX_COLORS_PER_GRADE})</span>
        <ColorEditor colors={grade.colors} onChange={(colors) => onChange({ colors })} />
      </div>
      <details style={{ marginTop: "var(--space-3)" }} open={Boolean(grade.notes)}>
        <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>Notas para o aluno (opcional)</summary>
        <textarea
          className="input"
          rows={4}
          value={grade.notes ?? ""}
          onChange={setText("notes")}
          placeholder="Texto livre mostrado com o grau (ex.: filosofia, significado das cores)"
          style={{ marginTop: 8, resize: "vertical" }}
          aria-label="Notas para o aluno"
        />
      </details>
    </section>
  );
}

function ColorEditor({ colors, onChange }: { colors: string[]; onChange: (colors: string[]) => void }) {
  const full = colors.length >= MAX_COLORS_PER_GRADE;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <BeltSwatch colors={colors} width={120} height={18} />
        {colors.map((c, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 4px 2px 2px", border: "1px solid var(--border)", borderRadius: 999 }}>
            <input
              type="color"
              value={c.toLowerCase()}
              onChange={(e) => onChange(colors.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
              aria-label={`Cor ${i + 1}`}
              style={{ width: 24, height: 24, border: "none", padding: 0, background: "transparent", cursor: "pointer" }}
            />
            <button type="button" style={iconButton({ width: 22, height: 22 })} aria-label={`Remover cor ${i + 1}`} onClick={() => onChange(colors.filter((_, j) => j !== i))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Adicionar cor">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            disabled={full}
            onClick={() => onChange([...colors, p.hex])}
            title={full ? `Máximo de ${MAX_COLORS_PER_GRADE} cores` : `Adicionar ${p.name}`}
            aria-label={`Adicionar ${p.name}`}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: p.hex,
              border: "1px solid var(--border)",
              cursor: full ? "not-allowed" : "pointer",
              opacity: full ? 0.35 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function KnowledgeSection({ grade, onChange }: SectionProps) {
  const [axis, setAxis] = useState<GraduationAxis>("TECNICO");
  const [newLabel, setNewLabel] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [openDescriptions, setOpenDescriptions] = useState<Set<string>>(new Set());

  const axisItems = grade.items.filter((i) => i.axis === axis);
  const pasted = parsePastedItemLabels(pasteText);

  const setItems = (fn: (items: GraduationItemDraft[]) => GraduationItemDraft[]) => onChange({ items: fn(grade.items) });
  const updateItem = (id: string, patch: Partial<GraduationItemDraft>) => setItems((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItems = (labels: string[]) => {
    if (labels.length === 0) return;
    setItems((items) => [...items, ...labels.map((label) => ({ id: newId(), axis, label, description: null, isCritical: false }))]);
  };

  const moveItem = (id: string, delta: -1 | 1) =>
    setItems((items) => {
      // Troca com o item vizinho do mesmo eixo, mantendo os outros eixos no lugar.
      const sameAxis = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.axis === axis);
      const pos = sameAxis.findIndex(({ it }) => it.id === id);
      const other = sameAxis[pos + delta];
      if (pos < 0 || !other) return items;
      const next = [...items];
      [next[sameAxis[pos].idx], next[other.idx]] = [next[other.idx], next[sameAxis[pos].idx]];
      return next;
    });

  const toggleDescription = (id: string) =>
    setOpenDescriptions((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section>
      <h3 style={sectionTitle}>O que o aluno precisa saber</h3>
      <div role="tablist" aria-label="Eixos" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6, marginBottom: "var(--space-3)" }}>
        {GRADUATION_AXES.map((a) => {
          const active = a === axis;
          const count = grade.items.filter((i) => i.axis === a).length;
          return (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAxis(a)}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--bg)",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                {GRADUATION_AXIS_META[a].emoji} {GRADUATION_AXIS_META[a].label}
              </span>
              <span style={{ display: "block", fontSize: "var(--text-xs)", color: count === 0 ? "var(--danger)" : "var(--text-secondary)" }}>
                {count} {count === 1 ? "item" : "itens"}
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ ...hint, margin: "0 0 var(--space-3)" }}>{GRADUATION_AXIS_META[axis].hint}. Marca com ★ os itens críticos — precisam de nota mínima individual no exame.</p>

      {axisItems.length === 0 ? (
        <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Ainda sem itens neste eixo.</p>
      ) : (
        <ol style={{ listStyle: "none", margin: "0 0 var(--space-3)", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {axisItems.map((item, i) => {
            const descOpen = openDescriptions.has(item.id) || Boolean(item.description);
            return (
              <li key={item.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)", padding: "4px 4px 4px 10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <span aria-hidden style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", width: 20, flexShrink: 0, paddingTop: 10 }}>
                    {i + 1}.
                  </span>
                  <AutoGrowLabel value={item.label} onChange={(label) => updateItem(item.id, { label })} ariaLabel={`Item ${i + 1}`} />
                  <button
                    type="button"
                    style={iconButton({ color: item.isCritical ? "var(--warning)" : "var(--text-secondary)" })}
                    onClick={() => updateItem(item.id, { isCritical: !item.isCritical })}
                    aria-pressed={item.isCritical}
                    aria-label="Item crítico"
                    title={item.isCritical ? "Item crítico" : "Marcar como crítico"}
                  >
                    <Star size={16} fill={item.isCritical ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    style={iconButton({ color: descOpen ? "var(--text-primary)" : "var(--text-secondary)" })}
                    onClick={() => toggleDescription(item.id)}
                    aria-label="Detalhe do item"
                    title="Adicionar detalhe"
                  >
                    <MessageSquareText size={16} />
                  </button>
                  <button type="button" style={iconButton()} onClick={() => moveItem(item.id, -1)} disabled={i === 0} aria-label="Mover item para cima">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" style={iconButton()} onClick={() => moveItem(item.id, 1)} disabled={i === axisItems.length - 1} aria-label="Mover item para baixo">
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    style={iconButton({ color: "var(--danger)" })}
                    onClick={() => setItems((items) => items.filter((x) => x.id !== item.id))}
                    aria-label={`Remover ${item.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {descOpen && (
                  <textarea
                    className="input"
                    rows={2}
                    value={item.description ?? ""}
                    onChange={(e) => updateItem(item.id, { description: e.target.value || null })}
                    placeholder="Detalhe (ex.: sub-itens, critérios de execução)"
                    aria-label={`Detalhe de ${item.label}`}
                    style={{ margin: "4px 4px 4px 22px", width: "calc(100% - 26px)", fontSize: "var(--text-sm)", resize: "vertical" }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItems(newLabel.trim() ? [newLabel.trim()] : []);
          setNewLabel("");
        }}
        style={{ display: "flex", gap: "var(--space-2)" }}
      >
        <input
          className="input"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={`Novo item ${GRADUATION_AXIS_META[axis].label.toLowerCase()}… (Enter para adicionar)`}
          aria-label="Novo item"
        />
        <button type="submit" className="btn btn-secondary" disabled={!newLabel.trim()} aria-label="Adicionar item">
          <Plus size={16} />
        </button>
      </form>
      <button
        type="button"
        onClick={() => setPasteOpen((o) => !o)}
        style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, color: "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer" }}
      >
        <ClipboardPaste size={14} aria-hidden /> Colar lista de itens
      </button>
      {pasteOpen && (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="input"
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Um item por linha, ex.:\nJab.\nDireto.\nFrontal / Teep."}
            aria-label="Lista de itens a colar"
            style={{ resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pasted.length === 0}
              onClick={() => {
                addItems(pasted);
                setPasteText("");
                setPasteOpen(false);
              }}
            >
              Adicionar {pasted.length || ""} {pasted.length === 1 ? "item" : "itens"} em {GRADUATION_AXIS_META[axis].label}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPasteOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Rótulo editável que cresce em altura em vez de cortar textos longos (Enter não cria nova linha). */
function AutoGrowLabel({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="input"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      aria-label={ariaLabel}
      style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: "8px 0.4em", minHeight: 36, resize: "none", overflow: "hidden", lineHeight: 1.35 }}
    />
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  help,
  min,
  max,
  step = 1,
  placeholder,
  suffix,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  help: string;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label style={fieldLabel} htmlFor={id}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="input"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          style={{ maxWidth: 110 }}
        />
        {suffix && <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{suffix}</span>}
      </div>
      <p style={hint}>{help}</p>
    </div>
  );
}

function PrerequisitesSection({ grade, accumulatedMonths, onChange }: SectionProps & { accumulatedMonths: number }) {
  return (
    <section>
      <h3 style={sectionTitle}>Pré-requisitos e aprovação</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <NumberField
          id={`months-${grade.id}`}
          label="Tempo mínimo"
          value={grade.minMonths}
          onChange={(v) => onChange({ minMonths: v ?? 0 })}
          min={0}
          max={240}
          suffix="meses"
          help={`Desde o grau anterior. Acumulado na modalidade: ${accumulatedMonths} meses.`}
        />
        <NumberField
          id={`attendances-${grade.id}`}
          label="Presenças mínimas"
          value={grade.minAttendances}
          onChange={(v) => onChange({ minAttendances: v })}
          min={0}
          max={5000}
          placeholder="—"
          suffix="treinos"
          help="Desde o grau anterior. Vazio = não exigido."
        />
        <NumberField
          id={`performance-${grade.id}`}
          label="Média mínima de performance"
          value={grade.minPerformanceAvg}
          onChange={(v) => onChange({ minPerformanceAvg: v })}
          min={1}
          max={10}
          step={0.5}
          placeholder="—"
          help="Média das últimas 10 avaliações dos treinadores nesta modalidade, na escala em que dão as notas. Vazio = não exigido."
        />
        <NumberField
          id={`physical-${grade.id}`}
          label="Avaliação física recente"
          value={grade.physicalAssessmentMaxAgeMonths}
          onChange={(v) => onChange({ physicalAssessmentMaxAgeMonths: v })}
          min={1}
          max={60}
          placeholder="—"
          suffix="meses"
          help="Feita há no máximo X meses. Vazio = não exigida."
        />
        <NumberField
          id={`pass-${grade.id}`}
          label="Nota mínima para aprovar"
          value={grade.passMinAxisAvg}
          onChange={(v) => onChange({ passMinAxisAvg: v ?? 3 })}
          min={1}
          max={5}
          step={0.5}
          suffix="/ 5 por eixo"
          help="No exame, cada eixo precisa desta média. Itens ★ precisam desta nota individualmente."
        />
      </div>
    </section>
  );
}

function CoursesSection({ grade, courses, onChange }: SectionProps & { courses: CourseOption[] }) {
  const selected = new Set(grade.courses.map((c) => c.courseId));
  const available = courses.filter((c) => !selected.has(c.id));
  const groups: [string, CourseOption[]][] = [
    ["Desta modalidade", available.filter((c) => c.sameModality)],
    ["Gerais", available.filter((c) => !c.sameModality && !c.modalityName)],
    ["Outras modalidades", available.filter((c) => !c.sameModality && c.modalityName)],
  ];
  const byId = new Map(courses.map((c) => [c.id, c]));

  return (
    <section>
      <h3 style={sectionTitle}>Cursos da plataforma</h3>
      {grade.courses.length > 0 && (
        <ul style={{ listStyle: "none", margin: "0 0 var(--space-3)", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {grade.courses.map((gc) => {
            const course = byId.get(gc.courseId);
            return (
              <li
                key={gc.courseId}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 6px 6px 12px", background: "var(--bg)" }}
              >
                <span style={{ flex: 1, minWidth: 160, fontSize: "var(--text-sm)" }}>
                  {course?.name ?? "Curso removido"}
                  {course && !course.isActive && <span style={{ color: "var(--warning)", fontSize: "var(--text-xs)" }}> · inativo</span>}
                  {course?.modalityName && !course.sameModality && (
                    <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}> · {course.modalityName}</span>
                  )}
                </span>
                <div role="radiogroup" aria-label="Tipo de curso" style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {[true, false].map((required) => {
                    const active = gc.isRequired === required;
                    return (
                      <button
                        key={String(required)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange({ courses: grade.courses.map((c) => (c.courseId === gc.courseId ? { ...c, isRequired: required } : c)) })}
                        style={{
                          padding: "6px 10px",
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          background: active ? "var(--primary)" : "transparent",
                          color: active ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {required ? "Obrigatório" : "Recomendado"}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  style={iconButton({ color: "var(--danger)" })}
                  onClick={() => onChange({ courses: grade.courses.filter((c) => c.courseId !== gc.courseId) })}
                  aria-label={`Remover ${course?.name ?? "curso"}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {available.length > 0 ? (
        <select
          className="input"
          value=""
          aria-label="Adicionar curso"
          onChange={(e) => {
            if (e.target.value) onChange({ courses: [...grade.courses, { courseId: e.target.value, isRequired: true }] });
          }}
        >
          <option value="">+ Adicionar curso…</option>
          {groups
            .filter(([, list]) => list.length > 0)
            .map(([label, list]) => (
              <optgroup key={label} label={label}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!c.isActive ? " (inativo)" : ""}
                    {c.modalityName && !c.sameModality ? ` — ${c.modalityName}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      ) : (
        <p style={hint}>Não há mais cursos disponíveis.</p>
      )}
      <p style={hint}>Obrigatórios bloqueiam o exame até estarem concluídos; recomendados aparecem ao aluno como sugestão.</p>
    </section>
  );
}

function RequirementsSection({ grade, onChange }: SectionProps) {
  const [label, setLabel] = useState("");
  return (
    <section>
      <h3 style={sectionTitle}>Requisitos fora da plataforma</h3>
      {grade.requirements.length > 0 && (
        <ul style={{ listStyle: "none", margin: "0 0 var(--space-3)", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {grade.requirements.map((r) => (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "2px 4px 2px 10px", background: "var(--bg)" }}>
              <input
                className="input"
                value={r.label}
                onChange={(e) => onChange({ requirements: grade.requirements.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)) })}
                aria-label="Requisito"
                style={{ flex: 1, border: "none", background: "transparent", padding: "0.25em 0.4em", minHeight: 36 }}
              />
              <button
                type="button"
                style={iconButton({ color: "var(--danger)" })}
                onClick={() => onChange({ requirements: grade.requirements.filter((x) => x.id !== r.id) })}
                aria-label={`Remover ${r.label}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          onChange({ requirements: [...grade.requirements, { id: newId(), label: label.trim() }] });
          setLabel("");
        }}
        style={{ display: "flex", gap: "var(--space-2)" }}
      >
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex.: Ter feito estágio conosco" aria-label="Novo requisito" />
        <button type="submit" className="btn btn-secondary" disabled={!label.trim()} aria-label="Adicionar requisito">
          <Plus size={16} />
        </button>
      </form>
      <p style={hint}>Validados manualmente pelo admin antes do exame (ex.: estágio, curso presencial).</p>
    </section>
  );
}
