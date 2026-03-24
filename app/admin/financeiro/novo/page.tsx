import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStudentPaymentRows } from "@/lib/admin-student-payment-context";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { NovoPagamentoForm } from "./NovoPagamentoForm";

type SearchParams = Promise<{ studentId?: string; referenceMonth?: string; amount?: string }>;

export default async function AdminFinanceiroNovoPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const defaultStudentId = params.studentId?.trim() ?? "";
  const defaultRef = params.referenceMonth?.trim() || "";
  const defaultAmount = params.amount?.trim() ?? "";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const refMonth = new Date();
  const fallbackRef = `${refMonth.getFullYear()}-${String(refMonth.getMonth() + 1).padStart(2, "0")}`;
  const referenceMonth = /^\d{4}-\d{2}$/.test(defaultRef) ? defaultRef : fallbackRef;

  let initialRow = null;
  if (defaultStudentId) {
    const rows = await loadStudentPaymentRows(supabase, [defaultStudentId], referenceMonth);
    initialRow = rows[0] ?? null;
  }

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/financeiro"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Registar pagamento
      </h1>
      <NovoPagamentoForm
        defaultReferenceMonth={referenceMonth}
        initialRow={initialRow}
        urlAmount={defaultAmount}
      />
    </div>
  );
}
