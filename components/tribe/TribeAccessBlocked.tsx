import Link from "next/link";

type Props = {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
};

export function TribeAccessBlocked({ title, message, backHref = "/dashboard", backLabel }: Props) {
  return (
    <main className="container-mobile py-8">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", padding: "clamp(20px, 5vw, 28px)" }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {message}
        </p>
        {backLabel ? (
          <Link href={backHref} className="btn" style={{ marginTop: 22, display: "inline-block", textDecoration: "none" }}>
            {backLabel}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
