"use client";

import Link from "next/link";

type Props = {
  locale: "pt" | "en";
  scheduleHref: string;
  className?: string;
};

/** Ilustração simples de esqueleto (linha) + CTA para avaliação física quando ainda não há ficha na plataforma. */
export function BodyMapSkeletonInvite({ locale, scheduleHref, className }: Props) {
  const L = locale === "pt";
  const copy = L
    ? {
        title: "Ainda sem mapa corporal",
        body: "Quando a tua escola registar a tua avaliação física, verás aqui um mapa ilustrativo com as tuas medidas.",
        cta: "Como renovar a avaliação física",
      }
    : {
        title: "No body map yet",
        body: "Once your school records your physical assessment, you will see an illustrative map with your measures here.",
        cta: "How to schedule your physical assessment",
      };

  return (
    <div
      className={[
        "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col items-center text-center gap-4",
        className ?? "",
      ].join(" ")}
    >
      <div>
        <p className="m-0 text-base font-semibold text-[var(--text-primary)]">{copy.title}</p>
        <p className="m-0 mt-1 text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">{copy.body}</p>
      </div>

      <div className="w-full max-w-[200px] aspect-[200/369] mx-auto text-[var(--text-secondary)]" aria-hidden>
        <svg viewBox="0 0 200 369" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.2">
          <ellipse cx="100" cy="28" rx="14" ry="18" />
          <path d="M100 46 L100 72" />
          <path d="M72 58 L128 58" />
          <path d="M100 72 L100 168" />
          <path d="M100 100 L58 142 M100 100 L142 142" />
          <path d="M100 168 L82 260 L78 340 M100 168 L118 260 L122 340" />
          <path d="M82 200 L58 248 M118 200 L142 248" />
          <circle cx="100" cy="200" r="3" fill="currentColor" stroke="none" opacity="0.35" />
        </svg>
      </div>

      <Link href={scheduleHref} className="btn btn-primary no-underline text-sm px-4 py-2">
        {copy.cta}
      </Link>
    </div>
  );
}
