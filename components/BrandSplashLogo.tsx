import Image from "next/image";
import { BRAND_LOGO_NO_BG } from "@/lib/brand";

/** Proporção real do ficheiro em `public/brand/kfs-logotipo-sem-fundo.png`. */
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 630;

type Variant = "launch" | "compact";

const MAX_WIDTH: Record<Variant, string> = {
  launch: "min(92vw, 380px)",
  compact: "min(42vw, 140px)",
};

type Props = {
  variant?: Variant;
  /** Classe extra no contentor (ex.: animação CSS). */
  className?: string;
};

/**
 * Logotipo sem fundo sobre grafite — evita “duplo fundo” da versão oficial com textura.
 */
export function BrandSplashLogo({ variant = "launch", className }: Props) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: MAX_WIDTH[variant],
        maxWidth: "100%",
        aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-8% -4%",
          background:
            "radial-gradient(ellipse 75% 65% at 50% 42%, rgba(209, 213, 219, 0.14), transparent 72%)",
          pointerEvents: "none",
        }}
      />
      <Image
        src={BRAND_LOGO_NO_BG}
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        sizes={variant === "launch" ? "92vw" : "42vw"}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
