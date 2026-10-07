"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { setGraduationComponents } from "../actions";

export type ComponentOption = { code: string; name: string; graduation: "published" | "draft" | "none" };

const STATUS: Record<ComponentOption["graduation"], string> = {
  published: "graduação publicada",
  draft: "graduação em rascunho",
  none: "sem graduação",
};

/**
 * Modalidade composta (ex.: MMA): em vez de graus próprios, o aluno vê os graus das modalidades base.
 * Mostrado no editor quando a modalidade ainda não tem template próprio.
 */
export function ComponentsPanel({
  modalityCode,
  modalityName,
  components,
  options,
}: {
  modalityCode: string;
  modalityName: string;
  components: string[];
  options: ComponentOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(components));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nameOf = (code: string) => options.find((o) => o.code === code)?.name ?? code;

  const save = (codes: string[]) => {
    setError(null);
    start(async () => {
      const res = await setGraduationComponents(modalityCode, codes);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  if (!editing && components.length > 0) {
    return (
      <div className="card" style={{ marginBottom: "var(--space-5)", borderColor: "var(--primary)" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          <Layers size={18} aria-hidden style={{ color: "var(--primary)" }} /> {modalityName} usa os graus de outras modalidades
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Os alunos de {modalityName} veem um grau por cada uma: <strong style={{ color: "var(--text-primary)" }}>{components.map(nameOf).join(", ")}</strong>.
          Só aparecem as que tiverem graduação publicada.
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)} disabled={pending}>
            Alterar modalidades
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Deixar de usar os graus de outras modalidades em ${modalityName}?`)) save([]);
            }}
          >
            Deixar de usar
          </button>
        </div>
        {error && <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p>}
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="card" style={{ marginBottom: "var(--space-5)", display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <Layers size={20} aria-hidden style={{ color: "var(--text-secondary)" }} />
        <div style={{ flex: "1 1 240px" }}>
          <strong style={{ fontSize: "var(--text-sm)" }}>Modalidade composta?</strong>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Em vez de criar graus próprios, {modalityName} pode usar os graus de outras modalidades (ex.: MMA → Muay Thai, Boxe e Jiu-Jitsu).
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          Usar graus de outras modalidades
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: "var(--space-5)" }}>
      <p style={{ margin: "0 0 var(--space-3)", fontWeight: 700 }}>Modalidades cujos graus contam para {modalityName}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o) => (
          <li key={o.code}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "var(--text-sm)" }}>
              <input
                type="checkbox"
                checked={selected.has(o.code)}
                onChange={() =>
                  setSelected((s) => {
                    const next = new Set(s);
                    if (next.has(o.code)) next.delete(o.code);
                    else next.add(o.code);
                    return next;
                  })
                }
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
              <span style={{ flex: 1 }}>{o.name}</span>
              <span style={{ fontSize: "var(--text-xs)", color: o.graduation === "published" ? "var(--success)" : "var(--text-secondary)" }}>
                {STATUS[o.graduation]}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
        <button type="button" className="btn btn-primary" disabled={pending || selected.size === 0} onClick={() => save([...selected])}>
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => {
            setSelected(new Set(components));
            setEditing(false);
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
