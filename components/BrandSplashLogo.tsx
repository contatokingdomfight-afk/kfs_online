import Image from "next/image";
import {
  BRAND_LOGO,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand";

type Variant = "launch" | "compact";

const MAX_WIDTH: Record<Variant, string> = {
  launch: "min(92vw, 380px)",
  compact: "min(42vw, 140px)",
};

type Props = {
  variant?: Variant;
  className?: string;
};

/** Logotipo transparente centrado no splash (sem retângulo de fundo). */
export function BrandSplashLogo({ variant = "launch", className }: Props) {
  return (
    <div
      className={className}
      style={{
        width: MAX_WIDTH[variant],
        maxWidth: "100%",
        lineHeight: 0,
      }}
    >
      <Image
        src={BRAND_LOGO}
        alt=""
        width={BRAND_LOGO_WIDTH}
        height={BRAND_LOGO_HEIGHT}
        priority
        sizes={variant === "launch" ? "92vw" : "42vw"}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
