import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { formatNotificationCreatedAt } from "@/lib/format-notification-date";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationRow, type NotificationRowData } from "./NotificationRow";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { Bell } from "lucide-react";

const PAGE_SIZE = 80;

export default async function NotificationsCenterPage() {
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const studentId = await getCurrentStudentId();
  if (!studentId) {
    if (dbUser.role === "ADMIN") redirect("/admin/notificacoes");
    if (dbUser.role === "COACH") redirect("/coach/notificacoes");
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("Notification")
    .select("*")
    .eq("studentId", studentId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const list: NotificationRowData[] = (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const created_at = String(row.created_at ?? "");
    return {
      id: String(row.id),
      type: row.type != null ? String(row.type) : null,
      title: String(row.title ?? ""),
      body: row.body != null ? String(row.body) : null,
      read_at: row.read_at != null ? String(row.read_at) : null,
      created_at,
      createdAtDisplay: formatNotificationCreatedAt(created_at, locale),
      href: typeof row.href === "string" ? row.href : null,
    };
  });

  const unreadCount = list.filter((n) => !n.read_at).length;
  const pt = locale !== "en";

  // Grupos por data (calendário de Lisboa): hoje, esta semana (desde segunda), mais antigas.
  const today = calendarDateLisbon(new Date());
  const todayDate = new Date(`${today}T00:00:00Z`);
  todayDate.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7));
  const weekStart = todayDate.toISOString().slice(0, 10);
  const groups: { key: string; label: string; items: NotificationRowData[] }[] = [
    { key: "today", label: pt ? "Hoje" : "Today", items: [] },
    { key: "week", label: pt ? "Esta semana" : "This week", items: [] },
    { key: "older", label: pt ? "Mais antigas" : "Earlier", items: [] },
  ];
  for (const n of list) {
    const d = n.created_at ? calendarDateLisbon(new Date(n.created_at)) : "";
    (d === today ? groups[0] : d >= weekStart ? groups[1] : groups[2]).items.push(n);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            {t("notificationsCenterTitle")}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            {unreadCount > 0
              ? pt
                ? `${unreadCount} ${unreadCount === 1 ? "nova" : "novas"}`
                : `${unreadCount} new`
              : pt
                ? "Estás em dia"
                : "You're all caught up"}
          </p>
        </div>
        {list.length > 0 && unreadCount > 0 ? <MarkAllReadButton label={t("notificationsMarkAllRead")} /> : null}
      </header>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "clamp(24px, 6vw, 32px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <span aria-hidden style={{ width: 52, height: 52, borderRadius: 26, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={24} />
          </span>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>{t("notificationsEmpty")}</p>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.key} aria-label={g.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                {g.label}
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((n) => (
                  <NotificationRow key={n.id} n={n} markReadLabel={t("notificationsMarkRead")} />
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
