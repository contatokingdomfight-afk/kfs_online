const CANDIDATE: Record<string, { label: string; color: string }> = {
  CONVOKED: { label: "Convocado", color: "var(--text-secondary)" },
  PASSED: { label: "Aprovado", color: "var(--success)" },
  FAILED: { label: "Reprovado", color: "var(--danger)" },
  ABSENT: { label: "Faltou", color: "var(--warning)" },
};

const EVENT: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Agendado", color: "var(--primary)" },
  COMPLETED: { label: "Concluído", color: "var(--success)" },
  CANCELLED: { label: "Cancelado", color: "var(--text-secondary)" },
};

export function ExamStatusChip({ status, kind = "candidate" }: { status: string; kind?: "candidate" | "event" }) {
  const meta = (kind === "event" ? EVENT : CANDIDATE)[status] ?? { label: status, color: "var(--text-secondary)" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

export function formatExamDate(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: withTime ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Lisbon",
  });
}
