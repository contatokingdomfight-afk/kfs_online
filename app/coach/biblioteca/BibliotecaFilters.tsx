"use client";

import Link from "next/link";

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

function buildSearchParams(cat?: string, mod?: string, lvl?: string): string {
  const p = new URLSearchParams();
  if (cat) p.set("cat", cat);
  if (mod) p.set("mod", mod);
  if (lvl) p.set("lvl", lvl);
  const s = p.toString();
  return s ? `?${s}` : "";
}

type Props = {
  currentCategory?: string;
  currentModality?: string;
  currentLevel?: string;
};

export function CoachBibliotecaFilters({ currentCategory, currentModality, currentLevel }: Props) {
  const base = "/coach/biblioteca";
  return (
    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>Filtros:</span>
      {CATEGORIES.map(({ value, label }) => (
        <Link
          key={value || "cat-all"}
          href={`${base}${buildSearchParams(value || undefined, currentModality, currentLevel)}`}
          style={{
            fontSize: 13,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: currentCategory === value || (!currentCategory && !value) ? "var(--primary)" : "var(--surface)",
            color: currentCategory === value || (!currentCategory && !value) ? "white" : "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          {label}
        </Link>
      ))}
      <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>|</span>
      {MODALITIES.map(({ value, label }) => (
        <Link
          key={value || "mod-all"}
          href={`${base}${buildSearchParams(currentCategory, value || undefined, currentLevel)}`}
          style={{
            fontSize: 13,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: currentModality === value || (!currentModality && !value) ? "var(--primary)" : "var(--surface)",
            color: currentModality === value || (!currentModality && !value) ? "white" : "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          {label}
        </Link>
      ))}
      <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>|</span>
      {LEVELS.map(({ value, label }) => (
        <Link
          key={value || "lvl-all"}
          href={`${base}${buildSearchParams(currentCategory, currentModality, value || undefined)}`}
          style={{
            fontSize: 13,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: currentLevel === value || (!currentLevel && !value) ? "var(--primary)" : "var(--surface)",
            color: currentLevel === value || (!currentLevel && !value) ? "white" : "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
