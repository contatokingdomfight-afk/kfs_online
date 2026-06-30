import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { loadStudentPaymentRows } from "@/lib/admin-student-payment-context";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { PrimeiroPagamentoForm } from "./PrimeiroPagamentoForm";

type SearchParams = Promise<{ studentId?: string; referenceMonth?: string }>;

export default async function AdminFinanceiroPrimeiroPagamentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const defaultReferenceMonth = currentReferenceMonthLisbon(new Date());
  const referenceMonth =
    params.referenceMonth?.trim() && /^\d{4}-\d{2}$/.test(params.referenceMonth.trim())
      ? params.referenceMonth.trim()
      : defaultReferenceMonth;
  const defaultReferenceYear = referenceMonth.slice(0, 4);

  let initialStudent = null;
  const studentId = params.studentId?.trim();
  if (studentId) {
    const result = getAdminClientOrNull();
    if (result.client) {
      const rows = await loadStudentPaymentRows(result.client, [studentId], referenceMonth);
      initialStudent = rows[0] ?? null;
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/admin/financeiro" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Financeiro
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 600 }}>Primeiro pagamento</h1>
      <PrimeiroPagamentoForm
        defaultReferenceMonth={referenceMonth}
        defaultReferenceYear={defaultReferenceYear}
        initialStudent={initialStudent}
      />
    </div>
  );
}
