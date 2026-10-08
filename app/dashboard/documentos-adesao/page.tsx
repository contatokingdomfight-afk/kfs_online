import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { MembershipDocumentsReadView } from "@/components/membership/MembershipDocumentsReadView";
import { getActiveSchoolSignatures } from "@/lib/school-signatures";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentosAdesaoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const settings = await getInsuranceSettings(supabase);

  const [{ data: student }, { data: agreement }, { data: waiver }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("planId, userId").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName, signatureImageUrl, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentWaiver")
      .select("waiverSigned, waiverSignedAt, signatureName, signatureImageUrl, waiverVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  const userId = (student as { userId?: string } | null)?.userId;
  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;
  const schoolSignatures = await getActiveSchoolSignatures();

  const fmtDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "numeric", month: "short", year: "numeric" }) : null;
  const docStatus = [
    {
      label: locale === "pt" ? "Comprovativo de adesão" : "Enrolment form",
      done: Boolean(enrollmentForm?.formCompleted),
      date: fmtDate((enrollmentForm as { formCompletedAt?: string | null } | null)?.formCompletedAt),
    },
    {
      label: locale === "pt" ? "Contrato de sócio" : "Membership contract",
      done: Boolean(agreement?.agreementSigned),
      date: fmtDate((agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt),
    },
    {
      label: locale === "pt" ? "Termo de responsabilidade" : "Liability waiver",
      done: Boolean(waiver?.waiverSigned),
      date: fmtDate((waiver as { waiverSignedAt?: string | null } | null)?.waiverSignedAt),
    },
  ];

  return (
    <div style={{ maxWidth: "min(720px, 100%)", margin: "0 auto", width: "100%" }}>
      <h1
        style={{
          margin: "0 0 8px 0",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 800,
          color: "var(--text-primary)",
        }}
      >
        {locale === "pt" ? "Documentos de adesão" : "Membership documents"}
      </h1>
      <p
        style={{
          margin: "0 0 clamp(20px, 5vw, 24px) 0",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
        }}
      >
        {locale === "pt"
          ? "Consulta o comprovativo e o contrato de sócio, com data de aceite e assinatura."
          : "View your enrollment form and membership contract with acceptance and signature dates."}
      </p>

      {/* Resumo: estado de cada documento */}
      <ul
        style={{
          listStyle: "none",
          margin: "0 0 clamp(20px, 5vw, 24px) 0",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
          gap: 10,
        }}
      >
        {docStatus.map((d) => (
          <li
            key={d.label}
            className="card"
            style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}
          >
            {d.done ? (
              <CheckCircle2 size={22} color="var(--success)" aria-hidden />
            ) : (
              <AlertCircle size={22} color="var(--warning)" aria-hidden />
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{d.label}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {d.done ? (d.date ? `${locale === "pt" ? "Assinado a" : "Signed on"} ${d.date}` : locale === "pt" ? "Concluído" : "Done") : locale === "pt" ? "Em falta" : "Missing"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {docStatus.some((d) => !d.done) ? (
        <Link href="/adesao" className="btn btn-primary" style={{ display: "inline-flex", marginBottom: "clamp(20px, 5vw, 24px)", textDecoration: "none" }}>
          {locale === "pt" ? "Concluir adesão" : "Finish membership"}
        </Link>
      ) : null}

      <MembershipDocumentsReadView
        locale={locale}
        hasPlan={Boolean(planId)}
        agreement={{
          agreementSigned: Boolean(agreement?.agreementSigned),
          agreementSignedAt: (agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null,
          signatureName: (agreement as { signatureName?: string | null } | null)?.signatureName ?? null,
          signatureImageUrl:
            (agreement as { signatureImageUrl?: string | null } | null)?.signatureImageUrl ?? null,
          agreementVersion:
            (agreement as { agreementVersion?: string | null } | null)?.agreementVersion ??
            settings.membershipAgreementVersion,
        }}
        waiver={{
          waiverSigned: Boolean(waiver?.waiverSigned),
          waiverSignedAt: (waiver as { waiverSignedAt?: string | null } | null)?.waiverSignedAt ?? null,
          signatureName: (waiver as { signatureName?: string | null } | null)?.signatureName ?? null,
          signatureImageUrl: (waiver as { signatureImageUrl?: string | null } | null)?.signatureImageUrl ?? null,
          waiverVersion:
            (waiver as { waiverVersion?: string | null } | null)?.waiverVersion ?? settings.waiverVersion,
        }}
        enrollment={{
          formCompleted: Boolean(enrollmentForm?.formCompleted),
          formCompletedAt: (enrollmentForm as { formCompletedAt?: string | null } | null)?.formCompletedAt ?? null,
          formVersion:
            (enrollmentForm as { formVersion?: string | null } | null)?.formVersion ??
            settings.enrollmentFormVersion,
        }}
        enrollmentForm={enrollmentForm ? (enrollmentForm as EnrollmentFormRow) : null}
        prefill={prefill}
        schoolSignatures={schoolSignatures}
      />
    </div>
  );
}
