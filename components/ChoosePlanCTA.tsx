import Link from "next/link";
import { Sparkles } from "lucide-react";

type Props = {
  message?: string;
  ctaLabel?: string;
};

export function ChoosePlanCTA({
  message = "Seu perfil está pronto! Escolha um plano para desbloquear as aulas, a biblioteca e começar a treinar de verdade. 💪",
  ctaLabel = "Ver Planos e Preços",
}: Props) {
  return (
    <div
      role="banner"
      style={{
        backgroundColor: "var(--primary)",
        color: "#fff",
        padding: "clamp(16px, 4vw, 20px)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", lineHeight: 1.4 }}>
        {message}
      </p>
      <Link
        href="/escolher-plano"
        className="btn"
        style={{
          backgroundColor: "#fff",
          color: "var(--primary)",
          fontWeight: 600,
          textDecoration: "none",
          padding: "10px 20px",
          borderRadius: 8,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Sparkles size={16} aria-hidden />
        {ctaLabel}
      </Link>
    </div>
  );
}
