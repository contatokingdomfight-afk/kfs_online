"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { saveWeekTheme, type SaveWeekThemeResult } from "./actions";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { PUBLIC_SCHEDULE_WEEKDAYS, weekdayShortLabelForPublicSchedule } from "@/lib/weekday-labels";

type Props = {
  weekStart: string;
  modality: string;
  initialTitle: string;
  initialDescription: string;
  initialCourseId: string | null;
  initialUnitId: string | null;
  initialVideoUrl: string;
  initialDaysByWeekday: Record<number, string>;
  courses: { id: string; name: string }[];
  unitsByCourse: Record<string, { id: string; name: string }[]>;
  initialLocale: Locale;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "color-mix(in srgb, var(--bg) 40%, #000 45%)",
};

const dialogCardStyle: CSSProperties = {
  maxWidth: "min(400px, 100%)",
  width: "100%",
  padding: "clamp(20px, 5vw, 28px)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

function ThemeSavePendingLayer({ savingLabel }: { savingLabel: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div style={overlayStyle} role="status" aria-live="assertive" aria-busy>
      <div
        style={{
          ...dialogCardStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            animation: "coachTemaSaveSpin 0.75s linear infinite",
          }}
        />
        <p style={{ margin: 0, textAlign: "center", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {savingLabel}
        </p>
        <style>{`@keyframes coachTemaSaveSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function ThemeSaveSubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }} disabled={pending}>
      {pending ? savingLabel : label}
    </button>
  );
}

type SuccessModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  okLabel: string;
};

function ThemeSaveSuccessModal({ open, onClose, title, body, okLabel }: SuccessModalProps) {
  const titleId = useId();
  if (!open) return null;
  return (
    <div
      style={{ ...overlayStyle, zIndex: 9999 }}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <div style={dialogCardStyle}>
        <h2 id={titleId} style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 700, color: "var(--text-primary)" }}>
          {title}
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: "clamp(15px, 3.8vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {body}
        </p>
        <button type="button" className="btn btn-primary" style={{ minHeight: 44, width: "100%" }} onClick={onClose}>
          {okLabel}
        </button>
      </div>
    </div>
  );
}

function ThemeSaveSuccessGate(props: SuccessModalProps) {
  const { pending } = useFormStatus();
  if (pending) return null;
  return <ThemeSaveSuccessModal {...props} />;
}

export function TemaSemanaForm({
  weekStart,
  modality,
  initialTitle,
  initialDescription,
  initialCourseId,
  initialUnitId,
  initialVideoUrl,
  initialDaysByWeekday,
  courses,
  unitsByCourse,
  initialLocale,
}: Props) {
  const t = getTranslations(initialLocale);
  const [state, formAction] = useFormState(saveWeekTheme, null as SaveWeekThemeResult | null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId ?? "");
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId ?? "");
  const unitsForSelectedCourse = selectedCourseId ? unitsByCourse[selectedCourseId] ?? [] : [];

  useEffect(() => {
    if (state?.error) setSuccessOpen(false);
    if (state?.success) setSuccessOpen(true);
  }, [state]);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        position: "relative",
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
      }}
    >
      <ThemeSavePendingLayer savingLabel={t("themeSaveSaving")} />
      <ThemeSaveSuccessGate
        open={successOpen && state?.success === true}
        onClose={() => setSuccessOpen(false)}
        title={t("themeSaveSuccessTitle")}
        body={t("themeSaveSuccessBody")}
        okLabel={t("themeSaveSuccessOk")}
      />
      <input type="hidden" name="modality" value={modality} />
      <input type="hidden" name="week_start" value={weekStart} />
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {MODALITY_LABELS[modality] ?? modality}
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("themeTitleLabel")}</span>
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
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("themeDescriptionLabel")}</span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          placeholder={t("themeDescriptionPlaceholder")}
          rows={5}
          maxLength={2000}
          style={{ minHeight: 120, resize: "vertical", lineHeight: 1.5 }}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("themeDescriptionHint")}</span>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("themeDaysLabel")}</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {PUBLIC_SCHEDULE_WEEKDAYS.map((weekday) => (
            <label key={weekday} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                {weekdayShortLabelForPublicSchedule(weekday, initialLocale)}
              </span>
              <input
                type="text"
                name={`day_${weekday}`}
                defaultValue={initialDaysByWeekday[weekday] ?? ""}
                className="input"
                maxLength={200}
                autoComplete="off"
                style={{ minHeight: 44 }}
              />
            </label>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("themeDaysHint")}</span>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("libraryVideoOptional")}</span>
        <select
          name="course_id"
          className="input"
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setSelectedUnitId("");
          }}
          style={{ minHeight: 44 }}
        >
          <option value="">{t("noCourseOption")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {selectedCourseId && unitsForSelectedCourse.length > 0 && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("themeUnitLabel")}</span>
          <select
            name="unit_id"
            className="input"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            style={{ minHeight: 44 }}
          >
            <option value="">{t("noUnitOption")}</option>
            {unitsForSelectedCourse.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("themeUnitHint")}</span>
        </label>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{t("themeVideoUrlLabel")}</span>
        <input
          type="url"
          name="video_url"
          defaultValue={initialVideoUrl}
          className="input"
          placeholder={t("themeVideoUrlPlaceholder")}
          autoComplete="off"
          style={{ minHeight: 44 }}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("themeVideoUrlHint")}</span>
      </label>
      {state?.error && <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>}
      <ThemeSaveSubmitButton label={t("saveTheme")} savingLabel={t("themeSaveSaving")} />
    </form>
  );
}
