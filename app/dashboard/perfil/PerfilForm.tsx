"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { saveStudentProfile, type SaveProfileResult } from "./actions";
import { getTranslations } from "@/lib/i18n";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";

type Props = {
  initial: {
    name: string;
    email: string;
    avatarUrl: string;
    phone: string;
    weightKg: string;
    heightCm: string;
    dateOfBirth: string;
    medicalNotes: string;
    emergencyContact: string;
  };
  locale: "pt" | "en";
};

export function PerfilForm({ initial, locale }: Props) {
  const t = getTranslations(locale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: SaveProfileResult | null, formData: FormData) => {
    setUserDismissed(false);
    return saveStudentProfile(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as SaveProfileResult | null);

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
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("personalDataTitle")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            {t("avatarLabel")}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
            {initial.avatarUrl && (
              <img
                src={initial.avatarUrl}
                alt=""
                width={64}
                height={64}
                style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
              />
            )}
            <input
              type="url"
              name="avatarUrl"
              defaultValue={initial.avatarUrl}
              className="input"
              placeholder="https://..."
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            {t("nameLabel")}
          </span>
          <input
            type="text"
            name="name"
            defaultValue={initial.name}
            className="input"
            placeholder={t("nameLabel")}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            {t("emailLabel")}
          </span>
          <input
            type="email"
            name="email"
            defaultValue={initial.email}
            className="input"
            readOnly
            disabled
            style={{ opacity: 0.9, cursor: "not-allowed" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("emailReadOnlyNote")}</span>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            {t("phoneLabel")}
          </span>
          <input
            type="tel"
            name="phone"
            defaultValue={initial.phone}
            className="input"
            placeholder="+351 912 345 678"
          />
        </label>
      </div>

      <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("weightLabel")} / {t("heightLabel")} / {t("dateOfBirthLabel")}
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("weightLabel")} ({t("weightUnit")})
        </span>
        <input
          type="number"
          name="weightKg"
          defaultValue={initial.weightKg}
          step="0.1"
          min="0"
          className="input"
          placeholder="ex: 70"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("heightLabel")} ({t("heightUnit")})
        </span>
        <input
          type="number"
          name="heightCm"
          defaultValue={initial.heightCm}
          min="0"
          className="input"
          placeholder="ex: 175"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("dateOfBirthLabel")}
        </span>
        <input
          type="date"
          name="dateOfBirth"
          defaultValue={initial.dateOfBirth}
          className="input"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("medicalNotesLabel")}
        </span>
        <textarea
          name="medicalNotes"
          defaultValue={initial.medicalNotes}
          className="input"
          rows={3}
          placeholder="Restrições, lesões, condições a ter em conta no treino..."
          style={{ resize: "vertical", minHeight: 80 }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("emergencyContactLabel")}
        </span>
        <input
          type="text"
          name="emergencyContact"
          defaultValue={initial.emergencyContact}
          className="input"
          placeholder="Nome e telefone"
        />
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        {t("saveButton")}
      </button>
    </form>
    </>
  );
}
