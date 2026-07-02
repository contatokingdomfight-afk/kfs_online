import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { PosForm } from "./PosForm";

export const dynamic = "force-dynamic";

export default async function AdminLojaVendaNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: schools } = await supabase.from("School").select("id, name").eq("isActive", true).order("name");
  if (!schools?.length) {
    return (
      <div>
        <Link href="/admin/loja">← Loja</Link>
        <p>Cria pelo menos uma escola activa antes de registar vendas.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <Link href="/admin/loja/vendas" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        ← Vendas
      </Link>
      <h1 style={{ margin: "8px 0 16px", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Registar venda</h1>
      <PosForm schools={schools} />
    </div>
  );
}
