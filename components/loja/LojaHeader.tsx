import Link from "next/link";
import { PublicQuickNav } from "@/components/PublicQuickNav";

export function LojaHeader({ loggedIn, crumb }: { loggedIn: boolean; crumb?: string }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold text-[var(--primary)] hover:opacity-80">
          ← Kingdom Fight School
        </Link>
        <span className="text-[var(--text-secondary)]" aria-hidden>/</span>
        <Link href="/loja" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
          Loja
        </Link>
        {crumb ? (
          <>
            <span className="text-[var(--text-secondary)]" aria-hidden>/</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{crumb}</span>
          </>
        ) : null}
        <span className="flex-1" />
        {loggedIn ? (
          <Link href="/loja/encomendas" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]">
            As minhas encomendas
          </Link>
        ) : null}
      </div>
      <div className="mx-auto max-w-6xl">
        <PublicQuickNav locale="pt" />
      </div>
    </header>
  );
}
