import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { OrderDetailView } from "@/components/retail/OrderDetailView";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Encomenda | Loja Kingdom", robots: { index: false } };

export default async function LojaEncomendaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> }) {
  const [{ id }, { nova }] = await Promise.all([params, searchParams]);
  const user = await getCurrentDbUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/loja/encomendas/${id}`)}`);
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn crumb="Encomenda" />
      <div style={{ padding: "20px 16px 40px" }}>
        <OrderDetailView id={id} nova={nova} basePath="/loja" />
      </div>
      <PublicSiteFooter />
    </main>
  );
}
