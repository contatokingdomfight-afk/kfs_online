"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { uploadOrderProof, type OrderActionResult } from "../../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-secondary" disabled={pending} style={{ minHeight: 44, fontWeight: 700 }}>
      {pending ? "A enviar…" : "Enviar comprovativo"}
    </button>
  );
}

/** Comprovativo da transferência (opcional) — ajuda a secretaria a confirmar mais depressa. */
export function ProofUploadForm({ orderId, current }: { orderId: string; current: string | null }) {
  const [state, action] = useActionState(uploadOrderProof, null as OrderActionResult | null);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="orderId" value={orderId} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
          Comprovativo da transferência <span style={{ fontWeight: 400 }}>(opcional · imagem ou PDF)</span>
        </span>
        <input type="file" name="proof" accept="image/jpeg,image/png,image/webp,application/pdf" className="input" required />
      </label>
      {current && !state?.success ? <span style={{ fontSize: 12, color: "var(--success)" }}>Já enviaste: {current}. Podes substituir.</span> : null}
      {state?.success ? <span role="status" style={{ fontSize: 13, color: "var(--success)", fontWeight: 700 }}>Comprovativo enviado. Obrigado!</span> : null}
      {state?.error ? <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span> : null}
      <Submit />
    </form>
  );
}
