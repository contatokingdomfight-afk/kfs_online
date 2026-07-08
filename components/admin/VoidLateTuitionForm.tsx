"use client";

import { useFormState } from "react-dom";
import { voidLateTuition, type CreatePaymentResult } from "@/app/admin/financeiro/actions";
import { blurActiveElementBeforeSubmit } from "@/lib/blur-before-form-submit";

type Props = {
  studentId: string;
  referenceMonth: string;
  buttonLabel?: string;
  hint?: string | null;
  buttonClassName?: string;
};

export function VoidLateTuitionForm({
  studentId,
  referenceMonth,
  buttonLabel = "Anular cobrança",
  hint,
  buttonClassName = "btn btn-secondary",
}: Props) {
  const [state, action] = useFormState(voidLateTuition, null as CreatePaymentResult | null);

  return (
    <form action={action} onSubmit={blurActiveElementBeforeSubmit}>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="referenceMonth" value={referenceMonth} />
      {hint ? (
        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--text-secondary)" }}>{hint}</p>
      ) : null}
      <button type="submit" className={buttonClassName} style={{ fontSize: 14 }}>
        {buttonLabel}
      </button>
      {state?.error ? (
        <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{state.error}</p>
      ) : null}
    </form>
  );
}
