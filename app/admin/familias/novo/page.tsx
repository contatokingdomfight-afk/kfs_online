import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { NovaFamiliaForm } from "./NovaFamiliaForm";

export default async function AdminFamiliasNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { data: schools } = await result.client
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  return (
    <div style={{ maxWidth: 480 }}>
      <Link href="/admin/familias" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Planos família
      </Link>
      <h1 style={{ margin: "16px 0", fontSize: 22, fontWeight: 600 }}>Novo grupo familiar</h1>
      <NovaFamiliaForm schools={(schools ?? []).map((s) => ({ id: s.id, name: s.name ?? s.id }))} />
    </div>
  );
}
