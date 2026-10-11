"use client";

import { useState, type ReactNode } from "react";

type Tab = { id: string; label: string; content: ReactNode };

/**
 * Separadores simples: só o separador ativo é montado (os gráficos medem a largura ao aparecer).
 * O conteúdo chega já renderizado do servidor (ReactNode), por isso pode ser qualquer secção.
 */
export function ContentTabs({ tabs, ariaLabel, initialTab }: { tabs: Tab[]; ariaLabel: string; initialTab?: string }) {
  const [active, setActive] = useState(initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div role="tablist" aria-label={ariaLabel} style={{ display: "inline-flex", alignSelf: "flex-start", gap: 4, padding: 4, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", maxWidth: "100%", overflowX: "auto" }}>
        {tabs.map((t) => {
          const on = t.id === current?.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`tabpanel-${t.id}`}
              onClick={() => setActive(t.id)}
              style={{ minHeight: 38, padding: "0 18px", borderRadius: 9, border: "none", background: on ? "var(--primary)" : "transparent", color: on ? "#fff" : "var(--text-secondary)", font: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <div role="tabpanel" id={`tabpanel-${current.id}`} aria-labelledby={`tab-${current.id}`} style={{ minWidth: 0 }}>
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
