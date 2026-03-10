"use client";

import { useState } from "react";

const PILARES = [
  {
    id: "tecnico",
    titulo: "Técnico",
    emoji: "🥊",
    resumo: "Execução técnica (socos, chutes, clinch, defesas, etc., consoante a modalidade)",
    descricao:
      "Avalia a qualidade da execução das técnicas da modalidade: precisão dos golpes, postura, deslocamento, defesas e combinações. O treinador observa critérios como jab, low kick, posicionamento, clinch, etc., consoante a arte marcial.",
  },
  {
    id: "tatico",
    titulo: "Tático",
    emoji: "🎯",
    resumo: "Leitura de luta, posicionamento, controle de distância, estratégias ofensivas e defensivas",
    descricao:
      "Reflete a capacidade de ler o combate, escolher o momento certo para atacar ou defender, controlar a distância e o ritmo, e aplicar estratégias adequadas ao adversário e ao contexto da luta.",
  },
  {
    id: "fisico",
    titulo: "Físico",
    emoji: "💪",
    resumo: "Condicionamento, força e resistência",
    descricao:
      "Inclui resistência (gás), recuperação entre séries, manutenção da intensidade e, quando relevante, força de golpe e explosividade. A avaliação física periódica (anamnese e testes) também contribui para este pilar.",
  },
  {
    id: "mental",
    titulo: "Mental",
    emoji: "🧠",
    resumo: "Foco, calma sob pressão e consistência",
    descricao:
      "Avalia concentração durante o treino, resiliência, confiança, controlo sob pressão e disciplina. É o pilar que sustenta a aplicação consistente dos outros em situação de stress ou competição.",
  },
  {
    id: "teorico",
    titulo: "Teórico",
    emoji: "📚",
    resumo: "Conhecimento das regras, combate e conceitos da modalidade",
    descricao:
      "Mede o conhecimento das regras, arbitragem, conceitos técnicos (posição, guarda, ângulos) e a capacidade de relacionar teoria com prática e de compreender os feedbacks do treinador.",
  },
] as const;

export function PilaresAccordion() {
  const [openId, setOpenId] = useState<string | null>(PILARES[0].id);

  return (
    <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", marginBottom: "clamp(20px, 5vw, 28px)" }}>
      <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Os 5 pilares da avaliação
      </h2>
      <p style={{ margin: "0 0 20px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Cada atleta é avaliado em cinco dimensões gerais, que aparecem no teu radar de performance. Clica num pilar para ver o detalhe.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PILARES.map((p) => {
          const isOpen = openId === p.id;
          return (
            <div
              key={p.id}
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                backgroundColor: isOpen ? "var(--bg)" : "var(--bg-secondary)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : p.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "clamp(15px, 3.8vw, 17px)",
                  fontWeight: 600,
                }}
                aria-expanded={isOpen}
                aria-controls={`pilar-${p.id}`}
                id={`pilar-btn-${p.id}`}
              >
                <span style={{ fontSize: "1.25em" }} aria-hidden>{p.emoji}</span>
                <span style={{ flex: 1 }}>{p.titulo}</span>
                <span
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    display: "inline-block",
                    color: "var(--text-secondary)",
                  }}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
              <div
                id={`pilar-${p.id}`}
                role="region"
                aria-labelledby={`pilar-btn-${p.id}`}
                style={{
                  display: isOpen ? "block" : "none",
                  padding: "0 16px 16px 16px",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, lineHeight: 1.5 }}>
                  {p.resumo}
                </p>
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {p.descricao}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "16px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        O treinador avalia critérios detalhados por modalidade (Muay Thai, Boxe, etc.). Esses critérios são depois agregados nestes 5 pilares para o gráfico radar.
      </p>
    </section>
  );
}
