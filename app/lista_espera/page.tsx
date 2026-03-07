import type { Metadata } from "next";
import Link from "next/link";
import { FormularioListaEspera } from "./FormularioListaEspera";
import { MetaPixelScript } from "./MetaPixelScript";

export const metadata: Metadata = {
  title: "Lista de Espera | Kingdom Fight School",
  description:
    "Entre para a lista de espera da Kingdom Fight School em Oeiras e Cascais e seja avisado antes da abertura oficial.",
  openGraph: {
    title: "Lista de Espera | Kingdom Fight School",
    description:
      "Entre para a lista de espera da Kingdom Fight School em Oeiras e Cascais e seja avisado antes da abertura oficial.",
    type: "website",
  },
};

type SearchParams = Promise<{ src?: string }>;

export default async function ListaEsperaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const source = params.src === "instagram" ? "instagram" : "instagram_ads";

  return (
    <>
      <MetaPixelScript />
      <main
        className="min-h-screen flex flex-col items-center p-6"
        style={{ backgroundColor: "var(--bg)", paddingTop: "clamp(24px, 6vw, 48px)", paddingBottom: "clamp(48px, 10vw, 80px)" }}
      >
        <div className="container-mobile">
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginBottom: "clamp(16px, 4vw, 24px)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            ← Voltar ao site
          </Link>

          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl" style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
            <div
              className="absolute inset-0 -z-10 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(193, 18, 31, 0.2), transparent)",
              }}
            />
            <h1
              className="text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: "var(--text-primary)", lineHeight: 1.2, marginBottom: 12 }}
            >
              A primeira Kingdom Fight School está chegando a Oeiras/Cascais
            </h1>
            <p
              className="text-base sm:text-lg"
              style={{ color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}
            >
              Entre para a lista de espera e seja avisado antes da abertura oficial. Vagas fundadoras terão benefícios exclusivos.
            </p>
          </section>

          <FormularioListaEspera source={source} />

          {/* Por que entrar na lista */}
          <section style={{ marginTop: "clamp(32px, 8vw, 48px)" }}>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)", marginBottom: 16 }}
            >
              Por que entrar na lista de espera?
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-secondary)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                lineHeight: 1.6,
              }}
            >
              <li style={{ marginBottom: 8 }}>Acesso antecipado à abertura</li>
              <li style={{ marginBottom: 8 }}>Condições especiais para membros fundadores</li>
              <li>Prioridade nas primeiras turmas</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
