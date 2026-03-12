"use client";

import { useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: "clamp(8px, 2vw, 12px)",
        padding: "clamp(10px, 2.5vw, 14px)",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 0",
          minHeight: 44,
          border: "none",
          background: "none",
          color: "var(--text-primary)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-expanded={open}
      >
        {title}
        <span style={{ fontSize: "clamp(18px, 4.5vw, 22px)", lineHeight: 1, flexShrink: 0 }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}
