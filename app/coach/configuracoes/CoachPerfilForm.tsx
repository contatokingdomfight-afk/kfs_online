"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { saveCoachProfile, type SaveCoachProfileResult } from "./actions";
import { getTranslations } from "@/lib/i18n";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import { ProfileAvatarField } from "@/components/ProfileAvatarField";

type Props = {
  initial: {
    name: string;
    email: string;
    avatarUrl: string;
    phone: string;
    dateOfBirth: string;
    bio: string;
    yearsExperience: string;
    instagramHandle: string;
    facebookUrl: string;
    publicProfileEnabled: boolean;
  };
  locale: "pt" | "en";
  hasCoachRow: boolean;
  publicProfileUrl: string;
};

export function CoachPerfilForm({ initial, locale, hasCoachRow, publicProfileUrl }: Props) {
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(initial.publicProfileEnabled);
  const t = getTranslations(locale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: SaveCoachProfileResult | null, formData: FormData) => {
    setUserDismissed(false);
    return saveCoachProfile(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as SaveCoachProfileResult | null);

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
          <ProfileAvatarField initialAvatarUrl={initial.avatarUrl} displayName={initial.name} locale={locale} />
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
          {hasCoachRow && (
            <>
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
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t("dateOfBirthLabel")}
                </span>
                <input type="date" name="dateOfBirth" defaultValue={initial.dateOfBirth} className="input" />
              </label>
            </>
          )}
        </div>

        {hasCoachRow && (
          <>
            <p style={{ margin: "8px 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
              {locale === "pt" ? "Perfil público de treinador" : "Public coach profile"}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              {locale === "pt"
                ? "Opcional — uma página pública com a tua bio, faixa, especialidades e depoimentos de alunos, para partilhares ou apareceres em pesquisas."
                : "Optional — a public page with your bio, belt, specialties and student testimonials, to share or show up in search."}
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                {locale === "pt" ? "Bio" : "Bio"}
              </span>
              <textarea
                name="bio"
                defaultValue={initial.bio}
                className="input"
                rows={4}
                maxLength={600}
                placeholder={locale === "pt" ? "Fala um pouco sobre o teu percurso, estilo de ensino..." : "Tell students about your background, teaching style..."}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                {locale === "pt" ? "Anos de experiência" : "Years of experience"}
              </span>
              <input
                type="number"
                name="yearsExperience"
                defaultValue={initial.yearsExperience}
                className="input"
                min={0}
                max={80}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Instagram
              </span>
              <input
                type="text"
                name="instagramHandle"
                defaultValue={initial.instagramHandle}
                className="input"
                placeholder="@teuhandle"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Facebook
              </span>
              <input
                type="url"
                name="facebookUrl"
                defaultValue={initial.facebookUrl}
                className="input"
                placeholder="https://facebook.com/..."
              />
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="publicProfileEnabled"
                checked={publicProfileEnabled}
                onChange={(e) => setPublicProfileEnabled(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                {locale === "pt" ? "Ativar o meu perfil público" : "Enable my public profile"}
              </span>
            </label>
            {publicProfileEnabled && publicProfileUrl ? (
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}
              >
                {locale === "pt" ? "Ver o meu perfil público →" : "View my public profile →"}
              </a>
            ) : null}
          </>
        )}

        {state?.error && (
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
        )}
        <button type="submit" className="btn btn-primary">
          {t("saveButton")}
        </button>
      </form>
    </>
  );
}
