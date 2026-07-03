"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AlunoTabs.module.css";

type Props = {
  studentId: string;
  showInscricaoTab?: boolean;
};

function isTabActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AlunoTabs({ studentId, showInscricaoTab = false }: Props) {
  const pathname = usePathname();
  const base = `/coach/alunos/${studentId}`;

  const tabs = [
    { href: base, label: "Visão geral", exact: true as const },
    ...(showInscricaoTab
      ? [{ href: `${base}/inscricao`, label: "Plano e seguro" as const }]
      : []),
    { href: `${base}/avaliacao-fisica`, label: "Avaliação física" },
    { href: `${base}/avaliacoes`, label: "Avaliações" },
    { href: `${base}/performance`, label: "Performance" },
  ];

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabBar} aria-label="Secções da ficha do aluno">
        {tabs.map((tab) => {
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
    </div>
  );
}
