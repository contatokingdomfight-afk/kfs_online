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
        className="min-h-screen flex flex-col items-center lista-espera-page"
        style={{ backgroundColor: "var(--bg)", paddingTop: "clamp(24px, 6vw, 48px)", paddingBottom: "clamp(48px, 10vw, 80px)" }}
      >
        <div className="lista-espera-container">
          {/* Hero – título centralizado */}
          <section className="lista-espera-hero">
            <div
              className="absolute inset-0 -z-10 opacity-40 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(193, 18, 31, 0.2), transparent)",
              }}
            />
            <h1 className="lista-espera-hero-title">
              A primeira Kingdom Fight School está a chegar a Oeiras/Cascais.
            </h1>
            <p className="lista-espera-hero-sub">
              Garanta o seu lugar na vanguarda do treino marcial. Vagas limitadas para o lançamento.
            </p>
          </section>

          <FormularioListaEspera source={source} />

          {/* 50 Pioneiros – abaixo do formulário */}
          <section className="lista-espera-pioneiros">
            <h2 className="lista-espera-pioneiros-title">
              Torne-se um dos 50 Pioneiros KFS.
            </h2>
            <ul className="lista-espera-pioneiros-list">
              <li>
                <strong>Seminário Exclusivo &quot;The Chiang Mai Connection&quot;:</strong>{" "}
                Um workshop intensivo de um dia inteiro onde ensinaremos as técnicas de elite, ajustes de guarda e estratégias de combate que trouxemos diretamente dos melhores camps de Chiang Mai, na Tailândia.
              </li>
              <li>
                <strong>Mensalidade Blindada:</strong>{" "}
                Garanta o valor promocional de abertura para sempre. Enquanto a escola cresce, o seu investimento permanece o mesmo.
              </li>
              <li>
                <strong>Prioridade na Grade:</strong>{" "}
                Escolhe os horários das primeiras turmas antes de toda a gente.
              </li>
            </ul>
          </section>

          {/* Prova Social e Autoridade – Tailândia */}
          <section className="lista-espera-authority">
            <div className="absolute inset-0 rounded-2xl lista-espera-authority-overlay" />
            <div className="relative flex flex-col justify-center lista-espera-authority-inner">
              <p
                className="text-base sm:text-lg md:text-xl font-medium"
                style={{ color: "#fff", lineHeight: 1.4, margin: 0 }}
              >
                Treine com Propósito.
                <br />
                Lute com Disciplina.
              </p>
            </div>
          </section>

          {/* Vídeos – apresentação + Shorts (mesmos da home) */}
          <section className="lista-espera-videos">
            <h2 className="lista-espera-videos-title">A história da KFS</h2>
            <div className="lista-espera-video-wrap lista-espera-video-main">
              <iframe
                src="https://www.youtube.com/embed/eQWUG9Q61c4?start=3"
                title="A história da KFS"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="lista-espera-iframe"
              />
            </div>
            <h3 className="lista-espera-videos-subtitle">KFS em ação</h3>
            <p className="lista-espera-videos-desc">Alguns momentos do nosso dia a dia no tatame.</p>
            <div className="lista-espera-shorts-grid">
              {["cvKryFioSkc", "qotPbvcE2Zw", "4TIfiWJm3L8", "jZ1KZLz_Mk0", "zigTvTl_HEs", "UMB2jgvBji4"].map((id) => (
                <div key={id} className="lista-espera-video-wrap lista-espera-video-short">
                  <iframe
                    src={`https://www.youtube.com/embed/${id}`}
                    title="YouTube Short"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="lista-espera-iframe"
                  />
                </div>
              ))}
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
