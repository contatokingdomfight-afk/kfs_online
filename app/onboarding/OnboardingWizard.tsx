"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import { getTranslations } from "@/lib/i18n";

const GOALS = [
  { id: "DEFESA_PESSOAL", labelPt: "Aprender Defesa Pessoal", labelEn: "Learn Self-Defense" },
  { id: "COMPETIR", labelPt: "Competir", labelEn: "Compete" },
  { id: "CONDICIONAMENTO", labelPt: "Condicionamento Físico", labelEn: "Physical Conditioning" },
  { id: "ALIVIAR_STRESS", labelPt: "Aliviar o Stress", labelEn: "Relieve Stress" },
] as const;

type Props = {
  userName: string | null;
  schools: { id: string; name: string }[];
  locale: "pt" | "en";
};

export function OnboardingWizard({ userName, schools, locale }: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const name = userName?.trim() || t("onboardingWelcomeNameFallback");

  function toggleGoal(id: string) {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function handleFinish() {
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("dateOfBirth", dateOfBirth);
    formData.set("weightKg", weightKg);
    formData.set("heightCm", heightCm);
    formData.set("goals", JSON.stringify(goals));
    formData.set("schoolId", schoolId);
    const result = await completeOnboarding(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const totalSteps = 4;
  const isLastStep = step === totalSteps;

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: "clamp(24px, 6vw, 32px)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <p
        style={{
          fontSize: "clamp(12px, 2.5vw, 14px)",
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {t("onboardingWizardStep")} {step} {locale === "pt" ? "de" : "of"} {totalSteps}
      </p>

      {/* Step 1: Boas-vindas */}
      {step === 1 && (
        <>
          <h1
            style={{
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {locale === "pt"
              ? `Bem-vindo à Kingdom Fight School, ${name}! Vamos preparar o seu perfil de guerreiro em poucos segundos.`
              : `Welcome to Kingdom Fight School, ${name}! Let's set up your warrior profile in a few seconds.`}
          </h1>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {t("onboardingWizardStart")}
          </button>
        </>
      )}

      {/* Step 2: Dados pessoais */}
      {step === 2 && (
        <>
          <h2
            style={{
              fontSize: "clamp(18px, 4vw, 20px)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("onboardingWizardPersonalDataTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
            {t("onboardingWizardPersonalDataDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t("onboardingWizardDateOfBirth")}</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t("onboardingWizardWeight")}</span>
              <input
                type="number"
                placeholder="kg"
                min={30}
                max={200}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="input"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t("onboardingWizardHeight")}</span>
              <input
                type="number"
                placeholder="cm"
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="input"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {t("onboardingWizardNext")}
          </button>
        </>
      )}

      {/* Step 3: Objetivos */}
      {step === 3 && (
        <>
          <h2
            style={{
              fontSize: "clamp(18px, 4vw, 20px)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("onboardingWizardGoalsTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GOALS.map((g) => (
              <label
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: goals.includes(g.id) ? "var(--primary-light, rgba(var(--primary-rgb), 0.1))" : "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={goals.includes(g.id)}
                  onChange={() => toggleGoal(g.id)}
                  style={{ width: 20, height: 20 }}
                />
                <span style={{ fontSize: 15 }}>{locale === "pt" ? g.labelPt : g.labelEn}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {t("onboardingWizardNext")}
          </button>
        </>
      )}

      {/* Step 4: Escola */}
      {step === 4 && (
        <>
          <h2
            style={{
              fontSize: "clamp(18px, 4vw, 20px)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("onboardingWizardSchoolTitle")}
          </h2>
          {schools.length > 0 ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t("onboardingWizardSchoolSelect")}</span>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="input"
                style={{ padding: "12px 14px" }}
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              {t("onboardingWizardSchoolNone")}
            </p>
          )}
          {error && (
            <p style={{ fontSize: 14, color: "var(--danger)", margin: 0 }}>{error}</p>
          )}
          <button
            type="button"
            onClick={handleFinish}
            disabled={loading}
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? t("loading") : t("onboardingWizardFinish")}
          </button>
        </>
      )}

      {step > 1 && step < 4 && (
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          className="btn btn-secondary"
          style={{ alignSelf: "flex-start" }}
        >
          {t("onboardingBack")}
        </button>
      )}
    </div>
  );
}
