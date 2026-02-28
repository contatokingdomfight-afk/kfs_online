"use client";

import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { saveWeekTheme, type SaveWeekThemeResult } from "./actions";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

type Props = {
  modality: string;
  initialTitle: string;
  initialCourseId: string | null;
  courses: { id: string; name: string }[];
  initialLocale: Locale;
};

export function TemaSemanaForm({ modality, initialTitle, initialCourseId, courses, initialLocale }: Props) {
  const t = getTranslations(initialLocale);
  const [state, formAction] = useFormState(saveWeekTheme, null as SaveWeekThemeResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
      }}
    >
      <input type="hidden" name="modality" value={modality} />
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {MODALITY_LABELS[modality] ?? modality}
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("themeTitleLabel")}
        </span>
        <input
          type="text"
          name="title"
          defaultValue={initialTitle}
          className="input"
          placeholder={t("themeTitlePlaceholder")}
          required
          autoComplete="off"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("libraryVideoOptional")}
        </span>
        <select name="course_id" className="input" defaultValue={initialCourseId ?? ""}>
          <option value="">{t("noCourseOption")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }}>
        {t("saveTheme")}
      </button>
    </form>
  );
}
