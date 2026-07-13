"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/coach/arbitragem", label: "Combates", exact: true },
  { href: "/coach/arbitragem/gestao", label: "Gestão" },
  { href: "/coach/arbitragem/historico", label: "Histórico" },
];

export function ArbitrationSubNav() {
  const pathname = usePathname();

  return (
    <nav className="arb-subnav" aria-label="Arbitragem">
      {LINKS.map((link) => {
        const active =
          link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={active ? "arb-subnav-active" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
