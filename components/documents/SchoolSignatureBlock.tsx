import type { SchoolSignature } from "@/lib/school-signatures";

type Props = {
  signatures: SchoolSignature[];
  /** Título da secção — por omissão "Pela Kingdom Fight School". */
  title?: string;
};

/** Bloco com as assinaturas fixas dos admins marcados como "assina pela escola" — usado nos três documentos de adesão. */
export function SchoolSignatureBlock({ signatures, title = "Pela Kingdom Fight School" }: Props) {
  if (signatures.length === 0) return null;
  return (
    <div style={{ margin: "16px 0 0" }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {signatures.map((s) => (
          <div key={s.imageUrl}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.imageUrl}
              alt={`Assinatura de ${s.name}`}
              style={{ maxWidth: 220, background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            {s.name ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{s.name}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
