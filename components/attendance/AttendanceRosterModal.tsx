"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type AttendanceRosterAttendee = {
  id: string;
  name: string;
  isExperimental: boolean;
  status: string;
};

type Props = {
  modalityLabel: string;
  dateLabel: string;
  timeLabel: string;
  attendees: AttendanceRosterAttendee[];
  statusLabel: Record<string, string>;
  manageHref: string | null;
  onClose: () => void;
};

export function AttendanceRosterModal({
  modalityLabel,
  dateLabel,
  timeLabel,
  attendees,
  statusLabel,
  manageHref,
  onClose,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-roster-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "clamp(20px, 5vw, 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 id="attendance-roster-modal-title" style={{ margin: "0 0 4px 0", fontSize: "clamp(17px, 4vw, 19px)", fontWeight: 600, color: "var(--text-primary)" }}>
              {modalityLabel}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {dateLabel} · {timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="btn"
            style={{ width: 36, height: 36, padding: 0, borderRadius: "50%", flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {attendees.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ninguém marcou presença ainda.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {attendees.map((a) => (
              <li key={a.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ color: "var(--text-primary)" }}>{a.name}</span>
                {a.isExperimental && (
                  <span style={{ fontSize: 12, padding: "2px 6px", backgroundColor: "var(--warning)", borderRadius: 4, color: "var(--text-primary)" }}>
                    Exp.
                  </span>
                )}
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: a.status === "CONFIRMED" ? "var(--success)" : a.status === "ABSENT" ? "var(--danger)" : "var(--bg)",
                    color: a.status === "CONFIRMED" || a.status === "ABSENT" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {statusLabel[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {manageHref && (
          <div style={{ marginTop: 20 }}>
            <Link href={manageHref} className="btn btn-primary" style={{ textDecoration: "none" }}>
              Ver/confirmar →
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  if (!portalReady) return null;
  return createPortal(modal, document.body);
}
