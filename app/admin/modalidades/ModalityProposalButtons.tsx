"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideModalityProposal } from "./actions";

/** Admin Geral: aprovar/recusar a proposta de uma escola para passar a sua modalidade para a rede. */
export function ModalityProposalButtons({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (approve: boolean) =>
    start(async () => {
      setError(null);
      const res = await decideModalityProposal(code, approve);
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <button type="button" className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 13 }} disabled={pending} onClick={() => decide(true)}>
        Passar para a rede
      </button>
      <button type="button" className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 13 }} disabled={pending} onClick={() => decide(false)}>
        Recusar
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
