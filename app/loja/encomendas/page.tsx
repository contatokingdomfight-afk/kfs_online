import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { loadOrders, orderReference, ORDER_STATUS_LABEL_PT } from "@/lib/retail/orders";
import { euro } from "@/lib/retail/public-shop";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "As minhas encomendas | Loja Kingdom", robots: { index: false } };

export default async function LojaMinhasEncomendasPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/loja/encomendas")}`);
  const admin = getAdminClientOrNull().client;
  const studentId = await getCurrentStudentId();
  let orders: Awaited<ReturnType<typeof loadOrders>> = [];
  if (admin) {
    const filter = studentId ? `createdByUserId.eq.${user.id},studentId.eq.${studentId}` : `createdByUserId.eq.${user.id}`;
    const { data } = await admin.from("RetailOrder").select("id").or(filter).order("createdAt", { ascending: false }).limit(30);
    const ids = (data ?? []).map((r) => (r as { id: string }).id);
    if (ids.length) orders = (await loadOrders(admin, { ids })).filter((o) => o.status !== "CANCELLED");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn crumb="As minhas encomendas" />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>As minhas encomendas</h1>
        {orders.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Ainda não tens encomendas. <Link href="/loja" style={{ color: "var(--primary)", fontWeight: 600 }}>Ver a loja</Link>
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.map((o) => {
              const pieces = o.lines.reduce((a, l) => a + l.quantity, 0);
              return (
                <li key={o.id}>
                  <Link href={`/loja/encomendas/${o.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none", color: "var(--text-primary)" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>
                        {orderReference(o.number)} · {pieces} {pieces === 1 ? "peça" : "peças"}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{euro(o.totalAmount)}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: o.status === "PENDING_PAYMENT" ? "var(--danger)" : o.status === "READY" ? "var(--success)" : "var(--text-secondary)" }}>
                      {ORDER_STATUS_LABEL_PT[o.status]}
                    </span>
                    <ChevronRight size={16} aria-hidden style={{ color: "var(--text-secondary)" }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
