import type { AnatomicalBodyMapRegionId, AnatomicalBodyMapRow } from "@/lib/anatomical-body-map-from-form";
import type { BodyMark } from "@/lib/body-map/marks";

/** ok = há medidas; warn = há nota de postura/mobilidade a vigiar; none = sem dados na ficha. */
export type RegionStatus = "ok" | "warn" | "none";

export const REGION_STATUS_COLOR: Record<RegionStatus, string> = {
  ok: "#1D9E75",
  warn: "#E0A33A",
  none: "#5b6170",
};

const FLAG_LABEL_RE = /^(postura|posture|mobilidade|mobility)/i;

export function regionStatus(rows: readonly AnatomicalBodyMapRow[]): RegionStatus {
  if (rows.length === 0) return "none";
  return rows.some((r) => FLAG_LABEL_RE.test(r.label)) ? "warn" : "ok";
}

export function regionStatuses(
  regions: Record<AnatomicalBodyMapRegionId, readonly AnatomicalBodyMapRow[]>
): Record<AnatomicalBodyMapRegionId, RegionStatus> {
  const out = {} as Record<AnatomicalBodyMapRegionId, RegionStatus>;
  for (const k of Object.keys(regions) as AnatomicalBodyMapRegionId[]) out[k] = regionStatus(regions[k]);
  return out;
}

export type BodyMapFigureCommonProps = {
  view: "front" | "back";
  status: Record<AnatomicalBodyMapRegionId, RegionStatus>;
  active: AnatomicalBodyMapRegionId | null;
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  labels: Record<AnatomicalBodyMapRegionId, string>;
  ariaLabel: string;
  /** Dores recentes e lesões antigas a desenhar no corpo. */
  marks: readonly BodyMark[];
};

/** Mistura de duas cores hex (#rrggbb), t em [0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = parse(a);
  const B = parse(b);
  return `#${A.map((v, i) =>
    Math.round(v + (B[i] - v) * t)
      .toString(16)
      .padStart(2, "0")
  ).join("")}`;
}
