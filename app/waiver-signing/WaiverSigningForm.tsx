"use client";

import { useFormState } from "react-dom";
import { signWaiver, type SignWaiverResult } from "./actions";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";

type Props = {
  isMinor: boolean;
};

export function WaiverSigningForm({ isMinor }: Props) {
  const [state, formAction] = useFormState(signWaiver, null as SignWaiverResult | null);

  return (
    <form action={formAction} style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        className="card"
        style={{
          padding: "clamp(16px, 4vw, 24px)",
          maxHeight: "min(50vh, 400px)",
          overflowY: "auto",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
        dangerouslySetInnerHTML={{ __html: WAIVER_BODY_PT }}
      />

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
        <span>Li e compreendo os termos acima e assino digitalmente este documento.</span>
      </label>

      {state?.error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}

      <button type="submit" className="btn btn-primary">
        Assinar e continuar
      </button>
    </form>
  );
}
