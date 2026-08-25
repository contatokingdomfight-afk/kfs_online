"use client";

import { useState, useTransition } from "react";
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

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
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
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={toggle}
        className="btn btn-secondary"
        style={{ fontSize: 12, padding: "4px 10px", minHeight: 28 }}
      >
        👁 {label}
      </button>
      {open && (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
          }}
        >
          {pending && viewers === null ? (
            <span style={{ color: "var(--text-secondary)" }}>A carregar…</span>
          ) : error ? (
            <span style={{ color: "var(--danger)" }}>{error}</span>
          ) : viewers && viewers.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {viewers.map((v) => (
                <li key={v.studentId} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--text-primary)" }}>{v.name}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{formatDate(v.completedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>Ninguém ainda.</span>
          )}
        </div>
      )}
    </span>
  );
}
