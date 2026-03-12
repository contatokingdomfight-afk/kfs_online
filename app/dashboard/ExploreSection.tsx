import Link from "next/link";

type Props = {
  hasPerformanceTracking: boolean;
  t: (key: string) => string;
};

const CARDS = [
  {
    id: "performance",
    icon: "📊",
    href: "/dashboard/performance",
    titleKey: "dashboardExplorePerformance",
    descKey: "dashboardExplorePerformanceDesc",
    requiresPerformance: true,
  },
  {
    id: "library",
    icon: "📚",
    href: "/dashboard/biblioteca",
    titleKey: "dashboardExploreLibraryCard",
    descKey: "dashboardExploreLibraryDesc",
    requiresPerformance: false,
  },
  {
    id: "conquests",
    icon: "🏆",
    href: "/dashboard/conquistas",
    titleKey: "dashboardExploreConquests",
    descKey: "dashboardExploreConquestsDesc",
    requiresPerformance: true,
  },
  {
    id: "history",
    icon: "🗓️",
    href: "/dashboard/historico",
    titleKey: "dashboardExploreHistory",
    descKey: "dashboardExploreHistoryDesc",
    requiresPerformance: false,
  },
] as const;

export function ExploreSection({ hasPerformanceTracking, t }: Props) {
  const visibleCards = CARDS.filter((c) => !c.requiresPerformance || hasPerformanceTracking);

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        🗺️ {t("dashboardExploreTitle")}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "clamp(12px, 3vw, 16px)",
        }}
      >
        {visibleCards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="card"
            style={{
              padding: "clamp(16px, 4vw, 20px)",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "clamp(24px, 6vw, 28px)" }}>{card.icon}</span>
            <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
              {t(card.titleKey)}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {t(card.descKey)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
