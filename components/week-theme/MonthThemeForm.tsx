"use client";

import { useFormState, useFormStatus } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { saveMonthTheme, type SaveMonthThemeResult } from "@/lib/month-theme-actions";

type Props = {
  modality: string;
  month: string;
  initialTitle: string;
  initialDescription: string;
  locale: Locale;
};

function SubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }} disabled={pending}>
      {pending ? savingLabel : label}
    </button>
  );
}

export function MonthThemeForm({ modality, month, initialTitle, initialDescription, locale }: Props) {
  const t = getTranslations(locale);
  const [state, formAction] = useFormState(saveMonthTheme, null as SaveMonthThemeResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}
    >
      <input type="hidden" name="modality" value={modality} />
      <input type="hidden" name="month" value={month} />
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("monthThemeSectionTitle")}
      </p>
      <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 14px)", color: "var(--text-secondary)" }}>
        {t("monthThemeHint")}
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("monthThemeTitleLabel")}
        </span>
        <input
          type="text"
          name="title"
          defaultValue={initialTitle}
          className="input"
          autoComplete="off"
          style={{ minHeight: 44 }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("monthThemeDescriptionLabel")}
        </span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          rows={3}
          maxLength={2000}
          style={{ minHeight: 80, resize: "vertical", lineHeight: 1.5 }}
        />
      </label>
      {state?.error && <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>}
      {state?.success && <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)" }}>{t("monthThemeSaved")}</p>}
      <SubmitButton label={t("monthThemeSaveButton")} savingLabel={t("themeSaveSaving")} />
    </form>
  );
}
