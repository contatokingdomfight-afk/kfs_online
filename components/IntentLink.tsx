"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & {
  href: string;
  /** false = nunca pré-carrega (nem com intenção). Por defeito pré-carrega só com intenção. */
  prefetch?: boolean;
};

/**
 * Link dos menus: não pré-carrega a página só por estar visível (poupa invocações/CPU na Vercel);
 * pré-carrega quando há intenção de clicar — rato por cima (desktop), toque no ecrã (telemóvel)
 * ou foco do teclado — uma vez por montagem.
 */
export function IntentLink({ href, prefetch, onMouseEnter, onTouchStart, onFocus, ...rest }: Props) {
  const router = useRouter();
  const done = useRef(false);

  const warm = () => {
    if (prefetch === false || done.current) return;
    done.current = true;
    router.prefetch(href);
  };

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
    />
  );
}
