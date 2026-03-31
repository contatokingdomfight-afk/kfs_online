"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deleteLesson, type DeleteLessonScope } from "../actions";

type Props = { lessonId: string; turmasReturnQuery?: string; isOneOff: boolean };

export function CancelarAulaButton({ lessonId, turmasReturnQuery = "", isOneOff }: Props) {
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scope, setScope] = useState<DeleteLessonScope>("single");
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
    setScope("single");
    setError(null);
    setModalOpen(true);
  }

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      const effectiveScope: DeleteLessonScope = isOneOff ? "single" : scope;
      const result = await deleteLesson(lessonId, effectiveScope);
      if (result?.error) {
        setError(result.error);
        return;
      }

      const href = turmasReturnQuery ? `/admin/turmas?${turmasReturnQuery}` : "/admin/turmas";
      setModalOpen(false);
      // Navegação completa: mais fiável que router.push após server action (evita ficar na mesma rota).
      window.location.assign(href);
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
            <>
              <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Escolhe o âmbito. «Futuras» = mesma recorrência semanal (mesmo horário, coach, escola e dia da semana), a partir desta
                data.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: pending ? "default" : "pointer",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    color: "var(--text-primary)",
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="radio"
                    name="cancel-scope"
                    checked={scope === "single"}
                    disabled={pending}
                    onChange={() => setScope("single")}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--primary)" }}
                  />
                  <span>Cancelar apenas esta aula</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: pending ? "default" : "pointer",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    color: "var(--text-primary)",
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="radio"
                    name="cancel-scope"
                    checked={scope === "series_future"}
                    disabled={pending}
                    onChange={() => setScope("series_future")}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--primary)" }}
                  />
                  <span>Deletar esta e todas as futuras aulas a partir desta</span>
                </label>
              </div>
            </>
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
