import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { formatNotificationCreatedAt } from "@/lib/format-notification-date";
import { MarkAllReadButton } from "@/app/dashboard/notificacoes/MarkAllReadButton";
import { NotificationRow, type NotificationRowData } from "@/app/dashboard/notificacoes/NotificationRow";

const PAGE_SIZE = 80;

export default async function CoachNotificationsPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") redirect("/dashboard");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("Notification")
    .select("*")
    .eq("coachUserId", dbUser.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const list: NotificationRowData[] = (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const created_at = String(row.created_at ?? "");
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      body: row.body != null ? String(row.body) : null,
      read_at: row.read_at != null ? String(row.read_at) : null,
      created_at,
      createdAtDisplay: formatNotificationCreatedAt(created_at, locale),
      href: typeof row.href === "string" ? row.href : null,
    };
  });

  const unreadCount = list.filter((n) => !n.read_at).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 24px)", padding: "clamp(12px, 3vw, 16px)" }}>
      <div>
        <Link
          href="/coach"
          style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
        >
          ← {t("back")}
        </Link>
        <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 700, margin: "12px 0 8px 0", color: "var(--text-primary)" }}>
          {t("notificationsCenterTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", maxWidth: 560 }}>
          {t("coachNotificationsCenterIntro")}
        </p>
      </div>

      {list.length > 0 && unreadCount > 0 && (
        <div>
          <MarkAllReadButton label={t("notificationsMarkAllRead")} />
        </div>
      )}

      {list.length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)" }}>
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>{t("notificationsEmpty")}</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((n) => (
            <NotificationRow key={n.id} n={n} markReadLabel={t("notificationsMarkRead")} />
          ))}
        </ul>
      )}
    </div>
  );
}
