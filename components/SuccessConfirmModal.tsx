"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  closeLabel: string;
};

export function SuccessConfirmModal({ open, onClose, title, message, closeLabel }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-confirm-title"
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "clamp(20px, 5vw, 28px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="success-confirm-title"
          style={{
            margin: 0,
            fontSize: "clamp(18px, 4.5vw, 22px)",
            fontWeight: 600,
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span aria-hidden style={{ fontSize: 28 }}>✓</span>
          {title}
        </p>
        {message && (
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-primary"
          style={{ alignSelf: "flex-start", minHeight: 44 }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
