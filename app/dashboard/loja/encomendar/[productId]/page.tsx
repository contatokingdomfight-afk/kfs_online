import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shirt } from "lucide-react";
import { requirePlan } from "@/lib/require-plan";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { loadPreorderProducts } from "@/lib/retail/orders";
import { OrderBuilder } from "@/components/retail/OrderBuilder";
import { checkCoupon, createMyOrder } from "../../actions";
import { loadActivePromotions } from "@/lib/retail/discounts.server";

export const dynamic = "force-dynamic";

export default async function EncomendarPage({ params }: { params: Promise<{ productId: string }> }) {
  await requirePlan();
  const { productId } = await params;
  const admin = getAdminClientOrNull().client;
  if (!admin) notFound();
  const studentId = await getCurrentStudentId();
  const { data: student } = studentId ? await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle() : { data: null };
  const schoolId = (student as { schoolId?: string | null } | null)?.schoolId ?? null;
  const products = (await loadPreorderProducts(admin, { schoolId })).filter((p) => p.variants.length > 0);
  const product = products.find((p) => p.id === productId);
  if (!product) notFound();
  const promotions = await loadActivePromotions(admin);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <Link href="/dashboard/loja" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        <ArrowLeft size={16} aria-hidden />
        Loja
      </Link>
      <header style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span aria-hidden style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 16, background: "linear-gradient(135deg, #0c2340 0%, #1e3a8a 100%)", color: "#93c5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shirt size={26} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>Pré-encomenda</h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            {products.length > 1 ? "Escolhe as peças e junta tudo numa só encomenda." : product.name}
          </p>
        </div>
      </header>

      <OrderBuilder
        storageKey="kfs-loja-carrinho"
        products={products}
        initialProductId={product.id}
        action={createMyOrder}
        submitLabel="Enviar encomenda"
        promotions={promotions}
        checkCoupon={checkCoupon}
        footerNote={
          <p style={{ margin: 0, padding: "10px 12px", borderRadius: 10, background: "rgba(250,204,21,0.14)", border: "1px solid var(--warning)", fontSize: 13, lineHeight: 1.45 }}>
            Pagas por transferência (IBAN ou Revolut) ou na secretaria para confirmar. Só depois a encomenda segue para o fornecedor.
          </p>
        }
      />
    </div>
  );
}
