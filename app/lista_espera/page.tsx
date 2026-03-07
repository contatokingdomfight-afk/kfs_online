import type { Metadata } from "next";
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
              A primeira Kingdom Fight School está chegando a Oeiras/Cascais.
            </h1>
            <p
              className="text-base sm:text-lg"
              style={{ color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}
            >
              Garanta o seu lugar na vanguarda do treino marcial. Vagas limitadas para o lançamento.
            </p>
          </section>

          {/* Pack de Boas-Vindas – 50 Pioneiros */}
          <section
            className="card"
            style={{
              marginBottom: "clamp(24px, 6vw, 32px)",
              padding: "clamp(20px, 5vw, 28px)",
              borderColor: "var(--primary)",
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)", marginBottom: 20, textAlign: "center" }}
            >
              🥊 Torne-se um dos 50 Pioneiros KFS.
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-secondary)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                lineHeight: 1.7,
              }}
            >
              <li style={{ marginBottom: 16 }}>
                <strong style={{ color: "var(--text-primary)" }}>Seminário Exclusivo &quot;The Chiang Mai Connection&quot;:</strong>{" "}
                Um workshop intensivo de um dia inteiro onde ensinaremos as técnicas de elite, ajustes de guarda e estratégias de combate que trouxemos diretamente dos melhores camps de Chiang Mai, na Tailândia.
              </li>
              <li style={{ marginBottom: 16 }}>
                <strong style={{ color: "var(--text-primary)" }}>Mensalidade Blindada:</strong>{" "}
                Garanta o valor promocional de abertura para sempre. Enquanto a escola cresce, o seu investimento permanece o mesmo.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Prioridade na Grade:</strong>{" "}
                Escolha os horários das primeiras turmas antes de todo mundo.
              </li>
            </ul>
          </section>

          <FormularioListaEspera source={source} />

          {/* Prova Social e Autoridade – Tailândia */}
          <section
            className="relative overflow-hidden rounded-2xl"
            style={{
              marginTop: "clamp(32px, 8vw, 48px)",
              minHeight: 220,
              backgroundImage: "url(/tailandia.jpeg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
            />
            <div
              className="relative flex flex-col justify-center px-5 py-8 sm:px-6 sm:py-10"
              style={{ minHeight: 220 }}
            >
              <p
                className="text-base sm:text-lg font-medium max-w-xl"
                style={{ color: "#fff", lineHeight: 1.5, margin: 0 }}
              >
                Metodologia validada na fonte: técnicas trazidas diretamente do norte da Tailândia para o tatame de Oeiras.
              </p>
            </div>
          </section>

          {/* Rodapé – Instagram */}
          <footer
            style={{
              marginTop: "clamp(40px, 10vw, 56px)",
              paddingTop: 24,
              borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <a
              href="https://www.instagram.com/kingdomfightschool"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              @kingdomfightschool
            </a>
          </footer>
        </div>
      </main>
    </>
  );
}
