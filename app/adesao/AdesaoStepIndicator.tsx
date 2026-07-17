"use client";

type Props = {
  step: 1 | 2;
};

export function AdesaoStepIndicator({ step }: Props) {
  const items = [
    { n: 1, label: "Comprovativo" },
    { n: 2, label: "Condições e assinatura" },
  ] as const;

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, maxWidth: 640, width: "100%", marginInline: "auto" }}>
      {items.map((item) => {
        const active = step === item.n;
        const done = step > item.n;
        return (
          <div
            key={item.n}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-secondary)",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: done ? "var(--success, #16a34a)" : active ? "var(--text-primary)" : "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            {item.n}. {item.label}
          </div>
        );
      })}
    </div>
  );
}
