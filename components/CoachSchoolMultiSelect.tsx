"use client";

import { useMemo, useState } from "react";

type School = { id: string; name: string };

type Props = {
  schools: School[];
  initialSelectedIds: string[];
  /** Nome do campo no FormData (vários hidden com o mesmo nome) */
  name?: string;
  legend: string;
  hint?: string;
};

export function CoachSchoolMultiSelect({
  schools,
  initialSelectedIds,
  name = "schoolIds",
  legend,
  hint,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialSelectedIds.filter((id) => schools.some((s) => s.id === id))
  );
  const [query, setQuery] = useState("");

  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);

  const q = query.trim().toLowerCase();
  const available = schools.filter(
    (s) => !selectedIds.includes(s.id) && (q === "" || s.name.toLowerCase().includes(q))
  );

  function add(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery("");
  }

  function remove(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <legend style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
        {legend}
      </legend>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {selectedIds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {selectedIds.map((id, index) => {
            const label = schoolById.get(id)?.name ?? id;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontSize: "clamp(13px, 3.2vw, 15px)",
                  color: "var(--text-primary)",
                  maxWidth: "100%",
                }}
              >
                {index === 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--primary)",
                    }}
                  >
                    Principal
                  </span>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <button
                  type="button"
                  aria-label={`Remover ${label}`}
                  onClick={() => remove(id)}
                  style={{
                    minWidth: 26,
                    height: 26,
                    padding: 0,
                    lineHeight: 1,
                    fontSize: 18,
                    borderRadius: "var(--radius-full)",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
        placeholder="Pesquisar escola para adicionar…"
        autoComplete="off"
        aria-label="Pesquisar escolas para adicionar"
      />

      <div
        role="listbox"
        aria-label="Escolas disponíveis"
        style={{
          maxHeight: 240,
          overflowY: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg)",
        }}
      >
        {available.length === 0 ? (
          <p style={{ margin: 0, padding: "12px 14px", fontSize: 14, color: "var(--text-secondary)" }}>
            {schools.length === 0
              ? "Não há escolas ativas."
              : selectedIds.length >= schools.length
                ? "Todas as escolas já estão selecionadas."
                : q
                  ? "Nenhuma escola corresponde à pesquisa (entre as ainda não selecionadas)."
                  : "Nenhuma escola para adicionar."}
          </p>
        ) : (
          available.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              onClick={() => add(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-primary)",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              + {s.name}
            </button>
          ))
        )}
      </div>

      {hint && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{hint}</span>
      )}
    </fieldset>
  );
}
