import Image from "next/image";
import Link from "next/link";
import {
  BRAND_EMBLEM_HEIGHT,
  BRAND_EMBLEM_WIDTH,
  BRAND_LOGO,
  BRAND_LOGO_EMBLEM,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand";

type Variant = "header" | "launch" | "compact";

/** Header: emblema compacto (proporção ~1024×365). */
const HEADER_HEIGHT_PX = 38;

const MAX_WIDTH: Record<Variant, string> = {
  header: "min(28vw, 108px)",
  launch: "min(92vw, 380px)",
  compact: "min(42vw, 140px)",
};

type Props = {
  variant?: Variant;
  href?: string;
  className?: string;
  priority?: boolean;
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
  const src = isHeader ? BRAND_LOGO_EMBLEM : BRAND_LOGO;
  const width = isHeader ? BRAND_EMBLEM_WIDTH : BRAND_LOGO_WIDTH;
  const height = isHeader ? BRAND_EMBLEM_HEIGHT : BRAND_LOGO_HEIGHT;

  const image = (
    <Image
      src={src}
      alt={ariaLabel}
      width={width}
      height={height}
      priority={priority}
      unoptimized={isHeader}
      sizes={isHeader ? "108px" : variant === "launch" ? "92vw" : "42vw"}
      className={className}
      style={
        isHeader
          ? {
              height: HEADER_HEIGHT_PX,
              width: "auto",
              maxWidth: MAX_WIDTH.header,
              objectFit: "contain",
              display: "block",
              imageRendering: "auto",
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
