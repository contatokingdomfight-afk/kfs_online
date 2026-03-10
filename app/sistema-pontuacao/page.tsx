import type { Metadata } from "next";
import { PilaresAccordion } from "./PilaresAccordion";
import { BELT_NAMES, getXpThresholdForBeltIndex } from "@/lib/belts";

export const metadata: Metadata = {
  title: "Sistema de pontuação | Kingdom Fight School",
  description: "Como funciona a avaliação, os 5 pilares, as faixas e o XP na plataforma Kingdom Fight School.",
};

export default function SistemaPontuacaoPage() {
  return (
    <div style={{ maxWidth: "min(640px, 100%)", margin: "0 auto", padding: "clamp(20px, 5vw, 32px) 0" }}>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 24px) 0", fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>
        Sistema de pontuação
      </h1>
      <p style={{ margin: "0 0 clamp(24px, 6vw, 32px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Esta página explica como as avaliações, o radar de performance, as faixas e o XP funcionam na plataforma.
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

      <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", marginBottom: "clamp(20px, 5vw, 28px)" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Faixas e XP
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          O teu nível na plataforma é representado por uma <strong>faixa (cor)</strong>. Existem <strong>{BELT_NAMES.length} faixas de cor</strong> (da Branca à Preta/Dourado) e, a partir daí, níveis <strong>Dourado 1</strong>, <strong>Dourado 2</strong>, <strong>Dourado 3</strong>, etc., sem limite. O progresso é feito através de <strong>XP (pontos de experiência)</strong>.
        </p>

        <h3 style={{ margin: "16px 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Ordem das faixas
        </h3>
        <ol style={{ margin: "0 0 16px 0", paddingLeft: "1.5em", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", lineHeight: 1.8 }}>
          {BELT_NAMES.map((name, i) => {
            const xpMin = getXpThresholdForBeltIndex(i);
            const xpNext = getXpThresholdForBeltIndex(i + 1);
            const step = xpNext - xpMin;
            return (
              <li key={name}>
                <strong>{name}</strong>
                {i === 0 ? " (início)" : ` — ${xpMin.toLocaleString("pt-PT")} XP total para atingir`}
                {i > 0 && step > 0 && ` · +${step.toLocaleString("pt-PT")} XP nesta faixa para subir`}
              </li>
            );
          })}
          <li style={{ marginTop: 4 }}>
            <strong>Dourado 1</strong>, <strong>Dourado 2</strong>, <strong>Dourado 3</strong>, … — progressão infinita (cada nível exige o dobro do XP da faixa anterior).
          </li>
        </ol>

        <h3 style={{ margin: "16px 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Como ganhar XP
        </h3>
        <ul style={{ margin: "0 0 16px 0", paddingLeft: "1.25em", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Para subir da <strong>Branca</strong> para <strong>Branca/amarela</strong> são necessários <strong>1000 XP</strong>.</li>
          <li>Em cada faixa seguinte, precisas de <strong>mais XP do que na anterior</strong>: a progressão é em dobro (1000 → 2000 → 4000 → 8000 … XP por faixa).</li>
          <li>Ganhas XP ao completar <strong>missões</strong> (por exemplo: “Subir Técnico para 7”, “Realizar avaliação física”). Cada missão de dimensão dá uma recompensa fixa de XP.</li>
        </ul>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          As missões são desbloqueadas com base nas tuas avaliações. No perfil do atleta vês a barra de progresso para a próxima faixa e as missões ativas.
        </p>
      </section>

      <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", marginBottom: "clamp(20px, 5vw, 28px)" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Onde ver a tua pontuação
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Como <strong>aluno</strong>, no teu dashboard e na página <strong>Perfil do atleta</strong> (/dashboard/performance) encontras o radar dos 5 pilares, a faixa atual, o XP e as missões ativas. O treinador pode ainda deixar feedback e sugestões nessa área.
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
