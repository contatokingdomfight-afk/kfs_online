import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { BemEstarTabs } from "./BemEstarTabs";

export const metadata = {
  title: "Bem-estar e treino | KFS",
};

export default async function BemEstarLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Bem-estar e treino" : "Wellness & training"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Questionário de check-in (sono, hidratação, stress) fica no link de presença. Aqui pós-treino, dores, testes e peso."
          : "The check-in questionnaire (sleep, hydration, stress) is on the attendance link. Here: post-training RPE, pain, tests, and weight."}
      </p>
      <BemEstarTabs locale={loc} />
      {children}
    </div>
  );
}
