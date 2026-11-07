/**
 * Cupões de desconto (puro — usado no browser e no servidor).
 * Um cupão é de uma escola, vale para inscrição/seguro/mensalidade/loja e tem um nº máximo de pessoas.
 */

export const COUPON_TARGETS = ["ENROLLMENT", "INSURANCE", "TUITION", "STORE"] as const;
export type CouponTarget = (typeof COUPON_TARGETS)[number];

export const COUPON_TARGET_LABEL: Record<CouponTarget, string> = {
  ENROLLMENT: "Inscrição",
  INSURANCE: "Seguro",
  TUITION: "Mensalidade",
  STORE: "Loja",
};

export type CouponRow = {
  id: string;
  code: string;
  name: string | null;
  kind: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  schoolId: string | null;
  appliesTo: CouponTarget[];
  maxRedemptions: number | null;
  startsAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  createdAt?: string;
};

export const COUPON_SELECT = "id, code, name, kind, value, isActive, schoolId, appliesTo, maxRedemptions, startsAt, endsAt, endedAt, createdAt";

export type CouponStatus = "ACTIVE" | "PAUSED" | "ENDED" | "EXPIRED" | "SCHEDULED" | "EXHAUSTED";

export const COUPON_STATUS_LABEL: Record<CouponStatus, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ENDED: "Encerrado",
  EXPIRED: "Expirado",
  SCHEDULED: "Agendado",
  EXHAUSTED: "Esgotado",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function toCouponRow(r: Record<string, unknown>): CouponRow {
  return {
    id: String(r.id),
    code: String(r.code),
    name: (r.name as string | null) ?? null,
    kind: r.kind === "FIXED" ? "FIXED" : "PERCENT",
    value: Number(r.value),
    isActive: Boolean(r.isActive),
    schoolId: (r.schoolId as string | null) ?? null,
    appliesTo: (Array.isArray(r.appliesTo) && r.appliesTo.length ? r.appliesTo : ["STORE"]) as CouponTarget[],
    maxRedemptions: r.maxRedemptions == null ? null : Number(r.maxRedemptions),
    startsAt: (r.startsAt as string | null) ?? null,
    endsAt: (r.endsAt as string | null) ?? null,
    endedAt: (r.endedAt as string | null) ?? null,
    createdAt: (r.createdAt as string | undefined) ?? undefined,
  };
}

export function couponStatus(c: CouponRow, usedBy: number, now = new Date()): CouponStatus {
  if (c.endedAt) return "ENDED";
  if (c.endsAt && new Date(c.endsAt) < now) return "EXPIRED";
  if (c.maxRedemptions != null && usedBy >= c.maxRedemptions) return "EXHAUSTED";
  if (!c.isActive) return "PAUSED";
  if (c.startsAt && new Date(c.startsAt) > now) return "SCHEDULED";
  return "ACTIVE";
}

/** Mensagem para o aluno quando o cupão não está utilizável (null = pode usar). */
export function couponUnavailableReason(status: CouponStatus, c: CouponRow): string | null {
  const d = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
  switch (status) {
    case "ACTIVE":
      return null;
    case "EXPIRED":
      return `Este cupão terminou a ${d(c.endsAt!)}.`;
    case "SCHEDULED":
      return `Este cupão só começa a ${d(c.startsAt!)}.`;
    case "EXHAUSTED":
      return "Este cupão já chegou ao número máximo de pessoas.";
    default:
      return "Este cupão já não está ativo.";
  }
}

export function couponValueLabel(c: Pick<CouponRow, "kind" | "value">): string {
  return c.kind === "PERCENT" ? `${c.value}%` : `${c.value % 1 === 0 ? c.value.toFixed(0) : c.value.toFixed(2).replace(".", ",")} €`;
}

/** «100% inscrição», «10 € mensalidade + loja». */
export function couponSummary(c: Pick<CouponRow, "kind" | "value" | "appliesTo">): string {
  return `${couponValueLabel(c)} ${c.appliesTo.map((t) => COUPON_TARGET_LABEL[t].toLowerCase()).join(" + ")}`;
}

/** Desconto num valor (nunca mais do que o próprio valor). */
export function couponDiscountFor(c: Pick<CouponRow, "kind" | "value">, amount: number): number {
  if (!(amount > 0)) return 0;
  return round2(Math.min(amount, c.kind === "PERCENT" ? (amount * c.value) / 100 : c.value));
}
