"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModalDynamic";
import { markDocumentsPhysicallyFiled } from "./actions";

export function MarkPhysicallyFiledButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirmOpen(false);
    setError(null);
    setPending(true);
    const result = await markDocumentsPhysicallyFiled(studentId);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="btn btn-primary"
        style={{ fontSize: 13, opacity: pending ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Archive size={15} aria-hidden />
        {pending ? "A gravar…" : "Marcar como impresso e arquivado"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Documentos impressos e arquivados?"
        message={`Confirmas que já imprimiste os 3 documentos de adesão de ${studentName} e os arquivaste fisicamente? ${studentName} vai sair da lista "Por imprimir/arquivar".`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant="primary"
        loading={pending}
      />
    </div>
  );
}
