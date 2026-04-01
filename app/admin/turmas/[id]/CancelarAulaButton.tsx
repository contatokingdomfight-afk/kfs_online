"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DeleteLessonResult } from "@/lib/admin/delete-lesson";

type Props = { lessonId: string; turmasReturnQuery?: string; isOneOff: boolean };

export function CancelarAulaButton({ lessonId, turmasReturnQuery = "", isOneOff }: Props) {
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setModalOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalOpen, pending]);

  function openModal() {
    setError(null);
    setModalOpen(true);
  }

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/turmas/delete-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          lessonId,
          returnQuery: turmasReturnQuery || undefined,
        }),
      });
      const result = (await res.json()) as DeleteLessonResult;
      if (res.status === 403) {
        setError(result.error ?? "Não autorizado.");
        return;
      }
      if (!res.ok) {
        setError(result.error ?? "Pedido inválido.");
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success && result.redirectTo) {
        setModalOpen(false);
        window.location.assign(result.redirectTo);
        return;
      }
      setError("Não foi possível concluir o cancelamento. Tenta de novo.");
    } catch {
      setError("Erro ao cancelar aula.");
    } finally {
      setPending(false);
    }
  }

  const modal =
    modalOpen && mounted ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-lesson-title"
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
        onClick={(e) => e.target === e.currentTarget && !pending && setModalOpen(false)}
      >
        <div
          className="card"
          style={{
            maxWidth: 440,
            width: "100%",
            padding: "clamp(20px, 5vw, 28px)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="cancel-lesson-title"
            style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600, color: "var(--text-primary)" }}
          >
            Cancelar aula
          </h2>
          {isOneOff ? (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Esta é uma <strong>aula única</strong>. Será <strong>eliminada</strong> apenas esta ocorrência. Esta ação não pode ser
              desfeita.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Serão <strong>eliminadas esta ocorrência e todas as futuras</strong> da mesma série semanal (mesmo horário, coach, escola e
              dia da semana), a partir desta data. Esta ação não pode ser desfeita.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" onClick={() => !pending && setModalOpen(false)} disabled={pending} className="btn btn-secondary" style={{ minHeight: 44 }}>
              Manter
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="btn btn-danger"
              style={{ minHeight: 44 }}
            >
              {pending ? "A processar…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div style={{ marginTop: "clamp(20px, 5vw, 24px)" }}>
      <button
        type="button"
        onClick={openModal}
        disabled={pending}
        className="btn"
        style={{
          background: "var(--danger)",
          color: "#fff",
          border: "none",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "A cancelar…" : "Cancelar aula"}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
