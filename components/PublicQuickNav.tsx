import Link from "next/link";

const LABELS = {
  pt: { plans: "Planos", schedule: "Horários", faq: "FAQ", signIn: "Entrar", trial: "Aula Experimental" },
  en: { plans: "Plans", schedule: "Schedule", faq: "FAQ", signIn: "Sign in", trial: "Trial Class" },
} as const;

const linkClass =
  "whitespace-nowrap text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]";

/**
 * Atalho para Planos/Horários/FAQ (secções da home) + Entrar/Aula Experimental,
 * para quem chega directamente numa página de modalidade ou legal via SEO/Google
 * e não tem nenhuma navegação para o resto do site.
 */
export function PublicQuickNav({ locale }: { locale: "pt" | "en" }) {
  const t = LABELS[locale];
  return (
    <nav
      aria-label={locale === "pt" ? "Navegação rápida" : "Quick navigation"}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] px-4 py-2 sm:px-6 lg:px-8"
    >
      <Link href="/#plans" className={linkClass}>
        {t.plans}
      </Link>
      <Link href="/#horarios" className={linkClass}>
        {t.schedule}
      </Link>
      <Link href="/#faq" className={linkClass}>
        {t.faq}
      </Link>
      <Link href="/sign-in" className={linkClass}>
        {t.signIn}
      </Link>
      <Link href="/aula-experimental" className={`${linkClass} font-semibold text-[var(--primary)]`}>
        {t.trial} →
      </Link>
    </nav>
  );
}
