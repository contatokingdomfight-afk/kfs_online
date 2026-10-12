import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getRenewalsPending } from "@/lib/renewals";
import { RenewalsSection } from "../RenewalsSection";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/financeiro/novo", label: "Registar pagamento (completo)", hint: "Vários meses, valores especiais ou anular cobrança indevida" },
  { href: "/admin/financeiro/primeiro-pagamento", label: "Primeiro pagamento", hint: "Matrícula, seguro e 1.ª mensalidade de um aluno novo" },
  { href: "/admin/financeiro/antecipado", label: "Pagamento antecipado", hint: "Vários meses pagos de uma vez" },
  { href: "/admin/financeiro/compras", label: "Compras e inscrições", hint: "Cursos, eventos e outras compras" },
  { href: "/admin/financeiro/coaches", label: "Pagamentos a coaches", hint: "Aulas dadas e valores a pagar" },
  { href: "/admin/loja", label: "Loja presencial", hint: "Vendas, encomendas e stock" },
] as const;

/** Mais: ferramentas do financeiro usadas com menos frequência. */
export default async function AdminFinanceiroMaisPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const referenceMonth = currentReferenceMonthLisbon(new Date());
  const pending = await getRenewalsPending(result.client, referenceMonth);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <nav aria-label="Mais ferramentas do financeiro" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 10 }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 60, textDecoration: "none", color: "var(--text-primary)" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{l.label}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>{l.hint}</span>
            </span>
            <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          </Link>
        ))}
      </nav>
      <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Renovações e gerar mensalidades do mês</h2>
        <RenewalsSection referenceMonth={referenceMonth} pending={pending} noOuterCard suppressTitle />
      </section>
    </div>
  );
}
