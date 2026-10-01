"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { submitTrialRequest, type SubmitTrialResult } from "./actions";

type ModalityOption = { value: string; label: string };
type LessonSlot = { id: string; occurrenceDate: string; label: string };

function buildNoSlotsWhatsAppUrl(phone: string, locale: Locale, modalityLabel?: string): string {
  const digits = phone.replace(/\D/g, "");
  const message =
    locale === "en"
      ? `Hi! I'd like to book a trial class${modalityLabel ? ` for ${modalityLabel}` : ""}, but I couldn't find an available time online.`
      : `Olá! Gostaria de marcar uma aula experimental${modalityLabel ? ` de ${modalityLabel}` : ""}, mas não encontrei horário disponível online.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function FormularioExperimental({
  locale,
  schools,
  defaultSchoolId,
  modalityOptions,
  lessonsBySchoolId,
  referrerStudentId,
  interestedPlanName,
  schoolPhone,
}: {
  locale: Locale;
  schools: { id: string; name: string }[];
  defaultSchoolId?: string;
  modalityOptions: ModalityOption[];
  lessonsBySchoolId: Record<string, Record<string, LessonSlot[]>>;
  /** Aluno que partilhou o link de indicação (`?ref=`), se aplicável. */
  referrerStudentId?: string | null;
  /** Plano clicado na home (`?plano=<id>`), já resolvido para o nome público. */
  interestedPlanName?: string | null;
  schoolPhone: string;
}) {
  const t = getTranslations(locale);
  const [state, formAction] = useFormState(submitTrialRequest, null as SubmitTrialResult | null);
  const [schoolId, setSchoolId] = useState(defaultSchoolId || schools[0]?.id || "");
  const [selectedModality, setSelectedModality] = useState<string>("");

  const modalitiesForSchool = useMemo(() => {
    if (!schoolId) return [];
    const byMod = lessonsBySchoolId[schoolId] ?? {};
    return modalityOptions.filter((o) => (byMod[o.value] ?? []).length > 0);
  }, [schoolId, lessonsBySchoolId, modalityOptions]);

  useEffect(() => {
    const first = modalitiesForSchool[0]?.value ?? "";
    setSelectedModality(first);
  }, [schoolId, modalitiesForSchool]);

  const slotsForModality = useMemo(() => {
    if (!schoolId || !selectedModality) return [];
    return lessonsBySchoolId[schoolId]?.[selectedModality] ?? [];
  }, [schoolId, selectedModality, lessonsBySchoolId]);

  const hasSlots = slotsForModality.length > 0;
  const selectedModalityLabel = modalityOptions.find((o) => o.value === selectedModality)?.label;

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      {referrerStudentId && <input type="hidden" name="referrerStudentId" value={referrerStudentId} />}
      {interestedPlanName && (
        <>
          <input type="hidden" name="interestedPlanName" value={interestedPlanName} />
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              fontSize: "clamp(13px, 3.2vw, 14px)",
              color: "var(--text-primary)",
            }}
          >
            {t("trialFormInterestedPlan")}: <strong>{interestedPlanName}</strong>
          </div>
        </>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormSchool")} *
        </span>
        <select
          name="schoolId"
          required
          className="input"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          aria-label={t("trialFormSchool")}
        >
          {schools.length === 0 ? (
            <option value="">{t("trialFormSchoolNone")}</option>
          ) : (
            schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormName")} *
        </span>
        <input type="text" name="name" required className="input" placeholder={t("trialFormPlaceholderName")} autoComplete="name" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormPhone")} *
        </span>
        <input
          type="tel"
          name="contact"
          required
          className="input"
          placeholder={t("trialFormPlaceholderPhone")}
          autoComplete="tel"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormEmail")} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t("waitlistOptional")}</span>
        </span>
        <input
          type="email"
          name="email"
          className="input"
          placeholder={t("trialFormPlaceholderEmail")}
          autoComplete="email"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormModality")} *
        </span>
        <select
          name="modality"
          required
          className="input"
          value={selectedModality}
          onChange={(e) => setSelectedModality(e.target.value)}
          disabled={modalitiesForSchool.length === 0}
        >
          {modalitiesForSchool.length === 0 ? (
            <option value="">{t("trialFormModalityChoose")}</option>
          ) : (
            modalitiesForSchool.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("trialFormDateTime")} *
        </span>
        {hasSlots ? (
          <select name="lessonSlot" required className="input">
            <option value="">{t("trialFormSlotChoose")}</option>
            {slotsForModality.map((slot) => (
              <option key={`${slot.id}::${slot.occurrenceDate}`} value={`${slot.id}::${slot.occurrenceDate}`}>
                {slot.label}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-secondary)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-secondary)",
            }}
          >
            <span>{t("trialFormNoSlots")}</span>
            <a
              href={buildNoSlotsWhatsAppUrl(schoolPhone, locale, selectedModalityLabel)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              {t("trialFormNoSlotsWhatsApp")}
            </a>
          </div>
        )}
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={!hasSlots || !schoolId}>
        {t("trialFormSubmit")}
      </button>
    </form>
  );
}
