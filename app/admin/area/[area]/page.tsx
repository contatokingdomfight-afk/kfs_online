import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { getAdminDashboardStatsCached } from "@/lib/admin-dashboard-stats";
import { getAdminShellNav, type AdminAreaId } from "@/lib/admin-nav-areas";
import { AdminNavSearch } from "@/components/admin/AdminNavSearch";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";

export const dynamic = "force-dynamic";

const INTRO: Record<AdminAreaId, string> = {
  hoje: "O que tratar hoje.",
  alunos: "Alunos, famílias, experimentais e adesões.",
  aulas: "Turmas, presenças, graduação e eventos.",
  dinheiro: "Pagamentos, planos e loja.",
  configurar: "Escolas, modalidades, coaches, regras e definições.",
};

/** Contagens rápidas (só as baratas) mostradas ao lado de alguns atalhos. */
async function loadBadges(area: AdminAreaId): Promise<Record<string, string>> {
  const client = getAdminClientOrNull().client;
  if (!client) return {};
  const out: Record<string, string> = {};
  if (area === "alunos") {
    const today = calendarDateLisbon(new Date());
    // Mesma contagem de «Hoje» (sem contas de admin).
    const [{ activeStudents: active }, { count: trials }] = await Promise.all([
      getAdminDashboardStatsCached(client, null),
      client.from("TrialClass").select("id", { count: "exact", head: true }).eq("lessonDate", today).eq("convertedToStudent", false),
    ]);
    if (active) out["/admin/alunos"] = `${active} ativos`;
    if (trials) out["/admin/experimentais"] = `${trials} hoje`;
  }
  if (area === "dinheiro") {
    const { count } = await client.from("RetailOrder").select("id", { count: "exact", head: true }).eq("status", "PENDING_PAYMENT");
    if (count) out["/admin/loja/encomendas"] = `${count} por pagar`;
  }
  return out;
}

export default async function AdminAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaId } = await params;
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const access = await getCachedResolvedAdminAccess();
  const { areas, searchItems } = getAdminShellNav(t, access);
  const area = areas.find((a) => a.id === areaId);
  if (!area || area.id === "hoje") notFound();
  const badges = await loadBadges(area.id);

  return (
    <div style={{ maxWidth: 760, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>{area.label}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{INTRO[area.id]}</p>
      </header>

      <div className="admin-mobile-only">
        <AdminNavSearch items={searchItems} />
      </div>

      <nav aria-label={area.label} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 10 }}>
        {area.items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 60, textDecoration: "none", color: "var(--text-primary)" }}
          >
            <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {it.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{it.label}</span>
              {it.hint ? <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>{it.hint}</span> : null}
            </span>
            {badges[it.href] ? (
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--primary)", whiteSpace: "nowrap" }}>
                {badges[it.href]}
              </span>
            ) : null}
            <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          </Link>
        ))}
      </nav>

      {area.id === "configurar" && (
        <section className="card admin-mobile-only" style={{ padding: 14 }}>
          <ViewAsSwitcher />
        </section>
      )}
    </div>
  );
}
