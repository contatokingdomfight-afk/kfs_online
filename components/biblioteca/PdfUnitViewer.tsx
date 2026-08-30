type Props = {
  url: string | null;
  title: string;
  fallbackMessage?: string;
};

/** Visualizador simples de PDF: iframe (os navegadores já mostram PDF nativamente) + link de reforço. */
export function PdfUnitViewer({ url, title, fallbackMessage = "Este documento não está disponível." }: Props) {
  if (!url) {
    return (
      <div
        style={{
          padding: "clamp(24px, 6vw, 32px)",
          textAlign: "center",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border)",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{fallbackMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <iframe
        src={url}
        title={title}
        style={{ width: "100%", height: "70vh", border: "none", borderRadius: "var(--radius-md)" }}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 14, color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
      >
        Abrir em nova aba →
      </a>
    </div>
  );
}
