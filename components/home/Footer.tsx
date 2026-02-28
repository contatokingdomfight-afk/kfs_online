import Link from "next/link";

type Content = {
  footerLinks: string;
  footerAulaExp: string;
  footerSignIn: string;
  footerSignUp: string;
  footerContact: string;
  footerRights: string;
  youtubeUrl: string;
  instagramUrl: string;
};

export function Footer({ content }: { content: Content }) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-lg font-bold text-[var(--text-primary)]">
              Kingdom Fight School
            </span>
            <div className="mt-4 flex gap-4">
              <a
                href={content.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
                aria-label="YouTube"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href={content.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
                aria-label="Instagram"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
              {content.footerLinks}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-4">
              <li>
                <Link
                  href="/aula-experimental"
                  className="text-sm text-[var(--text-primary)] hover:text-[var(--primary)]"
                >
                  {content.footerAulaExp}
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="text-sm text-[var(--text-primary)] hover:text-[var(--primary)]"
                >
                  {content.footerSignIn}
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-[var(--text-primary)] hover:text-[var(--primary)]"
                >
                  {content.footerSignUp}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--border)] pt-8 text-center text-sm text-[var(--text-secondary)]">
          {content.footerRights}
        </div>
      </div>
    </footer>
  );
}
