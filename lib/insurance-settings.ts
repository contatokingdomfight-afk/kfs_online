import type { SupabaseClient } from "@supabase/supabase-js";

export type InsuranceSettingsRow = {
  id: string;
  annualAmount: number;
  enrollmentAmount: number;
  policyReference: string | null;
  waiverVersion: string;
  membershipAgreementVersion: string;
  enrollmentFormVersion: string;
  updatedAt: string;
};

const DEFAULTS: InsuranceSettingsRow = {
  id: "global",
  annualAmount: 0,
  enrollmentAmount: 0,
  policyReference: null,
  waiverVersion: "1",
  membershipAgreementVersion: "1",
  enrollmentFormVersion: "1",
  updatedAt: new Date().toISOString(),
};

export async function getInsuranceSettings(
  supabase: SupabaseClient
): Promise<InsuranceSettingsRow> {
  const { data } = await supabase
    .from("InsuranceSettings")
    .select(
      "id, annualAmount, enrollmentAmount, policyReference, waiverVersion, membershipAgreementVersion, enrollmentFormVersion, updatedAt"
    )
    .eq("id", "global")
    .maybeSingle();

  if (!data) return DEFAULTS;

  return {
    id: data.id,
    annualAmount: Number(data.annualAmount ?? 0),
    enrollmentAmount: Number((data as { enrollmentAmount?: number }).enrollmentAmount ?? 0),
    policyReference: (data.policyReference as string | null) ?? null,
    waiverVersion: String(data.waiverVersion ?? "1"),
    membershipAgreementVersion: String(
      (data as { membershipAgreementVersion?: string }).membershipAgreementVersion ?? "1"
    ),
    enrollmentFormVersion: String((data as { enrollmentFormVersion?: string }).enrollmentFormVersion ?? "1"),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

/** Contrato de adesão assinado e em vigor para a versão actual. */
export function isMembershipAgreementCurrent(
  row: { agreementSigned?: boolean; agreementVersion?: string | null } | null | undefined,
  currentVersion: string
): boolean {
  if (!row?.agreementSigned) return false;
  const signedVersion = row.agreementVersion ?? "";
  if (!signedVersion || signedVersion === "legacy") return true;
  return signedVersion === currentVersion;
}

export type InsuranceCoverageStatus = "covered" | "expiring" | "expired" | "none";

export type InsuranceCoverageRow = {
  covered: boolean;
  coverageStartDate: string | null;
  coverageEndDate: string | null;
  policyReference: string | null;
  notes: string | null;
};

/** Estado visual do seguro para listagens admin. */
export function computeInsuranceStatus(
  row: InsuranceCoverageRow | null | undefined,
  todayYmd: string
): InsuranceCoverageStatus {
  if (!row || !row.covered) return "none";
  const end = row.coverageEndDate;
  if (!end) return "none";
  if (end < todayYmd) return "expired";
  const expiringThreshold = addDaysYmd(todayYmd, 30);
  if (end <= expiringThreshold) return "expiring";
  return "covered";
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const INSURANCE_STATUS_LABEL: Record<InsuranceCoverageStatus, string> = {
  covered: "Coberto",
  expiring: "A expirar",
  expired: "Expirado",
  none: "Sem cobertura",
};
