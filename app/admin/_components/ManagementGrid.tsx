import Link from "next/link";

type GridItem = { href: string; icon: string; label: string };
type Group = { title: string; items: GridItem[] };

type Props = {
  groups: Group[];
  title: string;
};

export function ManagementGrid({ groups, title }: Props) {
  return (
    <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", minWidth: 0 }}>
      <h2
        style={{
          margin: "0 0 clamp(16px, 4vw, 20px) 0",
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 28px)" }}>
        {groups.map((g) => (
          <div key={g.title}>
            <h3
              style={{
                margin: "0 0 clamp(10px, 2.5vw, 14px) 0",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {g.title}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "clamp(8px, 2vw, 12px)",
              }}
            >
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "clamp(12px, 3vw, 14px) clamp(14px, 3.5vw, 18px)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontWeight: 500,
                  }}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
