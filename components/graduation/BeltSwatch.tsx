/** Faixa desenhada com 1–4 cores em segmentos iguais (ex.: Branco/Laranja). */
export function BeltSwatch({
  colors,
  width = 56,
  height = 14,
  title,
}: {
  colors: string[];
  width?: number | string;
  height?: number;
  title?: string;
}) {
  const list = colors.length > 0 ? colors : ["transparent"];
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        width,
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1px var(--border)",
        background: colors.length === 0 ? "repeating-linear-gradient(45deg, var(--border) 0 4px, transparent 4px 8px)" : undefined,
      }}
    >
      {colors.length > 0 && list.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}
    </span>
  );
}
