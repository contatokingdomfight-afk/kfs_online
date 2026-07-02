import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { listRecentMovements } from "@/lib/retail/inventory";
import { searchVariantsForSale, variantLabel } from "@/lib/retail/catalog";
import { StockManager } from "./StockManager";

export const dynamic = "force-dynamic";

export default async function AdminLojaStockPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: schools }, variants, movements] = await Promise.all([
    supabase.from("School").select("id, name").eq("isActive", true).order("name"),
    searchVariantsForSale(supabase, "", 200),
    listRecentMovements(supabase, { limit: 40 }),
  ]);

  const variantOptions = variants.map((v) => ({
    id: v.id,
    label: `${v.productName} — ${variantLabel(v)} (${v.sku})`,
  }));

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        ← Loja
      </Link>
      <h1 style={{ margin: "8px 0 20px", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Stock</h1>
      <StockManager schools={schools ?? []} variants={variantOptions} movements={movements} />
    </div>
  );
}
