import Link from "next/link";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export const metadata = {
  title: "Bem-estar e treino | KFS",
};

const cardsPt = [
  { href: "/dashboard/bem-estar/rpe", title: "RPE pós-treino", desc: "Classifica o esforço (1–10) após as aulas recentes." },
  { href: "/dashboard/bem-estar/dores", title: "Dores", desc: "Registo por zona corporal e histórico." },
  { href: "/dashboard/bem-estar/benchmarks", title: "Testes físicos", desc: "Flexões, prancha, corrida 1 km, salto, etc." },
  { href: "/dashboard/bem-estar/peso", title: "Peso e metas", desc: "Tendência, medições e meta opcional." },
];

const cardsEn = [
  { href: "/dashboard/bem-estar/rpe", title: "Post-training RPE", desc: "Rate effort (1–10) after recent classes." },
  { href: "/dashboard/bem-estar/dores", title: "Pain", desc: "Log by body area and history." },
  { href: "/dashboard/bem-estar/benchmarks", title: "Benchmarks", desc: "Push-ups, plank, 1 km run, jump, etc." },
  { href: "/dashboard/bem-estar/peso", title: "Weight & goals", desc: "Trend, entries, optional goal." },
];

export default async function BemEstarHubPage() {
  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";
  const cards = loc === "pt" ? cardsPt : cardsEn;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Bem-estar e treino" : "Wellness & training"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Questionário de check-in (sono, hidratação, stress) fica no link de presença. Aqui pós-treino, dores, testes e peso."
          : "The check-in questionnaire (sleep, hydration, stress) is on the attendance link. Here: post-training RPE, pain, tests, and weight."}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              style={{
                display: "block",
                padding: "16px 18px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                textDecoration: "none",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "clamp(16px, 4vw, 18px)", display: "block", marginBottom: 4 }}>
                {c.title}
              </span>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{c.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
