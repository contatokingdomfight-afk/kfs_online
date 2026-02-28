import Link from "next/link";

type Content = {
  footerLinks: string;
  footerAulaExp: string;
  footerSignIn: string;
  footerSignUp: string;
  footerContact: string;
  footerRights: string;
};

export function Footer({ content }: { content: Content }) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-bold text-[var(--text-primary)]">
              Kingdom Fight School
            </span>
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
