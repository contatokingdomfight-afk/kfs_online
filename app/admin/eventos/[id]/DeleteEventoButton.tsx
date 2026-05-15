"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { deleteEvent } from "../actions";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  overflow: "auto",
};

type Props = { eventId: string; eventName: string; locale: Locale };

export function DeleteEventoButton({ eventId, eventName, locale }: Props) {
  const t = getTranslations(locale);
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeModal = useCallback(() => {
    if (deleting) return;
    setConfirmOpen(false);
    setError(null);
  }, [deleting]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [confirmOpen, closeModal]);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await deleteEvent(eventId);
      if (res?.error) {
        setError(res.error);
        setDeleting(false);
      }
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setError(t("adminEventDeleteError"));
      setDeleting(false);
    }
  }

  const modalBody = t("adminEventDeleteModalBody").replace("{name}", eventName);

  return (
    <div style={{ marginTop: "clamp(20px, 5vw, 24px)" }}>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        className="btn"
        style={{
          background: "var(--danger)",
          color: "#fff",
          border: "none",
          opacity: deleting ? 0.7 : 1,
          minHeight: 44,
        }}
      >
        {t("adminEventDeleteButton")}
      </button>
      {error && !confirmOpen && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>{error}</p>
      )}

      {mounted && confirmOpen
        ? createPortal(
            <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
              <div
                className="card"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: 440,
                  width: "100%",
                  padding: "clamp(20px, 4vw, 24px)",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  id={titleId}
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "clamp(17px, 4.2vw, 20px)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {t("adminEventDeleteModalTitle")}
                </h2>
                <p
                  id={descId}
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    lineHeight: 1.5,
                    color: "var(--text-secondary)",
                  }}
                >
                  {modalBody}
                </p>
                {error && (
                  <p
                    role="alert"
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "clamp(13px, 3.2vw, 15px)",
                      color: "var(--danger)",
                    }}
                  >
                    {error}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" className="btn" onClick={closeModal} disabled={deleting} style={{ minWidth: 100 }}>
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void confirmDelete()}
                    disabled={deleting}
                    style={{
                      background: "var(--danger)",
                      color: "#fff",
                      border: "none",
                      minWidth: 120,
                      opacity: deleting ? 0.7 : 1,
                    }}
                  >
                    {deleting ? t("adminEventDeletePending") : t("adminEventDeleteModalConfirm")}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
