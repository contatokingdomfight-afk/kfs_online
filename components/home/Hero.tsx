import Link from "next/link";

type Content = {
  heroHeadline1: string;
  heroHeadline2: string;
  heroSubheadline: string;
  ctaStart: string;
  ctaViewTrainings: string;
};

export function Hero({ content }: { content: Content }) {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Vídeo de fundo (treino real) — pausado/oculto com prefers-reduced-motion, mostra o poster estático */}
      <div className="absolute inset-0 -z-30 overflow-hidden motion-reduce:hidden">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/banner-home-poster.jpg"
          aria-hidden="true"
        >
          <source src="/media/banner-home.mp4" type="video/mp4" />
        </video>
      </div>
      <div
        className="absolute inset-0 -z-30 hidden bg-cover bg-center motion-reduce:block"
        style={{ backgroundImage: "url(/media/banner-home-poster.jpg)" }}
        aria-hidden="true"
      />
      {/* Overlay escuro para legibilidade do texto sobre o vídeo */}
      <div className="absolute inset-0 -z-20 bg-black/60" aria-hidden="true" />
      {/* Acento de marca */}
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(193, 18, 31, 0.25), transparent)",
        }}
      />
      {/* Transição suave para o fundo da página (evita corte abrupto, sobretudo no tema claro) */}
      <div
        className="absolute inset-x-0 top-0 -z-10 h-20 sm:h-28"
        style={{ background: "linear-gradient(to bottom, var(--bg), transparent)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-20 sm:h-28"
        style={{ background: "linear-gradient(to top, var(--bg), transparent)" }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="animate-fade-in text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="block">{content.heroHeadline1}</span>
          <span className="block">{content.heroHeadline2}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-gray-200 sm:text-lg md:text-xl">
          {content.heroSubheadline}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/aula-experimental"
            className="btn btn-primary w-full min-w-[200px] min-h-[48px] px-8 py-3 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            {content.ctaStart}
          </Link>
          <Link
            href="/sign-in"
            className="btn btn-secondary w-full min-w-[200px] min-h-[48px] px-8 py-3 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            {content.ctaViewTrainings}
          </Link>
        </div>
      </div>
    </section>
  );
}
