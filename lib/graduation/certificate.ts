import "server-only";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { getActiveSchoolSignatures, type SchoolSignature } from "@/lib/school-signatures";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/**
 * Certificado de graduação: existe para candidatos APROVADOS e já revelados ao aluno
 * (o número é atribuído na revelação, por trigger na base de dados).
 */
export type CertificateData = {
  candidateId: string;
  studentId: string;
  number: string;
  studentName: string;
  studentNif: string | null;
  schoolNif: string | null;
  modalityCode: string;
  modalityName: string;
  gradeName: string;
  gradeColors: string[];
  issuedAt: string;
  signatures: SchoolSignature[];
  verifyUrl: string;
  qrSvg: string;
};

/** «MUAY_THAI» → «MT», «BOXING» → «BOX». */
export function modalityPrefix(code: string): string {
  const words = code.split(/[_\s-]+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : code.slice(0, 3)).toUpperCase();
}

export function formatCertificateNumber(modalityCode: string, issuedAt: string, n: number): string {
  const year = new Date(issuedAt).getUTCFullYear();
  return `${modalityPrefix(modalityCode)}-${year}/${String(n).padStart(4, "0")}`;
}

export function formatCertificateDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }).replace(/\./g, "");
}

async function requestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    /* fora de um pedido */
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://kingdomfight.com").replace(/\/$/, "");
}

export function certificateVerifyPath(candidateId: string): string {
  return `/certificado/${candidateId}`;
}

type CandidateRow = {
  id: string;
  eventId: string;
  studentId: string;
  gradeId: string;
  placementAwardedGradeId: string | null;
  status: string;
  revealedAt: string | null;
  certificateNumber: number | null;
};

/** Dados públicos mínimos (página de verificação): sem NIF nem assinaturas. */
export type PublicCertificate = Pick<CertificateData, "number" | "studentName" | "modalityCode" | "modalityName" | "gradeName" | "gradeColors" | "issuedAt">;

async function loadBase(supabase: SupabaseClient, candidateId: string) {
  const { data } = await supabase
    .from("GraduationExamCandidate")
    .select("id, eventId, studentId, gradeId, placementAwardedGradeId, status, revealedAt, certificateNumber")
    .eq("id", candidateId)
    .maybeSingle();
  const c = data as CandidateRow | null;
  if (!c || c.status !== "PASSED" || !c.revealedAt || c.certificateNumber == null) return null;

  const gradeId = c.placementAwardedGradeId ?? c.gradeId;
  const [{ data: event }, { data: grade }, { data: student }] = await Promise.all([
    supabase.from("GraduationExamEvent").select("modalityCode, schoolId").eq("id", c.eventId).maybeSingle(),
    supabase.from("GraduationGrade").select("name, colors").eq("id", gradeId).maybeSingle(),
    supabase.from("Student").select("userId").eq("id", c.studentId).maybeSingle(),
  ]);
  if (!event || !grade) return null;
  const [{ data: modality }, { data: user }] = await Promise.all([
    supabase.from("ModalityRef").select("name").eq("code", event.modalityCode).maybeSingle(),
    student?.userId ? supabase.from("User").select("name").eq("id", student.userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    candidate: c,
    schoolId: (event.schoolId as string | null) ?? SEDE_SCHOOL_ID,
    pub: {
      number: formatCertificateNumber(event.modalityCode as string, c.revealedAt, c.certificateNumber),
      studentName: ((user as { name?: string | null } | null)?.name ?? "").trim() || "Aluno",
      modalityCode: event.modalityCode as string,
      modalityName: (modality?.name as string | undefined) ?? (event.modalityCode as string),
      gradeName: grade.name as string,
      gradeColors: ((grade.colors as string[] | null) ?? []).filter(Boolean),
      issuedAt: c.revealedAt,
    } satisfies PublicCertificate,
  };
}

export async function loadPublicCertificate(supabase: SupabaseClient, candidateId: string): Promise<PublicCertificate | null> {
  return (await loadBase(supabase, candidateId))?.pub ?? null;
}

export async function loadCertificate(supabase: SupabaseClient, candidateId: string): Promise<CertificateData | null> {
  const base = await loadBase(supabase, candidateId);
  if (!base) return null;
  const { candidate, schoolId, pub } = base;

  const [{ data: form }, { data: settings }, signatures, origin] = await Promise.all([
    supabase.from("StudentEnrollmentForm").select("taxId").eq("studentId", candidate.studentId).maybeSingle(),
    supabase.from("SchoolPaymentSettings").select("nif").eq("schoolId", schoolId).maybeSingle(),
    getActiveSchoolSignatures(schoolId),
    requestOrigin(),
  ]);
  const verifyUrl = `${origin}${certificateVerifyPath(candidate.id)}`;
  const qrSvg = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });

  return {
    ...pub,
    candidateId: candidate.id,
    studentId: candidate.studentId,
    studentNif: ((form as { taxId?: string | null } | null)?.taxId ?? "").trim() || null,
    schoolNif: ((settings as { nif?: string | null } | null)?.nif ?? "").trim() || null,
    signatures: signatures.slice(0, 2),
    verifyUrl,
    qrSvg,
  };
}
