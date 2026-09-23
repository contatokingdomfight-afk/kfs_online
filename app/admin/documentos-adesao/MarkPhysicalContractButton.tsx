"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModalDynamic";
import { markAdesaoDocumentsOnPaper } from "./actions";

export function MarkPhysicalContractButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirmOpen(false);
    setError(null);
    setPending(true);
    const result = await markAdesaoDocumentsOnPaper(studentId);
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
        className="btn btn-secondary"
        style={{ fontSize: 13, opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "A gravar…" : "📄 Já tem contrato físico"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Contrato físico já assinado?"
        message={`Confirmas que ${studentName} já tem o contrato físico (papel) assinado e arquivado? Os 3 documentos de adesão (Comprovativo, Condições Gerais, Termo de Responsabilidade) vão passar a ser considerados assinados, sem pedir a assinatura digital.`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant="primary"
        loading={pending}
      />
    </div>
  );
}
