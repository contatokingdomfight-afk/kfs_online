import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4, 16px)",
        padding: "var(--space-6, 24px)",
        background: "var(--bg)",
        color: "var(--text-primary)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "clamp(3rem, 12vw, 5rem)",
          fontWeight: 700,
          lineHeight: 1,
          color: "var(--primary)",
        }}
      >
        404
      </p>
      <h1 style={{ fontSize: "var(--text-xl, 1.25rem)", fontWeight: 600, margin: 0 }}>Página não encontrada</h1>
      <p style={{ fontSize: "var(--text-base, 1rem)", color: "var(--text-secondary)", margin: 0, maxWidth: 420 }}>
        A página que procuras não existe ou foi movida.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: "var(--radius-md, 8px)",
          border: "none",
          background: "var(--primary)",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
