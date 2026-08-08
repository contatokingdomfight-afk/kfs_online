"use client";

import { useFormState } from "react-dom";
import { updateInsuranceSettings, type UpdateInsuranceSettingsResult } from "./actions";

type Props = {
  initialAnnualAmount: number;
  initialEnrollmentAmount: number;
  initialPolicyReference: string;
};

export function InsuranceSettingsForm({
  initialAnnualAmount,
  initialEnrollmentAmount,
  initialPolicyReference,
}: Props) {
  const [state, formAction] = useFormState(updateInsuranceSettings, null as UpdateInsuranceSettingsResult | null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label htmlFor="annualAmount" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
          Valor anual do seguro (€)
        </label>
        <input
          id="annualAmount"
          name="annualAmount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={initialAnnualAmount > 0 ? String(initialAnnualAmount) : ""}
          placeholder="0.00"
          className="input w-full"
        />
      </div>
      <div>
        <label htmlFor="enrollmentAmount" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
          Taxa de matrícula (€, única na inscrição)
        </label>
        <input
          id="enrollmentAmount"
          name="enrollmentAmount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={initialEnrollmentAmount > 0 ? String(initialEnrollmentAmount) : "0"}
          placeholder="0.00"
          className="input w-full"
        />
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          Cobrada uma vez no primeiro pagamento. O admin pode isentar alunos individuais.
        </p>
      </div>
      <div>
        <label htmlFor="policyReference" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
          Referência da apólice (opcional)
        </label>
        <input
          id="policyReference"
          name="policyReference"
          type="text"
          defaultValue={initialPolicyReference}
          placeholder="N.º da apólice da escola"
          className="input w-full"
        />
      </div>
      {state?.error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p>
      ) : null}
      {state?.success ? (
        <p style={{ margin: 0, color: "var(--success, #16a34a)", fontSize: 14 }}>Definições guardadas.</p>
      ) : null}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        Guardar taxas
      </button>
    </form>
  );
}
