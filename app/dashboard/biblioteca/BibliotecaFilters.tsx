"use client";

import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "TECHNIQUE", label: "Técnica" },
  { value: "MINDSET", label: "Mindset" },
  { value: "PERFORMANCE", label: "Performance" },
];

const MODALITIES = [
  { value: "", label: "Todas" },
  { value: "MUAY_THAI", label: "Muay Thai" },
  { value: "BOXING", label: "Boxing" },
  { value: "KICKBOXING", label: "Kickboxing" },
];

const LEVELS = [
  { value: "", label: "Todos" },
  { value: "INICIANTE", label: "Iniciante" },
  { value: "INTERMEDIARIO", label: "Intermediário" },
  { value: "AVANCADO", label: "Avançado" },
];

type Props = {
  currentCategory?: string;
  currentModality?: string;
  currentLevel?: string;
};

function buildSearchParams(cat?: string, mod?: string, lvl?: string): string {
  const p = new URLSearchParams();
  if (cat) p.set("cat", cat);
  if (mod) p.set("mod", mod);
  if (lvl) p.set("lvl", lvl);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function FilterChip({
  href,
  label,
  active,
}: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13,
        padding: "6px 12px",
        borderRadius: "var(--radius-md)",
        background: active ? "var(--primary)" : "var(--surface)",
        color: active ? "white" : "var(--text-secondary)",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

export function BibliotecaFilters({ currentCategory, currentModality, currentLevel }: Props) {
  const hasFilters = !!(currentCategory || currentModality || currentLevel);
  const [expanded, setExpanded] = useState(hasFilters);
  const hasActiveFilters = !!(currentCategory || currentModality || currentLevel);
  const activeCount = [currentCategory, currentModality, currentLevel].filter(Boolean).length;

  const filterContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "12px 0 0 0",
      }}
    >
      <div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Categoria
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORIES.map(({ value, label }) => (
            <FilterChip
              key={value || "cat-all"}
              href={`/dashboard/biblioteca${buildSearchParams(value || undefined, currentModality, currentLevel)}`}
              label={label}
              active={currentCategory === value || (!currentCategory && !value)}
            />
          ))}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Modalidade
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MODALITIES.map(({ value, label }) => (
            <FilterChip
              key={value || "mod-all"}
              href={`/dashboard/biblioteca${buildSearchParams(currentCategory, value || undefined, currentLevel)}`}
              label={label}
              active={currentModality === value || (!currentModality && !value)}
            />
          ))}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Nível
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {LEVELS.map(({ value, label }) => (
            <FilterChip
              key={value || "lvl-all"}
              href={`/dashboard/biblioteca${buildSearchParams(currentCategory, currentModality, value || undefined)}`}
              label={label}
              active={currentLevel === value || (!currentLevel && !value)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 16 }}>
      {/* Mobile: botão colapsável (oculto no desktop) */}
      <div
        className="biblioteca-filter-toggle-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="biblioteca-filter-toggle"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <span style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          <span>Filtros</span>
          {hasFilters && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: "var(--radius-full)",
                background: "var(--primary)",
                color: "white",
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
        {hasFilters && (
          <Link
            href="/dashboard/biblioteca"
            style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "underline" }}
          >
            Limpar
          </Link>
        )}
      </div>

      {/* Conteúdo dos filtros: colapsado no mobile, sempre visível no desktop */}
      <div
        style={{
          display: expanded ? "block" : "none",
        }}
        className="biblioteca-filters-expanded"
      >
        {filterContent}
      </div>

      {/* Desktop: filtros inline (visíveis em ecrãs maiores) */}
      <div
        className="biblioteca-filters-desktop"
        style={{
          display: "none",
        }}
      >
        {filterContent}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 640px) {
          .biblioteca-filter-toggle-row, .biblioteca-filters-expanded { display: none !important; }
          .biblioteca-filters-desktop { display: block !important; }
        }
        @media (max-width: 639px) {
          .biblioteca-filters-desktop { display: none !important; }
        }
      `}} />
    </div>
  );
}
