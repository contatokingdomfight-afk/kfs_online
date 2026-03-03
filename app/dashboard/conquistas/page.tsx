import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import {
  getAllFixedBadgesWithProgress,
  getNextBadgeProgress,
  getEarnedBadges,
} from "@/lib/gamification";

export default async function DashboardConquistasPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const [fixedBadges, nextBadge, earnedBadges] = await Promise.all([
    getAllFixedBadgesWithProgress(supabase, studentId),
    getNextBadgeProgress(supabase, studentId),
    getEarnedBadges(supabase, studentId),
  ]);

  const localeTag = locale === "en" ? "en-GB" : "pt-PT";
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeTag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/dashboard"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("navHome")}
        </Link>
      </div>

      <h1
        style={{
          margin: "0 0 clamp(8px, 2vw, 12px) 0",
          fontSize: "clamp(22px, 5.5vw, 26px)",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {t("conquests")}
      </h1>
      <p
        style={{
          margin: "0 0 clamp(20px, 5vw, 24px) 0",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
        }}
      >
        {t("conquestsEmpty")}
      </p>

      {/* Grelha de badges fixos */}
      <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <h2
          style={{
            fontSize: "clamp(17px, 4.2vw, 19px)",
            fontWeight: 600,
            marginBottom: "clamp(12px, 3vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          {t("nextConquest")}
        </h2>
        {nextBadge ? (
          <div
            className="card"
            style={{
              padding: "clamp(16px, 4vw, 20px)",
              marginBottom: "clamp(16px, 4vw, 20px)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "clamp(15px, 3.8vw, 17px)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              🎯 {nextBadge.name}
            </p>
            {nextBadge.description && (
              <p
                style={{
                  margin: "4px 0 8px 0",
                  fontSize: "clamp(13px, 3.2vw, 15px)",
                  color: "var(--text-secondary)",
                }}
              >
                {nextBadge.description}
              </p>
            )}
            <p
              style={{
                margin: 0,
                fontSize: "clamp(13px, 3.2vw, 15px)",
                color: "var(--text-secondary)",
              }}
            >
              {nextBadge.current} / {nextBadge.target}
            </p>
            <div
              style={{
                marginTop: 8,
                height: 6,
                borderRadius: 3,
                backgroundColor: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${nextBadge.progressPct}%`,
                  backgroundColor: "var(--primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-secondary)",
            }}
          >
            {t("allMainUnlocked")}
          </p>
        )}

        <h2
          style={{
            fontSize: "clamp(17px, 4.2vw, 19px)",
            fontWeight: 600,
            marginBottom: "clamp(12px, 3vw, 16px)",
            marginTop: "clamp(20px, 5vw, 24px)",
            color: "var(--text-primary)",
          }}
        >
          {t("generalBadges")}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))",
            gap: "clamp(10px, 2.5vw, 14px)",
          }}
        >
          {fixedBadges.map((b) => (
            <div
              key={b.code}
              className="card"
              style={{
                padding: "clamp(12px, 3vw, 16px)",
                opacity: b.earned ? 1 : 0.85,
                borderLeft: b.earned ? "4px solid var(--success)" : "4px solid var(--border)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {b.earned ? "🏆" : "🔒"} {b.name}
              </p>
              {b.description && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {b.description}
                </p>
              )}
              {b.earned && b.earnedAt ? (
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {formatDate(b.earnedAt)}
                </p>
              ) : (
                <>
                  <p
                    style={{
                      margin: "6px 0 0 0",
                      fontSize: "clamp(12px, 3vw, 14px)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {b.current} / {b.target}
                  </p>
                  <div
                    style={{
                      marginTop: 6,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${b.progressPct}%`,
                        backgroundColor: "var(--primary)",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Lista de todas as conquistas desbloqueadas */}
      <section>
        <h2
          style={{
            fontSize: "clamp(17px, 4.2vw, 19px)",
            fontWeight: 600,
            marginBottom: "clamp(12px, 3vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          {t("allConquestsCount")} ({earnedBadges.length})
        </h2>
        {earnedBadges.length === 0 ? (
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
              }}
            >
              {t("conquestsEmpty")}
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(8px, 2vw, 10px)",
            }}
          >
            {earnedBadges.map((b) => (
              <li
                key={b.badgeCode}
                className="card"
                style={{ padding: "clamp(14px, 3.5vw, 18px)" }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(15px, 3.8vw, 17px)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  🏆 {b.name}
                </p>
                {b.description && (
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "clamp(13px, 3.2vw, 15px)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {b.description}
                  </p>
                )}
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {formatDate(b.earnedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
