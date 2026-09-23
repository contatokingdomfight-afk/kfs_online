import Link from "next/link";
import { Gauge, BookOpen, Trophy, History, Map } from "lucide-react";

type Props = {
  hasPerformanceTracking: boolean;
  t: (key: string) => string;
};

const CARDS = [
  {
    id: "performance",
    icon: Gauge,
    href: "/dashboard/performance",
    titleKey: "dashboardExplorePerformance",
    descKey: "dashboardExplorePerformanceDesc",
    requiresPerformance: true,
  },
  {
    id: "library",
    icon: BookOpen,
    href: "/dashboard/biblioteca",
    titleKey: "dashboardExploreLibraryCard",
    descKey: "dashboardExploreLibraryDesc",
    requiresPerformance: false,
  },
  {
    id: "conquests",
    icon: Trophy,
    href: "/dashboard/conquistas",
    titleKey: "dashboardExploreConquests",
    descKey: "dashboardExploreConquestsDesc",
    requiresPerformance: true,
  },
  {
    id: "history",
    icon: History,
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
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
        <Map size={18} aria-hidden />
        {t("dashboardExploreTitle")}
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
            <card.icon size={26} aria-hidden />
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
