import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { EnrollmentFormSummary } from "@/app/adesao/EnrollmentFormSummary";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";

export const dynamic = "force-dynamic";

export default async function ImprimirComprovativoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const [{ data: student }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("planId, userId").eq("id", studentId).maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  if (!enrollmentForm?.formCompleted) {
    redirect("/dashboard/documentos-adesao");
  }

  const userId = (student as { userId?: string } | null)?.userId;
  const prefill = userId ? await loadEnrollmentFormPrefill(supabase, studentId, userId) : null;
  if (!prefill) redirect("/dashboard/documentos-adesao");

  return (
    <>
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href="/dashboard/documentos-adesao" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
        <PrintDocumentButton />
      </div>
      <EnrollmentFormSummary
        form={enrollmentForm as EnrollmentFormRow}
        fullName={prefill.fullName}
        email={prefill.email}
        dateOfBirth={prefill.dateOfBirth}
        phone={prefill.phone}
        planName={prefill.planName}
        modalityLabel={prefill.modalityLabel}
        monthlyAmount={prefill.monthlyAmount}
        enrollmentAmount={prefill.enrollmentAmount}
        insuranceAmount={prefill.insuranceAmount}
        showEnrollment={prefill.showEnrollment}
        showInsurance={prefill.showInsurance}
      />
    </>
  );
}
