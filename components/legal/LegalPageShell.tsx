import Link from "next/link";
import type { ReactNode } from "react";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicQuickNav } from "@/components/PublicQuickNav";

type Props = {
  title: string;
  children: ReactNode;
  updatedAt?: string;
  locale?: "pt" | "en";
};

export async function LegalPageShell({ title, children, updatedAt, locale = "pt" }: Props) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text-primary)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ padding: "16px clamp(16px, 4vw, 24px) 0" }}>
          <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
            ← Kingdom Fight School
          </Link>
        </div>
        <PublicQuickNav locale={locale} />
      </header>
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "clamp(24px, 6vw, 40px) clamp(16px, 4vw, 24px)",
          lineHeight: 1.65,
          fontSize: "clamp(15px, 3.8vw, 16px)",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(24px, 5vw, 28px)", fontWeight: 700 }}>{title}</h1>
        {updatedAt ? (
          <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", fontSize: 14 }}>
            {locale === "pt" ? "Última atualização" : "Last updated"}: {updatedAt}
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "var(--text-primary)" }}>{children}</div>
      </article>
      <PublicSiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 600 }}>{title}</h2>
      <div style={{ color: "var(--text-secondary)" }}>{children}</div>
    </section>
  );
}
