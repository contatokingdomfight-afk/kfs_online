import Link from "next/link";

type Props = {
  title: string;
  themeTitle: string | null;
  modalityLabel: string;
  defineLabel: string;
  noThemeHint: string;
};

export function WeekThemeCard({
  title,
  themeTitle,
  modalityLabel,
  defineLabel,
  noThemeHint,
}: Props) {
  return (
    <section
      className="card"
      style={{ padding: "clamp(16px, 4vw, 20px)" }}
    >
      <h2
        style={{
          margin: "0 0 clamp(12px, 3vw, 16px) 0",
          fontSize: "clamp(16px, 4vw, 18px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      {themeTitle ? (
        <p
          style={{
            margin: "0 0 clamp(12px, 3vw, 16px) 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
            lineHeight: 1.5,
          }}
        >
          <strong>{modalityLabel}:</strong> {themeTitle}
        </p>
      ) : (
        <p
          style={{
            margin: "0 0 clamp(12px, 3vw, 16px) 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {noThemeHint}
        </p>
      )}
      <Link
        href="/coach/tema-semana"
        className="btn btn-secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          fontSize: "clamp(14px, 3.5vw, 16px)",
        }}
      >
        <span aria-hidden>✍️</span>
        {defineLabel}
      </Link>
    </section>
  );
}
