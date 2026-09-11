"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { updateSchoolSignature, type UpdateSchoolSignatureResult } from "../actions";

type Props = {
  userId: string;
  initialSignsForSchool: boolean;
  initialSignatureImageUrl: string | null;
};

export function SchoolSignatureSection({ userId, initialSignsForSchool, initialSignatureImageUrl }: Props) {
  const [state, formAction] = useFormState(updateSchoolSignature, null as UpdateSchoolSignatureResult | null);
  const formRef = useRef<HTMLFormElement>(null);
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const skipInterceptRef = useRef(false);

  const [signsForSchool, setSignsForSchool] = useState(initialSignsForSchool);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState(initialSignatureImageUrl);
  const [redrawing, setRedrawing] = useState(!initialSignatureImageUrl);
  const [pendingSignatureUrl, setPendingSignatureUrl] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      setLocalError(null);
      if (pendingSignatureUrl) {
        setSavedSignatureUrl(pendingSignatureUrl);
        setRedrawing(false);
        setPendingSignatureUrl("");
      }
    }
  }, [state, pendingSignatureUrl]);

  useEffect(() => {
    if (!pendingSubmit) return;
    formRef.current?.requestSubmit();
    setPendingSubmit(false);
  }, [pendingSubmit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (skipInterceptRef.current) {
      skipInterceptRef.current = false;
      return;
    }
    // Sem alteração à assinatura desenhada (só a checkbox mudou, ou já há assinatura guardada): submete normalmente.
    if (!redrawing || !signsForSchool) return;

    e.preventDefault();
    setLocalError(null);
    const pad = sigPadRef.current;
    if (!pad || pad.isEmpty()) {
      setLocalError("Desenha a assinatura antes de guardar.");
      return;
    }

    setUploading(true);
    try {
      const blob = await pad.toBlob();
      if (!blob) {
        setLocalError("Não foi possível capturar a assinatura. Tenta novamente.");
        return;
      }
      const body = new FormData();
      body.append("file", blob, "signature.png");
      const res = await fetch("/api/admin/school-signature", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setLocalError(json.error ?? "Falha ao guardar a assinatura.");
        return;
      }
      setPendingSignatureUrl(json.url as string);
      skipInterceptRef.current = true;
      setPendingSubmit(true);
    } catch {
      setLocalError("Falha ao guardar a assinatura. Verifica a ligação e tenta novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: 24 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Assinatura fixa pela escola</h2>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Quando marcado, a assinatura deste admin aparece automaticamente nos comprovativos, contratos e termos de
        responsabilidade dos alunos, ao lado da assinatura do aluno.
      </p>

      <form ref={formRef} action={formAction} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="signsForSchool" value={signsForSchool ? "true" : "false"} />
        <input type="hidden" name="signatureImageUrl" value={pendingSignatureUrl} readOnly />

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={signsForSchool}
            onChange={(e) => setSignsForSchool(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontWeight: 600 }}>Assina contratos pela escola</span>
        </label>

        {signsForSchool ? (
          <>
            {savedSignatureUrl && !redrawing ? (
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Assinatura guardada</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={savedSignatureUrl}
                  alt="Assinatura desenhada"
                  style={{ maxWidth: 260, background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                />
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setRedrawing(true)}>
                    Redesenhar assinatura
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <SignaturePad ref={sigPadRef} label="Assinatura (desenha com o dedo ou o rato)" />
              </div>
            )}
          </>
        ) : null}

        {(localError || state?.error) ? (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{localError || state?.error}</p>
        ) : null}
        {state?.success && !localError ? (
          <p style={{ margin: 0, color: "var(--success, #16a34a)", fontSize: 14 }}>Guardado.</p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={uploading} style={{ alignSelf: "flex-start" }}>
          {uploading ? "A guardar assinatura…" : "Guardar"}
        </button>
      </form>
    </section>
  );
}
