import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand";

type Variant = "header" | "launch" | "compact";

const HEIGHT_PX: Record<Variant, number> = {
  header: 42,
  launch: 0,
  compact: 0,
};

const MAX_WIDTH: Record<Variant, string> = {
  header: "min(62vw, 208px)",
  launch: "min(92vw, 380px)",
  compact: "min(42vw, 140px)",
};

type Props = {
  variant?: Variant;
  /** Só em `header`: link para a home da área. */
  href?: string;
  className?: string;
  priority?: boolean;
  /** Acessibilidade quando substitui título textual. */
  ariaLabel?: string;
};

export function BrandLogo({
  variant = "header",
  href,
  className,
  priority = false,
  ariaLabel = "Kingdom Fight School",
}: Props) {
  const isHeader = variant === "header";

  const image = (
    <Image
      src={BRAND_LOGO}
      alt={ariaLabel}
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      priority={priority}
      sizes={isHeader ? "208px" : variant === "launch" ? "92vw" : "42vw"}
      className={className}
      style={
        isHeader
          ? {
              height: HEIGHT_PX.header,
              width: "auto",
              maxWidth: MAX_WIDTH.header,
              objectFit: "contain",
              display: "block",
            }
          : {
              width: MAX_WIDTH[variant],
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }
      }
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          minWidth: 0,
          lineHeight: 0,
        }}
      >
        {image}
      </Link>
    );
  }

  return image;
}
