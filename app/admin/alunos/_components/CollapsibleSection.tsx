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
        marginBottom: "clamp(12px, 3vw, 16px)",
        padding: "clamp(12px, 3vw, 16px)",
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
          padding: 0,
          border: "none",
          background: "none",
          color: "var(--text-primary)",
          fontSize: "clamp(13px, 3.2vw, 15px)",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        {title}
        <span style={{ fontSize: "clamp(16px, 4vw, 20px)", lineHeight: 1 }}>
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
