import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { SEDE_LEGAL } from "@/lib/contract-party";
import { hasLegalData } from "@/lib/school-status";
import {
  COACH_CONTRACT_VERSION,
  schoolsMissingSignature,
  type CoachContractFields,
  type CoachScheduleRow,
} from "@/lib/coach-contract";

export type CoachPrivateDataRow = {
  legalName: string;
  nif: string;
  idDocumentNumber: string | null;
  address: string | null;
  iban: string | null;
  tptdNumber: string | null;
  tptdValidUntil: string | null;
  selfEmployed: boolean;
  onboardingCompletedAt: string | null;
};

export type CoachOnboardingState = {
  coachId: string;
  privateData: CoachPrivateDataRow | null;
  schoolIds: string[];
  /** Escolas onde falta assinar o contrato ou o termo da versão atual. */
  missingSchoolIds: string[];
  /** Entrou pelo pedido de acesso (registo via Google): fica bloqueado até assinar. Os antigos só veem um aviso. */
  approvedViaRequest: boolean;
  complete: boolean;
};

export async function loadCoachOnboardingState(db: SupabaseClient, coachId: string, userId: string): Promise<CoachOnboardingState> {
  const [{ data: pd }, { data: links }, { data: signed }, { data: approved }] = await Promise.all([
    db
      .from("CoachPrivateData")
      .select("legalName, nif, idDocumentNumber, address, iban, tptdNumber, tptdValidUntil, selfEmployed, onboardingCompletedAt")
      .eq("coachId", coachId)
      .maybeSingle(),
    db.from("CoachSchool").select("schoolId").eq("coachId", coachId),
    db.from("CoachDocumentSignature").select("schoolId, documentType, documentVersion").eq("coachId", coachId),
    db.from("CoachAccessRequest").select("id").eq("userId", userId).eq("status", "APPROVED").limit(1),
  ]);
  const schoolIds = (links ?? []).map((l) => l.schoolId as string);
  const missingSchoolIds = schoolsMissingSignature(
    schoolIds,
    (signed ?? []) as { schoolId: string; documentType: string; documentVersion: string }[]
  );
  const privateData = (pd as CoachPrivateDataRow | null) ?? null;
  return {
    coachId,
    privateData,
    schoolIds,
    missingSchoolIds,
    approvedViaRequest: (approved ?? []).length > 0,
    complete: Boolean(privateData) && missingSchoolIds.length === 0,
  };
}

/** Estado da adesão do professor com sessão (layout do coach). null = não é professor. */
export const getCurrentCoachOnboarding = cache(async function getCurrentCoachOnboarding(
  userId: string
): Promise<CoachOnboardingState | null> {
  const db = getAdminClientOrNull().client;
  if (!db) return null;
  const { data: coach } = await db.from("Coach").select("id").eq("userId", userId).maybeSingle();
  if (!coach) return null;
  return loadCoachOnboardingState(db, coach.id as string, userId);
});

export type SchoolLegalIdentity = { name: string; legalName: string; nif: string; legalAddress: string };

/** Dados legais da escola para o contrato; null = a escola ainda não os preencheu (não se pode assinar). */
export async function loadSchoolLegalIdentity(db: SupabaseClient, schoolId: string): Promise<SchoolLegalIdentity | null> {
  const [{ data: school }, { data: settings }] = await Promise.all([
    db.from("School").select("name, legalName, legalAddress").eq("id", schoolId).maybeSingle(),
    db.from("SchoolPaymentSettings").select("nif").eq("schoolId", schoolId).maybeSingle(),
  ]);
  const s = school as { name: string; legalName: string | null; legalAddress: string | null } | null;
  const nif = (settings as { nif?: string | null } | null)?.nif ?? null;
  // Sede (PM Team Sintra): nome atual da escola; entidade EPICENTRO DE HONRA se não houver dados legais.
  if (schoolId === SEDE_SCHOOL_ID) {
    return {
      name: s?.name ?? "PM Team Sintra",
      legalName: s?.legalName?.trim() || SEDE_LEGAL.legalName,
      nif: nif?.trim() || SEDE_LEGAL.nif,
      legalAddress: s?.legalAddress?.trim() || SEDE_LEGAL.legalAddress,
    };
  }
  if (!s || !hasLegalData({ legalName: s.legalName, legalAddress: s.legalAddress, nif })) return null;
  return { name: s.name, legalName: s.legalName!.trim(), nif: nif!.trim(), legalAddress: s.legalAddress!.trim() };
}

/** Tudo o que o contrato precisa para uma escola. null = a escola não tem dados legais. */
export async function loadCoachContractFields(
  db: SupabaseClient,
  coachId: string,
  schoolId: string,
  pd: Pick<CoachPrivateDataRow, "legalName" | "nif" | "idDocumentNumber" | "address" | "tptdNumber">,
  todayYmd: string
): Promise<CoachContractFields | null> {
  const school = await loadSchoolLegalIdentity(db, schoolId);
  if (!school) return null;

  const [{ data: directors }, { data: mods }, { data: refs }, { data: lessons }] = await Promise.all([
    db.from("SchoolDirector").select("userId").eq("schoolId", schoolId),
    db.from("CoachModality").select("modalityCode").eq("coachId", coachId).eq("schoolId", schoolId),
    db.from("ModalityRef").select("code, name"),
    db
      .from("Lesson")
      .select("weekday, startTime, endTime, modality, locationId, isOneOff")
      .eq("coachId", coachId)
      .eq("schoolId", schoolId),
  ]);

  const directorIds = (directors ?? []).map((d) => d.userId as string);
  const { data: directorUsers } = directorIds.length
    ? await db.from("User").select("name").in("id", directorIds)
    : { data: [] as { name: string | null }[] };
  const directorName = (directorUsers ?? []).map((u) => u.name as string | null).find((n) => n?.trim()) ?? "a sua gerência";

  const nameByCode = new Map((refs ?? []).map((r) => [r.code as string, r.name as string]));
  const modalities = (mods ?? []).map((m) => nameByCode.get(m.modalityCode as string) ?? (m.modalityCode as string));

  const recurring = (lessons ?? []).filter((l) => !l.isOneOff && l.weekday != null);
  const locationIds = [...new Set(recurring.map((l) => l.locationId as string | null).filter(Boolean))] as string[];
  const { data: locations } = locationIds.length
    ? await db.from("Location").select("id, name").in("id", locationIds)
    : { data: [] as { id: string; name: string }[] };
  const locationName = new Map((locations ?? []).map((l) => [l.id as string, l.name as string]));
  const schedule: CoachScheduleRow[] = recurring.map((l) => ({
    weekday: Number(l.weekday),
    startTime: String(l.startTime ?? ""),
    endTime: String(l.endTime ?? ""),
    modality: nameByCode.get(l.modality as string) ?? String(l.modality ?? ""),
    location: l.locationId ? locationName.get(l.locationId as string) ?? "" : "",
  }));

  return {
    school,
    directorName,
    coach: {
      legalName: pd.legalName,
      nif: pd.nif,
      idDocumentNumber: pd.idDocumentNumber,
      address: pd.address ?? "",
      tptdNumber: pd.tptdNumber ?? "",
    },
    modalities: modalities.length > 0 ? modalities : ["as acordadas com o Diretor Técnico"],
    date: todayYmd,
    schedule,
  };
}

export { COACH_CONTRACT_VERSION };
