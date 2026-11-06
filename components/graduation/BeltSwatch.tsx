import { useId } from "react";
import { gloveSvg, isGloveModality } from "@/lib/graduation/glove-svg";

/**
 * Símbolo do grau. Por defeito é uma faixa desenhada com 1–4 cores em segmentos iguais (ex.: Branco/Laranja).
 * No Boxe (`modality` = BOXING) é uma luva: 1.ª cor = luva, 2.ª = punho.
 */
export function BeltSwatch({
  colors,
  width = 56,
  height = 14,
  title,
  modality,
}: {
  colors: string[];
  width?: number | string;
  height?: number;
  title?: string;
  /** Código da modalidade (ModalityRef.code). Boxe mostra luva em vez de faixa. */
  modality?: string | null;
}) {
  if (isGloveModality(modality) && colors.length > 0) {
    return <GloveSwatch colors={colors} height={height} title={title} />;
  }
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

/** Luva com tamanho proporcional à altura que a faixa teria (a faixa é baixa; a luva é quadrada). */
function GloveSwatch({ colors, height, title }: { colors: string[]; height: number; title?: string }) {
  const id = useId();
  const size = Math.max(18, Math.round(height * 1.9));
  return (
    <span
      title={title}
      style={{ display: "inline-flex", flexShrink: 0, verticalAlign: "middle", lineHeight: 0 }}
      // SVG gerado a partir de constantes e de cores validadas (#rrggbb) — sem conteúdo do utilizador.
      dangerouslySetInnerHTML={{ __html: gloveSvg(colors, { size, idSeed: id, title }) }}
    />
  );
}
