"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BemEstarTabs.module.css";

type Props = {
  locale: "pt" | "en";
};

const TABS_PT = [
  { href: "/dashboard/bem-estar/rpe", label: "RPE pós-treino" },
  { href: "/dashboard/bem-estar/dores", label: "Dores" },
  { href: "/dashboard/bem-estar/benchmarks", label: "Testes físicos" },
  { href: "/dashboard/bem-estar/peso", label: "Peso e metas" },
] as const;

const TABS_EN = [
  { href: "/dashboard/bem-estar/rpe", label: "Post-training RPE" },
  { href: "/dashboard/bem-estar/dores", label: "Pain" },
  { href: "/dashboard/bem-estar/benchmarks", label: "Benchmarks" },
  { href: "/dashboard/bem-estar/peso", label: "Weight & goals" },
] as const;

function isTabActive(pathname: string, href: string) {
  if (href === "/dashboard/bem-estar/rpe") {
    return pathname === "/dashboard/bem-estar" || pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BemEstarTabs({ locale }: Props) {
  const pathname = usePathname();
  const tabs = locale === "en" ? TABS_EN : TABS_PT;
  const ariaLabel = locale === "en" ? "Wellness sections" : "Secções de bem-estar";

  return (
    <div className={styles.wrapper}>
      <nav className={styles.tabBar} aria-label={ariaLabel}>
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
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
