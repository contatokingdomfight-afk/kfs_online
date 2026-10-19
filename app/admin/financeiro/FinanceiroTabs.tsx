"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./FinanceiroTabs.module.css";

const MAIS_PATHS = [
  "/admin/financeiro/mais",
  "/admin/financeiro/novo",
  "/admin/financeiro/compras",
  "/admin/financeiro/coaches",
  "/admin/financeiro/antecipado",
  "/admin/financeiro/primeiro-pagamento",
];

const TABS: { href: string; label: string; exact?: boolean; paths?: string[] }[] = [
  { href: "/admin/financeiro", label: "Receber", exact: true },
  { href: "/admin/financeiro/mensalidades", label: "Mensalidades" },
  { href: "/admin/financeiro/despesas", label: "Despesas" },
  { href: "/admin/financeiro/movimentos", label: "Movimentos" },
  { href: "/admin/financeiro/banco", label: "Revolut" },
  { href: "/admin/financeiro/relatorio", label: "Relatórios" },
  { href: "/admin/financeiro/mais", label: "Mais", paths: MAIS_PATHS },
];

function isTabActive(pathname: string, tab: (typeof TABS)[number]) {
  if (tab.exact) return pathname === tab.href;
  return (tab.paths ?? [tab.href]).some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** Separadores do financeiro: Receber · Despesas · Movimentos · Relatórios · Mais. */
export function FinanceiroTabs() {
  const pathname = usePathname();

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabBar} aria-label="Secções do financeiro">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
