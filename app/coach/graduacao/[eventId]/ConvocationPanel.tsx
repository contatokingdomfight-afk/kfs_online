"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { convokeStudents, setRequirementFulfilled } from "../actions";

export type ConvocationOption = {
  studentId: string;
  name: string;
  isPrimary: boolean;
  currentName: string | null;
  currentColors: string[];
  nextName: string;
  nextColors: string[];
  ready: boolean;
  doneCount: number;
  total: number;
  /** Requisitos automáticos em falta (texto). */
  pendingChecks: string[];
  pendingRequirements: { id: string; label: string }[];
  otherConvocation: string | null;
};

export function ConvocationPanel({ eventId, options }: { eventId: string; options: ConvocationOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(options.filter((o) => o.ready && !o.otherConvocation).map((o) => o.studentId))
  );
  const [query, setQuery] = useState("");
  const [showNotReady, setShowNotReady] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [validating, setValidating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const ready = filtered.filter((o) => o.ready);
  const notReady = filtered.filter((o) => !o.ready);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const convoke = () => {
    const ids = [...selected].filter((id) => options.some((o) => o.studentId === id));
    const notReadyCount = ids.filter((id) => !options.find((o) => o.studentId === id)?.ready).length;
    if (
      notReadyCount > 0 &&
      !window.confirm(`${notReadyCount} ${notReadyCount === 1 ? "aluno ainda não cumpre" : "alunos ainda não cumprem"} todos os requisitos. Convocar mesmo assim?`)
    )
      return;
    setMessage(null);
    start(async () => {
      const res = await convokeStudents(eventId, ids);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "success", text: res.convoked === 1 ? "1 aluno convocado e notificado." : `${res.convoked} alunos convocados e notificados.` });
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  const validate = (studentId: string, requirementId: string) => {
    setValidating(requirementId + studentId);
    start(async () => {
      const res = await setRequirementFulfilled(studentId, requirementId, true, eventId);
      setValidating(null);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else router.refresh();
    });
  };

  const row = (o: ConvocationOption) => {
    const checked = selected.has(o.studentId);
    return (
      <li key={o.studentId} className="card" style={{ padding: "var(--space-3)", borderColor: checked ? "var(--primary)" : undefined }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggle(o.studentId)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--primary)", flexShrink: 0 }}
            aria-label={`Convocar ${o.name}`}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: "var(--text-sm)" }}>{o.name}</strong>
              {o.ready && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--success)" }}>
                  <CheckCircle2 size={14} aria-hidden /> Apto
                </span>
              )}
              {!o.ready && o.total > 0 && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                  {o.doneCount}/{o.total} requisitos
                </span>
              )}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
              <BeltSwatch colors={o.currentColors} width={22} height={8} />
              {o.currentName ?? "Sem graduação"} → <BeltSwatch colors={o.nextColors} width={22} height={8} />
              <strong style={{ color: "var(--text-primary)" }}>{o.nextName}</strong>
            </span>
            {o.otherConvocation && (
              <span style={{ display: "block", marginTop: 4, fontSize: "var(--text-xs)", color: "var(--warning)" }}>
                Já convocado para: {o.otherConvocation}
              </span>
            )}
            {o.pendingChecks.length > 0 && (
              <span style={{ display: "block", marginTop: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Falta: {o.pendingChecks.join(" · ")}
              </span>
            )}
          </span>
        </label>
        {o.pendingRequirements.length > 0 && (
          <div style={{ marginTop: 8, marginLeft: 32, display: "flex", flexDirection: "column", gap: 6 }}>
            {o.pendingRequirements.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "var(--text-xs)" }}>
                <span style={{ flex: 1, minWidth: 140 }}>Por validar: {r.label}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "var(--text-xs)", minHeight: 32, padding: "0.3em 0.8em" }}
                  disabled={pending}
                  onClick={() => validate(o.studentId, r.id)}
                >
                  {validating === r.id + o.studentId ? "A validar…" : "Validar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </li>
    );
  };

  const listStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" };

  return (
    <section style={{ marginTop: "var(--space-6)" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-base)", fontWeight: 700 }}>Convocar alunos</h2>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        Os alunos aptos já estão selecionados. Cada aluno é convocado para o seu próximo grau e recebe uma notificação.
      </p>

      {options.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Não há mais alunos desta modalidade para convocar.</p>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: "var(--space-3)" }}>
            <Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar aluno"
              aria-label="Procurar aluno"
              style={{ paddingLeft: 36 }}
            />
          </div>

          <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 700 }}>
            Aptos <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>({ready.length})</span>
          </h3>
          {ready.length === 0 ? (
            <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Nenhum aluno cumpre ainda todos os requisitos.</p>
          ) : (
            <ul style={listStyle}>{ready.map(row)}</ul>
          )}

          {notReady.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <button
                type="button"
                onClick={() => setShowNotReady((v) => !v)}
                aria-expanded={showNotReady}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text-primary)", fontSize: "var(--text-sm)", fontWeight: 700 }}
              >
                {showNotReady ? "▾" : "▸"} Ainda não aptos <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>({notReady.length})</span>
              </button>
              {showNotReady && <ul style={{ ...listStyle, marginTop: "var(--space-2)" }}>{notReady.map(row)}</ul>}
            </div>
          )}

          <div style={{ position: "sticky", bottom: "calc(var(--space-3) + env(safe-area-inset-bottom, 0px))", marginTop: "var(--space-4)", paddingRight: 72, zIndex: 20 }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
              <span role="status" aria-live="polite" style={{ flex: 1, minWidth: 140, fontSize: "var(--text-sm)", color: message?.kind === "error" ? "var(--danger)" : undefined }}>
                {message?.text ?? `${selected.size} ${selected.size === 1 ? "aluno selecionado" : "alunos selecionados"}`}
              </span>
              <button type="button" className="btn btn-primary" disabled={pending || selected.size === 0} onClick={convoke}>
                {pending ? "A convocar…" : `Convocar ${selected.size || ""}`.trim()}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
