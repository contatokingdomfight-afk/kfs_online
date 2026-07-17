import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { MembershipDocumentsReadView } from "@/components/membership/MembershipDocumentsReadView";

export const dynamic = "force-dynamic";

export default async function DocumentosAdesaoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const settings = await getInsuranceSettings(supabase);

  const [{ data: student }, { data: agreement }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("planId, userId").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  const userId = (student as { userId?: string } | null)?.userId;
  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/dashboard/perfil"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("navHome")}
        </Link>
      </div>

      <h1
        style={{
          margin: "0 0 8px 0",
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 600,
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

      <MembershipDocumentsReadView
        locale={locale}
        hasPlan={Boolean(planId)}
        agreement={{
          agreementSigned: Boolean(agreement?.agreementSigned),
          agreementSignedAt: (agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null,
          signatureName: (agreement as { signatureName?: string | null } | null)?.signatureName ?? null,
          agreementVersion:
            (agreement as { agreementVersion?: string | null } | null)?.agreementVersion ??
            settings.membershipAgreementVersion,
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
      />
    </div>
  );
}
