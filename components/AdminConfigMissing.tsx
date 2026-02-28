import Link from "next/link";

type ErrorType = "missing" | "wrong_key";

export function AdminConfigMissing({
  errorType = "missing",
  backHref = "/admin",
  backLabel = "← Voltar ao Admin",
}: { errorType?: ErrorType; backHref?: string; backLabel?: string } = {}) {
  const isWrongKey = errorType === "wrong_key";
  return (
    <div
      className="card"
      style={{
        maxWidth: 480,
        padding: "clamp(20px, 5vw, 28px)",
        marginTop: "clamp(16px, 4vw, 24px)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px 0",
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {isWrongKey ? "Chave incorreta" : "Configuração em falta"}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {isWrongKey ? (
          <>
            A chave que configuraste em <strong>SUPABASE_SERVICE_ROLE_KEY</strong> parece ser a chave <strong>pública (publishable)</strong>, que começa por <code style={{ fontSize: "0.9em", padding: "2px 6px", backgroundColor: "var(--bg-secondary)", borderRadius: 4 }}>sb_publishable_</code>. Para a área admin é necessária a chave <strong>service_role</strong> (secret). No Supabase: <strong>Settings → API</strong> → em Project API keys, copia a chave <strong>service_role</strong> (não a anon/publishable) e coloca no <code style={{ fontSize: "0.9em", padding: "2px 6px", backgroundColor: "var(--bg-secondary)", borderRadius: 4 }}>.env</code> como <strong>SUPABASE_SERVICE_ROLE_KEY</strong>. Reinicia o servidor depois.
          </>
        ) : (
          <>
            Para usar esta área, defina no ficheiro <code style={{ fontSize: "0.9em", padding: "2px 6px", backgroundColor: "var(--bg-secondary)", borderRadius: 4 }}>.env</code> as
            variáveis <strong>NEXT_PUBLIC_SUPABASE_URL</strong> e <strong>SUPABASE_SERVICE_ROLE_KEY</strong>. A chave
            service_role encontra-se no Supabase (Settings → API → service_role).
          </>
        )}
      </p>
      <Link
        href={backHref}
        className="btn"
        style={{ marginTop: 20, display: "inline-block", textDecoration: "none" }}
      >
        {backLabel}
      </Link>
    </div>
  );
}
