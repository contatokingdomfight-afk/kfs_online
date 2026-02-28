"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { updateAttendanceGoal, type UpdateAttendanceGoalResult } from "./actions";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";

type Props = { initialTargetValue: number; initialLocale: Locale };

export function MetaAssiduidadeForm({ initialTargetValue, initialLocale }: Props) {
  const t = getTranslations(initialLocale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: UpdateAttendanceGoalResult | null, formData: FormData) => {
    setUserDismissed(false);
    return updateAttendanceGoal(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as UpdateAttendanceGoalResult | null);

  const showSuccess = Boolean(state?.success && !state?.error && !userDismissed);

  return (
    <>
      <SuccessConfirmModal
        open={showSuccess}
        onClose={() => setUserDismissed(true)}
        title={t("savedSuccessTitle")}
        message={t("savedSuccessMessage")}
        closeLabel={t("closeConfirm")}
      />
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            {t("classesPerMonth")}
          </span>
          <input
            type="number"
            name="target_value"
            defaultValue={initialTargetValue}
            className="input"
            min={1}
            max={99}
            required
            style={{ maxWidth: 120 }}
          />
        </label>
        {state?.error && (
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
        )}
        <button type="submit" className="btn btn-primary" style={{ minHeight: 44, alignSelf: "flex-start" }}>
          {t("saveGoal")}
        </button>
      </form>
    </>
  );
}
