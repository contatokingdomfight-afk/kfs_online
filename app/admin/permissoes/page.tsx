import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { fetchAdminPermissionCatalog } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPermissoesListPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const admin = getAdminClientOrNull();
  if (!admin.client) return <AdminConfigMissing errorType={admin.error} />;

  const { data, error } = await admin.client
    .from("User")
    .select("id, email, name, role, adminUseGranularPermissions")
    .in("role", ["ADMIN", "COACH"])
    .order("email", { ascending: true });

  if (error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: "var(--error)" }}>{error.message}</p>
      </div>
    );
  }

  // Pré-carrega o catálogo: falha amigável se a migração ainda não existir
  let catalogError: string | null = null;
  try {
    await fetchAdminPermissionCatalog();
  } catch (e) {
    catalogError = e instanceof Error ? e.message : "Catálogo indisponível.";
  }

  const roleLabel = (r: string) => {
    if (r === "ADMIN") return t("permissionsRoleAdmin");
    if (r === "COACH") return t("permissionsRoleCoach");
    if (r === "ALUNO") return t("permissionsRoleAluno");
    return r;
  };

  return (
    <div style={{ maxWidth: 960, width: "100%" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
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
      </div>
      <h1
        style={{
          margin: "0 0 8px 0",
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {t("permissionsPageTitle")}
      </h1>
      <p
        style={{
          margin: "0 0 clamp(20px, 5vw, 24px) 0",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {t("permissionsPageIntro")}
      </p>

      {catalogError && (
        <p style={{ color: "var(--error)", marginBottom: 16, fontSize: 14 }} role="alert">
          {locale === "pt" ? "Tabela " : "Table "}
          <code>AdminPermission</code>{" "}
          {locale === "pt" ? "em falta ou erro: " : "missing or error: "}
          {catalogError}
          {locale === "pt"
            ? " — aplica a migração add_admin_rbac_v1.sql (Supabase / produção) e recarrega."
            : " — run migration add_admin_rbac_v1.sql, then refresh."}
        </p>
      )}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "clamp(13px, 3.2vw, 15px)",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border, rgba(0,0,0,.1))" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("permissionsTableEmail")}
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("permissionsTableName")}
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("permissionsTableRole")}
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("permissionsTableMode")}
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px" }} />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => {
              const row = u as {
                id: string;
                email: string;
                name: string | null;
                role: string;
                adminUseGranularPermissions: boolean | null;
              };
              return (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                  <td style={{ padding: "12px 16px" }}>{row.email}</td>
                  <td style={{ padding: "12px 16px" }}>{row.name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{roleLabel(row.role)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {row.role === "COACH" ? "—" : row.adminUseGranularPermissions ? t("permissionsModeGranular") : t("permissionsModeFull")}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link
                      href={`/admin/permissoes/${row.id}`}
                      style={{ color: "var(--text-primary)", fontWeight: 500, textDecoration: "none" }}
                    >
                      {t("permissionsOpenDetail")} →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
