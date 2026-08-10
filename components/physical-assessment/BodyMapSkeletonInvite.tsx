"use client";

import Link from "next/link";

type Props = {
  locale: "pt" | "en";
  scheduleHref: string;
  className?: string;
};

/** Aviso compacto (ícone + texto) + CTA para avaliação física quando ainda não há ficha na plataforma. */
export function BodyMapSkeletonInvite({ locale, scheduleHref, className }: Props) {
  const L = locale === "pt";
  const copy = L
    ? {
        title: "Ainda sem mapa corporal",
        body: "A tua escola ainda não registou a tua avaliação física.",
        cta: "Como agendar a avaliação física",
      }
    : {
        title: "No body map yet",
        body: "Your school hasn't recorded your physical assessment yet.",
        cta: "How to schedule your physical assessment",
      };

  return (
    <div
      className={[
        "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col gap-3",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-xl"
          aria-hidden
        >
          📏
        </div>
        <div className="text-left">
          <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">{copy.title}</p>
          <p className="m-0 mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{copy.body}</p>
        </div>
      </div>

      <Link href={scheduleHref} className="btn btn-primary no-underline text-sm px-4 py-2 w-full text-center">
        {copy.cta}
      </Link>
    </div>
  );
}
