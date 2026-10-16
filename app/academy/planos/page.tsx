import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { ACADEMY_PASS_PRICES } from "@/lib/academy/access";
import { AcademyCheckoutButton } from "@/components/academy/CheckoutButton";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Passe Kingdom Academy | Kingdom Fight School",
  description: "Subscreve o Passe e vê todos os cursos incluídos. Cancela quando quiseres.",
  alternates: { canonical: "/academy/planos" },
};

const box: React.CSSProperties = { padding: 18, display: "flex", flexDirection: "column", gap: 8 };
const list: React.CSSProperties = { margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 };

export default async function AcademyPlanosPage() {
  const user = await getCurrentDbUser();
  const next = encodeURIComponent("/academy/planos");
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn={Boolean(user)} section="academy" crumb="Passe" />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Como ter acesso</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            Para comprar e ver as aulas é preciso ter conta e entrar. Só as pré-visualizações são públicas.
          </p>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <section className="card" style={box}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Aluno Kingdom</h2>
            <strong style={{ fontSize: 22 }}>Incluído</strong>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Com plano presencial ativo</span>
            <ul style={list}>
              <li>Cursos marcados «Incluído»</li>
              <li>Novos cursos entram automaticamente</li>
            </ul>
          </section>
          <section className="card" style={box}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Curso avulso</h2>
            <strong style={{ fontSize: 22 }}>Pagamento único</strong>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Acesso para sempre a esse curso</span>
            <ul style={list}>
              <li>Sem subscrição</li>
              <li>Ideal para quem quer um tema</li>
            </ul>
            <Link href="/academy" style={{ marginTop: "auto", fontSize: 14, color: "var(--primary)", fontWeight: 700 }}>
              Ver cursos
            </Link>
          </section>
          <section className="card" style={{ ...box, border: "2px solid var(--primary)" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Passe Kingdom Academy</h2>
            <strong style={{ fontSize: 22 }}>€{ACADEMY_PASS_PRICES.month}/mês</strong>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>ou €{ACADEMY_PASS_PRICES.year}/ano · cancela quando quiseres</span>
            <ul style={list}>
              <li>Todos os cursos do Passe</li>
              <li>Novos cursos incluídos</li>
            </ul>
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <AcademyCheckoutButton kind="pass" interval="month" label={`Subscrever · €${ACADEMY_PASS_PRICES.month}/mês`} />
                <AcademyCheckoutButton kind="pass" interval="year" label={`Anual · €${ACADEMY_PASS_PRICES.year}/ano`} secondary />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <Link href={`/sign-in?next=${next}`} className="btn btn-primary" style={{ minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontWeight: 700 }}>
                  Entrar para subscrever
                </Link>
                <Link href={`/sign-up?next=${next}`} style={{ textAlign: "center", fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
                  Ainda não tenho conta
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
