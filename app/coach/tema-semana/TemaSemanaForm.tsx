"use client";

import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { saveWeekTheme, type SaveWeekThemeResult } from "./actions";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

type Props = {
  weekStart: string;
  modality: string;
  initialTitle: string;
  initialCourseId: string | null;
  initialVideoUrl: string;
  courses: { id: string; name: string }[];
  initialLocale: Locale;
};

export function TemaSemanaForm({ weekStart, modality, initialTitle, initialCourseId, initialVideoUrl, courses, initialLocale }: Props) {
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
      <input type="hidden" name="week_start" value={weekStart} />
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
          style={{ minHeight: 44 }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("libraryVideoOptional")}
        </span>
        <select name="course_id" className="input" defaultValue={initialCourseId ?? ""} style={{ minHeight: 44 }}>
          <option value="">{t("noCourseOption")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          URL do vídeo (opcional)
        </span>
        <input
          type="url"
          name="video_url"
          defaultValue={initialVideoUrl}
          className="input"
          placeholder="https://..."
          autoComplete="off"
          style={{ minHeight: 44 }}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Se não escolher um curso acima, pode colar aqui um link direto para o vídeo.
        </span>
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
