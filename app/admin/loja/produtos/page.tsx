import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { listProducts, listSuppliers } from "@/lib/retail/catalog";
import { ProdutosManager } from "./ProdutosManager";

import type { ProductVariantRow } from "@/lib/retail/types";

export const dynamic = "force-dynamic";

type SearchParams = {
  aba?: string;
  tipo?: string;
  productError?: string;
  supplierError?: string;
};

export default async function AdminLojaProdutosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const params = await searchParams;

  const [products, suppliers, { data: schools }, { data: allVariants }] = await Promise.all([
    listProducts(supabase),
    listSuppliers(supabase),
    supabase.from("School").select("id, name").eq("isActive", true).order("name"),
    supabase.from("ProductVariant").select("id, productId, sku, size, color, priceOverride, isActive"),
  ]);

  const variantsByProduct: Record<string, ProductVariantRow[]> = {};
  for (const v of allVariants ?? []) {
    const pid = (v as { productId: string }).productId;
    if (!variantsByProduct[pid]) variantsByProduct[pid] = [];
    variantsByProduct[pid].push({
      id: (v as { id: string }).id,
      productId: pid,
      sku: (v as { sku: string }).sku,
      size: (v as { size?: string | null }).size ?? null,
      color: (v as { color?: string | null }).color ?? null,
      priceOverride: (v as { priceOverride?: number | null }).priceOverride != null
        ? Number((v as { priceOverride: number }).priceOverride)
        : null,
      isActive: Boolean((v as { isActive: boolean }).isActive),
    });
  }

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        ← Loja
      </Link>
      <h1 style={{ margin: "8px 0 20px", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Produtos</h1>
      <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>A carregar…</p>}>
        <ProdutosManager
          products={products}
          suppliers={suppliers}
          schools={schools ?? []}
          variantsByProduct={variantsByProduct}
          productErrorFromUrl={params.productError ?? null}
          supplierErrorFromUrl={params.supplierError ?? null}
        />
      </Suspense>
    </div>
  );
}
