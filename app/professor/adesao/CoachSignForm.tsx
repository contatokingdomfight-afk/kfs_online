"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { signCoachDocuments, type CoachAdesaoResult } from "./actions";

export function CoachSignForm({ schoolId }: { schoolId: string }) {
  const [state, formAction, pending] = useActionState<CoachAdesaoResult | null, FormData>(signCoachDocuments, null);
  const padRef = useRef<SignaturePadHandle>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLocalError(null);
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setLocalError("Assina no espaço indicado antes de continuar.");
      return;
    }
    setCapturing(true);
    try {
      const blob = await pad.toBlob();
      if (!blob) {
        setLocalError("Não foi possível capturar a assinatura. Tenta outra vez.");
        return;
      }
      const fd = new FormData(form);
      fd.set("signature", new File([blob], "signature.png", { type: "image/png" }));
      startTransition(() => formAction(fd));
    } finally {
      setCapturing(false);
    }
  }

  const busy = pending || capturing;
  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" name="acceptContract" style={{ marginTop: 3 }} />
        <span>Li e aceito o contrato de prestação de serviços, incluindo os Anexos I e II.</span>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" name="acceptTerm" style={{ marginTop: 3 }} />
        <span>Li e aceito o termo de adesão do professor.</span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
        Escreve o teu nome completo para assinar
        <input name="signatureName" className="input" required autoComplete="name" />
      </label>
      <SignaturePad ref={padRef} label="Assinatura (desenha com o dedo ou o rato)" />
      {(localError || state?.error) && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>
          {localError || state?.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "A guardar…" : "Assinar os dois documentos"}
      </button>
    </form>
  );
}
