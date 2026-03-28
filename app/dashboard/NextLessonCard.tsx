import Link from "next/link";

type Props = {
  t: (key: string) => string;
  isFreeTier?: boolean;
};

/** Estado vazio quando não há aulas elegíveis na semana (secção «Sua próxima aula»). */
export function NextLessonCard({ t, isFreeTier = false }: Props) {
  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        ⚡ {t("dashboardNextLessonTitle")}
      </h2>
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
          {t("dashboardNoClassesThisWeek")}
        </p>
        {!isFreeTier && (
          <Link
            href="/dashboard/biblioteca"
            className="btn btn-primary"
            style={{
              marginTop: 16,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              minHeight: 44,
            }}
          >
            {t("dashboardExploreLibrary")}
          </Link>
        )}
      </div>
    </section>
  );
}
