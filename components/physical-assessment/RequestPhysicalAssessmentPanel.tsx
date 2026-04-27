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

  const shellClass =
    "flex w-full min-w-0 flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-sm sm:p-5 lg:gap-5 lg:p-6";

  if (initialPending) {
    return (
      <div className={shellClass}>
        <p className="m-0 text-base font-semibold text-[var(--text-primary)] sm:text-lg">{t("physAssessRequestPendingTitle")}</p>
        <p className="m-0 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
          {t("physAssessRequestPendingBody")}
        </p>
        <form action={cancelAction} className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-secondary">
            {t("physAssessRequestCancelButton")}
          </button>
        </form>
        {cancelErr ? (
          <p role="alert" className="m-0 text-sm text-[var(--danger,#c0392b)]">
            {cancelErr}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <p className="m-0 text-base font-semibold text-[var(--text-primary)] sm:text-lg">{t("physAssessRequestTitle")}</p>
      <p className="m-0 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
        {t("physAssessRequestIntro")}
      </p>
      <form action={createAction} className="flex min-w-0 flex-col gap-3 lg:gap-4">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("physAssessRequestNoteLabel")}</span>
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            className="input min-h-[88px] w-full min-w-0 max-w-2xl resize-y"
            placeholder={t("physAssessRequestNotePlaceholder")}
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-4">
          <button type="submit" className="btn btn-primary w-full sm:w-auto sm:min-w-[200px]">
            {t("physAssessRequestSubmit")}
          </button>
        </div>
      </form>
      {createErr ? (
        <p role="alert" className="m-0 text-sm text-[var(--danger,#c0392b)]">
          {createErr}
        </p>
      ) : null}
    </div>
  );
}
