import Image from "next/image";
import { BRAND_APP_ICON, BRAND_APP_ICON_SIZE } from "@/lib/brand";

type Variant = "launch" | "compact";

const MAX_WIDTH: Record<Variant, string> = {
  launch: "min(78vw, 300px)",
  compact: "min(42vw, 120px)",
};

type Props = {
  variant?: Variant;
  className?: string;
};

/** Logotipo transparente centrado no splash (mesmo asset que o ícone da PWA). */
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
        src={BRAND_APP_ICON}
        alt=""
        width={BRAND_APP_ICON_SIZE}
        height={BRAND_APP_ICON_SIZE}
        priority
        sizes={variant === "launch" ? "78vw" : "42vw"}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
