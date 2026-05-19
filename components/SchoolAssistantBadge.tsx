/** Etiqueta discreta: aluno com papel de treinador assistente na escola. */
export function SchoolAssistantBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      title="Treinador assistente na escola: pode marcar presenças em aulas e check-in de eventos para alunos da mesma escola. Não regista avaliações de desempenho como professor."
      style={{
        fontSize: "clamp(12px, 3vw, 14px)",
        padding: "4px 10px",
        borderRadius: "var(--radius-md)",
        fontWeight: 600,
        letterSpacing: "0.01em",
        color: "var(--primary)",
        border: "1px solid var(--primary)",
        backgroundColor: "var(--bg-secondary)",
        lineHeight: 1.25,
        maxWidth: "100%",
      }}
    >
      Assistente (escola)
    </span>
  );
}
