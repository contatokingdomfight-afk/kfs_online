import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { PrimeiroPagamentoForm } from "./PrimeiroPagamentoForm";

export default async function AdminFinanceiroPrimeiroPagamentoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const defaultReferenceMonth = currentReferenceMonthLisbon(new Date());
  const defaultReferenceYear = String(new Date().getFullYear());

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/admin/financeiro" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Financeiro
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 600 }}>Primeiro pagamento</h1>
      <PrimeiroPagamentoForm
        defaultReferenceMonth={defaultReferenceMonth}
        defaultReferenceYear={defaultReferenceYear}
      />
    </div>
  );
}
