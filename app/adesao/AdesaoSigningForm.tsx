"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signAdesaoDocuments, type SignAdesaoDocumentsResult } from "./actions";
import { FINAL_DECLARATIONS } from "@/lib/enrollment-form";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";

type Props = {
  isMinor: boolean;
  planName: string;
  modalityLabel: string | null;
};

export function AdesaoSigningForm({ isMinor, planName, modalityLabel }: Props) {
  const [state, formAction] = useFormState(signAdesaoDocuments, null as SignAdesaoDocumentsResult | null);

  return (
    <form action={formAction} style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
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

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" name="accepted" style={{ marginTop: 4 }} />
        <span>
          Li e compreendo o Termo de Responsabilidade e Isenção e as Condições Gerais de Adesão, e assino
          digitalmente ambos os documentos como sócio da Kingdom Fight School.
        </span>
      </label>

      {state?.error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link href="/adesao?passo=1" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Voltar ao comprovativo
        </Link>
        <button type="submit" className="btn btn-primary">
          Assinar e continuar para pagamento
        </button>
      </div>
    </form>
  );
}
