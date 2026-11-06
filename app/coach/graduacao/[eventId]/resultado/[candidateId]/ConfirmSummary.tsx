"use client";

/** Resumo dentro do modal de confirmação: grau em destaque + o que acontece a seguir. */
export function ConfirmSummary({
  belt,
  headline,
  tone = "neutral",
  lines,
}: {
  belt?: React.ReactNode;
  headline: string;
  tone?: "neutral" | "success" | "danger";
  lines: (string | null | false)[];
}) {
  const accent = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : "var(--border)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: `1px solid ${accent}`,
          background: tone === "neutral" ? "var(--bg)" : `color-mix(in srgb, ${accent} 8%, transparent)`,
        }}
      >
        {belt}
        <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-primary)" }}>{headline}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {lines.filter(Boolean).map((l) => (
          <li key={l as string}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
