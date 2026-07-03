"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./FinanceiroTabs.module.css";

const TABS = [
  { href: "/admin/financeiro", label: "Visão geral", exact: true },
  { href: "/admin/financeiro/novo", label: "Registar pagamento" },
  { href: "/admin/financeiro/compras", label: "Compras e inscrições" },
  { href: "/admin/financeiro/coaches", label: "Pagamentos a coaches" },
  { href: "/admin/financeiro/antecipado", label: "Pagamento antecipado" },
  { href: "/admin/financeiro/primeiro-pagamento", label: "Primeiro pagamento" },
  { href: "/admin/financeiro/relatorio", label: "Relatório consolidado" },
] as const;

function isTabActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinanceiroTabs() {
  const pathname = usePathname();

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabBar} aria-label="Secções do financeiro">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href, "exact" in tab ? tab.exact : false);
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
      <Link href="/admin/loja" className={styles.lojaLink}>
        Loja presencial →
      </Link>
    </div>
  );
}
