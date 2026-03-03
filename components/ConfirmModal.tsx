"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "danger" | "primary";
  loading?: boolean;
};

export function ConfirmModal(props: Props) {
  const {
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = "danger",
    loading = false,
  } = props;

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
      aria-labelledby="confirm-modal-title"
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
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
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
        <h2 id="confirm-modal-title" style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </h2>
        {message && (
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>{message}</p>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary" style={{ minHeight: 44 }}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={variant === "danger" ? "btn btn-danger" : "btn btn-primary"}
            style={{ minHeight: 44 }}
          >
            {loading ? "A processar…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
