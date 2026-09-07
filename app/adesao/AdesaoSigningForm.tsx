"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { signAdesaoDocuments, type SignAdesaoDocumentsResult } from "./actions";
import { FINAL_DECLARATIONS } from "@/lib/enrollment-form";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

type Props = {
  isMinor: boolean;
  planName: string;
  modalityLabel: string | null;
};

export function AdesaoSigningForm({ isMinor, planName, modalityLabel }: Props) {
  const [state, formAction] = useFormState(signAdesaoDocuments, null as SignAdesaoDocumentsResult | null);
  const formRef = useRef<HTMLFormElement>(null);
  const sigPadRef = useRef<SignaturePadHandle>(null);
  /** true só na 2.ª chamada de onSubmit (disparada por requestSubmit() após o upload) — deixa submeter normalmente. */
  const skipInterceptRef = useRef(false);
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
    e.preventDefault();
    setLocalError(null);

    const pad = sigPadRef.current;
    if (!pad || pad.isEmpty()) {
      setLocalError("Assina no espaço indicado antes de continuar.");
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
      const res = await fetch("/api/adesao/signature", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setLocalError(json.error ?? "Falha ao guardar a assinatura.");
        return;
      }
      setSignatureImageUrl(json.url as string);
      skipInterceptRef.current = true;
      setPendingSubmit(true);
    } catch {
      setLocalError("Falha ao guardar a assinatura. Verifica a ligação e tenta novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}
    >
      <input type="hidden" name="signatureImageUrl" value={signatureImageUrl} readOnly />
      <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 14, lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 6px", color: "var(--text-secondary)" }}>
          <strong>Plano:</strong> {planName}
        </p>
        {modalityLabel ? (
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            <strong>Modalidade:</strong> {modalityLabel}
          </p>
        ) : null}
      </div>

      <div
        className="card"
        style={{
          padding: "clamp(16px, 4vw, 24px)",
          maxHeight: "min(45vh, 360px)",
          overflowY: "auto",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
        dangerouslySetInnerHTML={{ __html: WAIVER_BODY_PT }}
      />

      <div
        className="card"
        style={{
          padding: "clamp(16px, 4vw, 24px)",
          maxHeight: "min(45vh, 360px)",
          overflowY: "auto",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
        dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
      />

      <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text-primary)" }}>Declarações finais</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {FINAL_DECLARATIONS.map((line) => (
            <li key={line} style={{ marginBottom: 8 }}>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {isMinor ? (
        <div>
          <label htmlFor="guardianName" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
            Nome completo do responsável legal
          </label>
          <input id="guardianName" name="guardianName" type="text" required className="input w-full" />
        </div>
      ) : null}

      <div>
        <label htmlFor="signatureName" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
          {isMinor ? "Nome do menor (confirmação)" : "Escreve o teu nome completo para assinar digitalmente"}
        </label>
        <input id="signatureName" name="signatureName" type="text" required className="input w-full" />
      </div>

      <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
        <SignaturePad ref={sigPadRef} label="Assinatura (desenha com o dedo ou o rato)" />
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" name="accepted" style={{ marginTop: 4 }} />
        <span>
          Li e compreendo o Termo de Responsabilidade e Isenção e as Condições Gerais de Adesão, e assino
          digitalmente ambos os documentos como sócio da Kingdom Fight School.
        </span>
      </label>

      {(localError || state?.error) ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{localError || state?.error}</p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link href="/adesao?passo=1" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Voltar ao comprovativo
        </Link>
        <button type="submit" className="btn btn-primary" disabled={uploading}>
          {uploading ? "A guardar assinatura…" : "Assinar e continuar para pagamento"}
        </button>
      </div>
    </form>
  );
}
