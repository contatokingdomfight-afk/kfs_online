"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import {
  cancelPhysicalAssessmentRequest,
  createPhysicalAssessmentRequest,
  type PhysicalAssessmentRequestActionResult,
} from "@/app/dashboard/ficha-fisica/physical-assessment-request-actions";

type Props = {
  locale: "pt" | "en";
  initialPending: boolean;
};

export function RequestPhysicalAssessmentPanel({ locale, initialPending }: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [createState, createAction] = useFormState(
    createPhysicalAssessmentRequest,
    null as PhysicalAssessmentRequestActionResult | null
  );
  const cancelWrapped = useCallback(
    async (
      _prev: PhysicalAssessmentRequestActionResult | null,
      _formData: FormData
    ): Promise<PhysicalAssessmentRequestActionResult> => cancelPhysicalAssessmentRequest(),
    []
  );
  const [cancelState, cancelAction] = useFormState(
    cancelWrapped,
    null as PhysicalAssessmentRequestActionResult | null
  );

  useEffect(() => {
    if (createState?.success || cancelState?.success) router.refresh();
  }, [createState?.success, cancelState?.success, router]);

  const createErr = createState?.error;
  const cancelErr = cancelState?.error;

  if (initialPending) {
    return (
      <div
        className="card"
        style={{
          padding: "clamp(14px, 3.5vw, 18px)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)", fontSize: "clamp(15px, 3.8vw, 16px)" }}>
          {t("physAssessRequestPendingTitle")}
        </p>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 15px)" }}>
          {t("physAssessRequestPendingBody")}
        </p>
        <form action={cancelAction}>
          <button type="submit" className="btn btn-secondary">
            {t("physAssessRequestCancelButton")}
          </button>
        </form>
        {cancelErr ? (
          <p role="alert" style={{ margin: 0, color: "var(--danger, #c0392b)", fontSize: 14 }}>
            {cancelErr}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: "clamp(14px, 3.5vw, 18px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)", fontSize: "clamp(15px, 3.8vw, 16px)" }}>
        {t("physAssessRequestTitle")}
      </p>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 15px)" }}>
        {t("physAssessRequestIntro")}
      </p>
      <form action={createAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t("physAssessRequestNoteLabel")}</span>
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            className="input"
            style={{ resize: "vertical", minHeight: 72 }}
            placeholder={t("physAssessRequestNotePlaceholder")}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          {t("physAssessRequestSubmit")}
        </button>
      </form>
      {createErr ? (
        <p role="alert" style={{ margin: 0, color: "var(--danger, #c0392b)", fontSize: 14 }}>
          {createErr}
        </p>
      ) : null}
    </div>
  );
}
