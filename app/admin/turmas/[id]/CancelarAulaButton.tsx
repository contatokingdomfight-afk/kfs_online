"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DeleteLessonResult } from "@/lib/admin/delete-lesson";

type Props = {
  lessonId: string;
  turmasReturnQuery?: string;
  isOneOff: boolean;
  /** Se vier da agenda com data concreta (recorrente), permite cancelar só essa semana. */
  occurrenceDate?: string | null;
};

export function CancelarAulaButton({ lessonId, turmasReturnQuery = "", isOneOff, occurrenceDate }: Props) {
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"cancelWeek" | "deleteSeries">("cancelWeek");

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
    if (!isOneOff && occurrenceDate) {
      setMode("cancelWeek");
    } else {
      setMode("deleteSeries");
    }
    setModalOpen(true);
  }

  async function confirmDeleteSeries() {
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
          action: "deleteDefinition",
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
      setError("Não foi possível concluir. Tenta de novo.");
    } catch {
      setError("Erro ao eliminar.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCancelWeek() {
    if (!occurrenceDate) return;
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
          action: "cancelOccurrence",
          occurrenceDate,
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
      setError("Não foi possível concluir. Tenta de novo.");
    } catch {
      setError("Erro ao cancelar.");
    } finally {
      setPending(false);
    }
  }

  async function handlePrimaryConfirm() {
    if (!isOneOff && occurrenceDate && mode === "cancelWeek") {
      await confirmCancelWeek();
      return;
    }
    await confirmDeleteSeries();
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
            {isOneOff ? "Eliminar aula" : occurrenceDate ? "Cancelar ou eliminar" : "Eliminar definição"}
          </h2>
          {isOneOff ? (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Esta aula única será <strong>eliminada</strong>. Esta ação não pode ser desfeita.
            </p>
          ) : occurrenceDate ? (
            <>
              {mode === "cancelWeek" ? (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Será registado um <strong>cancelamento apenas para {occurrenceDate}</strong>. As outras semanas mantêm-se na agenda.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Será <strong>eliminada a definição</strong> desta aula (deixa de aparecer em todas as semanas). Esta ação não pode ser
                  desfeita.
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode("cancelWeek")}
                  disabled={pending}
                  style={{ opacity: mode === "cancelWeek" ? 1 : 0.75 }}
                >
                  Só esta semana
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode("deleteSeries")}
                  disabled={pending}
                  style={{ opacity: mode === "deleteSeries" ? 1 : 0.75 }}
                >
                  Série inteira
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Será <strong>eliminada a definição</strong> (a aula deixa de existir no sistema). Para cancelar apenas uma semana, abre a
              edição a partir da <strong>vista por semana</strong> na agenda (para associar a data).
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" onClick={() => !pending && setModalOpen(false)} disabled={pending} className="btn btn-secondary" style={{ minHeight: 44 }}>
              Manter
            </button>
            <button
              type="button"
              onClick={handlePrimaryConfirm}
              disabled={pending}
              className="btn btn-danger"
              style={{ minHeight: 44 }}
            >
              {pending ? "A processar…" : isOneOff
                ? "Eliminar"
                : occurrenceDate && mode === "cancelWeek"
                  ? "Cancelar esta semana"
                  : "Eliminar definição"}
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
        {pending ? "A processar…" : isOneOff ? "Eliminar aula" : "Cancelar / eliminar"}
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
