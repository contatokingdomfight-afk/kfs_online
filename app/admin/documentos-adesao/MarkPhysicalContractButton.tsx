"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAdesaoDocumentsOnPaper } from "./actions";

export function MarkPhysicalContractButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        `Confirmas que ${studentName} já tem o contrato físico (papel) assinado e arquivado?\n\nOs 3 documentos de adesão vão passar a ser considerados assinados, sem pedir a assinatura digital.`
      );
    if (!ok) return;
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
        onClick={handleClick}
        disabled={pending}
        className="btn btn-secondary"
        style={{ fontSize: 13, opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "A gravar…" : "📄 Já tem contrato físico"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
