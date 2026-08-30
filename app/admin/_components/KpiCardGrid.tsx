import Link from "next/link";

type Card = { href: string; icon: string; value: string; label: string };

type Props = { cards: Card[] };

export function KpiCardGrid({ cards }: Props) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "clamp(10px, 2.5vw, 16px)",
      }}
    >
      {cards.map((c) => (
        <Link
          key={c.href + c.label}
          href={c.href}
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 20px)",
            minWidth: 0,
            textDecoration: "none",
            color: "inherit",
            display: "block",
          }}
        >
          <span style={{ fontSize: 24, marginBottom: 8, display: "block" }} aria-hidden>
            {c.icon}
          </span>
          <div style={{ fontSize: "clamp(18px, 4.5vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
            {c.value}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{c.label}</div>
        </Link>
      ))}
    </section>
  );
}
