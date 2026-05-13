import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { AdminEventosBoard, type AdminEventListRow } from "./AdminEventosBoard";

export default async function AdminEventosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);

  const { data: events } = await supabase
    .from("Event")
    .select("id, name, description, type, event_date, start_date, end_date, price, max_participants, is_active")
    .order("event_date", { ascending: false });

  const list: AdminEventListRow[] = (events ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description ?? null,
    type: e.type,
    event_date: e.event_date,
    start_date: (e as { start_date?: string | null }).start_date ?? null,
    end_date: (e as { end_date?: string | null }).end_date ?? null,
    price: Number(e.price),
    is_active: e.is_active ?? null,
  }));

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("back")}
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("navEventsAdmin")}
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href="/admin/eventos/novo" className="btn btn-primary" style={{ textDecoration: "none" }}>
            {t("adminEventsNew")}
          </Link>
        </div>
      </div>

      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {t("adminEventsIntro")}
      </p>

      <AdminEventosBoard events={list} locale={locale} />
    </div>
  );
}
