import type { ReactNode } from "react";

export type RankBoardEntry = {
  id: string;
  rank: number;
  name: string;
  isMe: boolean;
  /** Valor principal (pontos, XP ou evolução), já formatado. */
  value: string;
  valueColor?: string;
  /** Linha pequena por baixo do valor (ex.: XP). */
  valueHint?: string;
  /** Graduação (faixa) por baixo do nome. */
  belt?: ReactNode;
};

const MEDAL_COLORS: Record<number, string> = { 1: "#facc15", 2: "#cbd5e1", 3: "#d97706" };

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function Avatar({ name, size, ring }: { name: string; size: number; ring?: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: "var(--bg)",
        border: `${size > 50 ? 3 : 2}px solid ${ring ?? "var(--border)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.34),
        fontWeight: 800,
        color: "var(--text-primary)",
        boxSizing: "border-box",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Pódio (top 3) + lista com a linha do próprio aluno em destaque. */
export function RankBoard({ entries, youLabel, footer }: { entries: RankBoardEntry[]; youLabel: string; footer?: ReactNode }) {
  const podium = entries.filter((e) => e.rank <= 3).slice(0, 3);
  const rest = entries.filter((e) => !podium.includes(e));
  // Ordem visual do pódio: 2.º, 1.º, 3.º.
  const podiumOrder = [podium.find((e) => e.rank === 2), podium.find((e) => e.rank === 1), podium.find((e) => e.rank === 3)].filter(
    (e): e is RankBoardEntry => Boolean(e)
  );
  const me = entries.find((e) => e.isMe);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {podiumOrder.length > 0 && (
        <section
          aria-label="Top 3"
          style={{
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(193,18,31,0.14), var(--bg-secondary) 70%)",
            padding: "18px 12px 0",
            display: "grid",
            gridTemplateColumns: `repeat(${podiumOrder.length}, minmax(0, 1fr))`,
            alignItems: "end",
            gap: 8,
          }}
        >
          {podiumOrder.map((e) => {
            const first = e.rank === 1;
            const color = MEDAL_COLORS[e.rank];
            return (
              <div key={e.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, textAlign: "center" }}>
                <Avatar name={e.name} size={first ? 68 : 54} ring={color} />
                <span
                  style={{
                    fontSize: first ? 15 : 13,
                    fontWeight: 800,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: e.isMe ? "var(--primary)" : "var(--text-primary)",
                  }}
                >
                  {e.isMe ? youLabel : e.name.split(/\s+/)[0]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: e.valueColor ?? "var(--text-primary)" }}>{e.value}</span>
                <span
                  style={{
                    width: "100%",
                    height: first ? 78 : e.rank === 2 ? 56 : 40,
                    borderRadius: "12px 12px 0 0",
                    background: color,
                    color: "#111",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 6,
                    fontSize: first ? 24 : 18,
                    fontWeight: 900,
                    boxSizing: "border-box",
                  }}
                >
                  {e.rank}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {me && me.rank > 3 && (
        <div
          style={{
            borderRadius: 16,
            border: "2px solid var(--primary)",
            background: "var(--bg-secondary)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 900, minWidth: 40, color: "var(--primary)" }}>#{me.rank}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{youLabel}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{me.name}</span>
          </span>
          <span style={{ textAlign: "right" }}>
            <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: me.valueColor ?? "var(--primary)" }}>{me.value}</span>
            {me.valueHint ? <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>{me.valueHint}</span> : null}
          </span>
        </div>
      )}

      {rest.length > 0 && (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-secondary)", overflow: "hidden" }}>
          {rest.map((e, i) => (
            <li
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
                background: e.isMe ? "rgba(193,18,31,0.12)" : undefined,
                boxShadow: e.isMe ? "inset 3px 0 0 var(--primary)" : undefined,
              }}
            >
              <span style={{ minWidth: 28, fontSize: 14, fontWeight: 800, color: "var(--text-secondary)", textAlign: "center" }}>{e.rank}</span>
              <Avatar name={e.name} size={36} ring={e.isMe ? "var(--primary)" : undefined} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.name || "—"}
                  {e.isMe ? <span style={{ marginLeft: 6, fontSize: 12, color: "var(--primary)" }}>({youLabel})</span> : null}
                </span>
                {e.belt ? <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{e.belt}</span> : null}
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: e.valueColor ?? "var(--text-primary)" }}>{e.value}</span>
                {e.valueHint ? <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>{e.valueHint}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      {footer}
    </div>
  );
}
