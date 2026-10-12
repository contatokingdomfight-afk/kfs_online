"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { AdminSearchItem } from "@/lib/admin-nav-areas";

/** Sem acentos e em minúsculas, para «graduacao» encontrar «Graduação». */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * «Procurar…»: salta para qualquer página do admin pelo nome ou por palavras-chave.
 * Enter abre o primeiro resultado; setas mudam a seleção.
 */
export function AdminNavSearch({ items, autoFocus = false, compact = false }: { items: AdminSearchItem[]; autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items
      .map((it) => {
        const label = norm(it.label);
        const hay = `${label} ${norm(it.keywords)} ${norm(it.area)}`;
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2) * 10 + label.length / 100;
        return { it, score };
      })
      .filter((x): x is { it: AdminSearchItem; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((x) => x.it);
  }, [q, items]);

  function go(href: string) {
    setQ("");
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }} onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: compact ? 38 : 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <Search size={16} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(results.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter" && results[sel]) {
              e.preventDefault();
              go(results[sel].href);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Procurar… (ex.: xp, stock, tema)"
          aria-label="Procurar no admin"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="admin-nav-search-results"
          style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", color: "var(--text-primary)", font: "inherit", fontSize: 14 }}
        />
      </label>
      {open && q.trim() && (
        <ul
          id="admin-nav-search-results"
          role="listbox"
          style={{ position: "absolute", zIndex: 50, top: "calc(100% + 6px)", left: 0, right: 0, margin: 0, padding: 6, listStyle: "none", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
        >
          {results.length === 0 ? (
            <li style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-secondary)" }}>Nada encontrado.</li>
          ) : (
            results.map((r, i) => (
              <li key={r.href} role="option" aria-selected={i === sel}>
                <button
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(r.href)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: 0, background: i === sel ? "var(--bg)" : "transparent", color: "var(--text-primary)", font: "inherit", fontSize: 14, textAlign: "left", cursor: "pointer" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.area}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
