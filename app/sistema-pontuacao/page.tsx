import type { Metadata } from "next";
import { PilaresAccordion } from "./PilaresAccordion";
import { NiveisXPSection } from "./NiveisXPSection";

export const metadata: Metadata = {
  title: "Sistema de pontuação | Kingdom Fight School",
  description: "Como funciona a avaliação, os 5 pilares, os níveis e o XP na plataforma Kingdom Fight School.",
};

export default function SistemaPontuacaoPage() {
  return (
    <div style={{ maxWidth: "min(640px, 100%)", margin: "0 auto", padding: "clamp(20px, 5vw, 32px) 0" }}>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 24px) 0", fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>
        Sistema de pontuação
      </h1>
      <p style={{ margin: "0 0 clamp(24px, 6vw, 32px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Esta página explica como as avaliações, o radar de performance, os níveis e o XP funcionam na plataforma.
      </p>

      <PilaresAccordion />

      <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", marginBottom: "clamp(20px, 5vw, 28px)" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Escala de avaliação (1–10)
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Nas aulas, o treinador atribui uma nota de <strong>1 a 10</strong> a cada critério avaliado (por exemplo: jab, low kick, posicionamento, etc.). Quanto mais alto o valor, melhor o desempenho naquele aspeto.
        </p>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          O <strong>radar de performance</strong> mostra a <strong>média das últimas 10 avaliações</strong> em cada pilar (Técnico, Tático, Físico, Mental, Teórico), também numa escala de 1 a 10.
        </p>
      </section>

      <div style={{ marginBottom: "clamp(20px, 5vw, 28px)" }}>
        <NiveisXPSection />
      </div>

      <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", marginBottom: "clamp(20px, 5vw, 28px)" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Onde ver a tua pontuação
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Como <strong>aluno</strong>, no teu dashboard e na página <strong>Perfil do atleta</strong> (/dashboard/performance) encontras o radar dos 5 pilares, o nível atual, o XP e as missões ativas. O treinador pode ainda deixar feedback e sugestões nessa área.
        </p>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Como <strong>treinador</strong> ou <strong>admin</strong>, podes consultar o perfil de cada atleta na respetiva ficha (Alunos ou Atletas) e ver o resumo por pilares e o link para o perfil completo de performance com todas as métricas detalhadas.
        </p>
      </section>

      <p style={{ margin: "clamp(24px, 6vw, 32px) 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Use o menu lateral para voltar ao Início ou navegar na plataforma.
      </p>
    </div>
  );
}
