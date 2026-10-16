import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadShopProfile } from "@/lib/retail/public-shop";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { CadastroForm } from "./CadastroForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cadastro | Loja Kingdom", robots: { index: false } };

export default async function LojaCadastroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = next && next.startsWith("/loja") && !next.startsWith("//") ? next : "/loja";
  const user = await getCurrentDbUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/loja/cadastro?next=${nextPath}`)}`);
  const admin = getAdminClientOrNull().client;
  const profile = admin ? await loadShopProfile(admin, user.id) : null;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn crumb="Cadastro" />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Os teus dados</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Precisamos do teu contacto e morada para tratar da encomenda. Só preenches uma vez.
          </p>
        </header>
        <CadastroForm next={nextPath} initial={profile ?? { fullName: user.name ?? "", phone: "", addressLine: "", postalCode: "", city: "" }} />
      </div>
      <PublicSiteFooter />
    </main>
  );
}
