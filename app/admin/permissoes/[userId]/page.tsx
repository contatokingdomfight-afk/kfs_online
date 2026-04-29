import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { fetchAdminPermissionCatalog } from "../actions";
import { AdminUserPermissionsForm } from "../AdminUserPermissionsForm";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminPermissoesUserPage(props: PageProps) {
  const { userId } = await props.params;
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const admin = getAdminClientOrNull();
  if (!admin.client) return <AdminConfigMissing errorType={admin.error} />;

  const { data: row, error } = await admin.client
    .from("User")
    .select("id, email, name, role, adminUseGranularPermissions")
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) notFound();
  const u = row as {
    id: string;
    email: string;
    name: string | null;
    role: string;
    adminUseGranularPermissions: boolean | null;
  };

  const { count: adminN, error: cErr } = await admin.client
    .from("User")
    .select("id", { count: "exact", head: true })
    .eq("role", "ADMIN");

  const soleAdmin = !cErr && (adminN ?? 0) === 1;

  let catalog: Awaited<ReturnType<typeof fetchAdminPermissionCatalog>> = [];
  try {
    catalog = await fetchAdminPermissionCatalog();
  } catch {
    catalog = [];
  }

  const { data: grants } =
    u.role === "ADMIN"
      ? await admin.client.from("UserAdminPermission").select("permissionCode").eq("userId", userId)
      : { data: null };

  const initialCodes = (grants ?? []).map((g) => (g as { permissionCode: string }).permissionCode);

  return (
    <div style={{ maxWidth: 720, width: "100%" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/permissoes"
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
        {t("permissionsDetailTitle")}
      </h1>
      <p style={{ margin: "0 0 20px 0", color: "var(--text-secondary)", fontSize: 15 }}>
        {u.name || u.email}
        {u.name ? ` — ${u.email}` : null}
      </p>

      {catalog.length === 0 && u.role === "ADMIN" && (
        <p style={{ color: "var(--error)", marginBottom: 16 }} role="alert">
          {locale === "pt"
            ? "Migração de permissões não encontrada (tabela AdminPermission vazia ou inexistente)."
            : "Permissions migration missing or empty (AdminPermission)."}
        </p>
      )}

      <AdminUserPermissionsForm
        userId={u.id}
        initialGranular={!!u.adminUseGranularPermissions}
        initialCodes={initialCodes}
        catalog={catalog}
        readonlyCoach={u.role === "COACH" || u.role === "ALUNO"}
        soleAdmin={soleAdmin && u.role === "ADMIN"}
        locale={locale}
        t={t}
      />
    </div>
  );
}
