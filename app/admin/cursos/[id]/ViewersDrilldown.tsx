"use client";

import { useEffect, useState, useTransition } from "react";
import type { ViewerRow } from "../stats-actions";

type Props = {
  label: string;
  fetchViewers: () => Promise<{ viewers: ViewerRow[]; error?: string }>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function ViewersDrilldown({ label, fetchViewers }: Props) {
  const [open, setOpen] = useState(false);
  const [viewers, setViewers] = useState<ViewerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    if (viewers === null) {
      startTransition(async () => {
        const res = await fetchViewers();
        if (res.error) setError(res.error);
        setViewers(res.viewers);
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="btn btn-secondary"
        style={{ fontSize: 12, padding: "4px 10px", minHeight: 28 }}
      >
        👁 {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="viewers-drilldown-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backgroundColor: "rgba(0,0,0,0.5)",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 420,
              width: "100%",
              maxHeight: "min(70vh, 520px)",
              padding: "clamp(18px, 4.5vw, 24px)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 id="viewers-drilldown-title" style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                👁 {label}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="btn btn-secondary"
                style={{ fontSize: 14, padding: "4px 10px", minHeight: 32 }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {pending && viewers === null ? (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>A carregar…</p>
              ) : error ? (
                <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{error}</p>
              ) : viewers && viewers.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {viewers.map((v) => (
                    <li
                      key={v.studentId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "8px 10px",
                        background: "var(--bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 14,
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>{v.name}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{formatDate(v.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ninguém ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
