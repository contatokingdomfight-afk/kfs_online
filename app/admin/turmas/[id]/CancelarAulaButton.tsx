"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLesson } from "../actions";
import { ConfirmModal } from "@/components/ConfirmModal";

type Props = { lessonId: string };

export function CancelarAulaButton({ lessonId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      const result = await deleteLesson(lessonId);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (result?.success !== true) return;
      setModalOpen(false);
      router.push("/admin/turmas");
    } catch {
      setError("Erro ao cancelar aula.");
      setPending(false);
    }
  }

  return (
    <div style={{ marginTop: "clamp(20px, 5vw, 24px)" }}>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
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
      <ConfirmModal
        open={modalOpen}
        onClose={() => !pending && setModalOpen(false)}
        onConfirm={handleConfirm}
        title="Cancelar aula"
        message="Tem certeza que deseja cancelar esta aula? Esta ação não pode ser desfeita."
        confirmLabel="Sim, cancelar aula"
        cancelLabel="Não, manter"
        variant="danger"
        loading={pending}
      />
    </div>
  );
}
