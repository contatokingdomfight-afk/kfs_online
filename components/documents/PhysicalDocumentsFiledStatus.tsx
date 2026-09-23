"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Undo2 } from "lucide-react";
import { unmarkDocumentsPhysicallyFiled } from "@/app/admin/documentos-adesao/actions";

type Props = {
  studentId: string;
  filedAt: string;
  filedByName: string | null;
};

/** Estado + desfazer do "impresso e arquivado" — só na ficha de admin (ver showAdminSignShortcut). */
export function PhysicalDocumentsFiledStatus({ studentId, filedAt, filedByName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUndo() {
    setError(null);
    setPending(true);
    const result = await unmarkDocumentsPhysicallyFiled(studentId);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const dateLabel = new Date(filedAt).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });

  return (
    <div
      className="card"
      style={{
        padding: "clamp(12px, 3vw, 16px)",
        marginBottom: 16,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        color: "var(--text-secondary)",
      }}
    >
      <Archive size={16} aria-hidden style={{ flexShrink: 0, color: "#16a34a" }} />
      <span>
        Impresso e arquivado em {dateLabel}
        {filedByName ? ` por ${filedByName}` : ""}.
      </span>
      <button
        type="button"
        onClick={handleUndo}
        disabled={pending}
        className="btn btn-secondary"
        style={{ fontSize: 12, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, opacity: pending ? 0.7 : 1 }}
      >
        <Undo2 size={13} aria-hidden />
        {pending ? "A desfazer…" : "Desfazer"}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)", width: "100%" }}>{error}</span>}
    </div>
  );
}
