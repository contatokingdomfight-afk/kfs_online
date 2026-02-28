import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PlanForm } from "../PlanForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPlanosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: planId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: plan } = await supabase
    .from("Plan")
    .select("id, name, description, price_monthly, includes_digital_access, modality_scope, is_active, stripePriceId")
    .eq("id", planId)
    .single();

  if (!plan) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Plano não encontrado.</p>
        <Link href="/admin/planos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/planos"
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
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Editar plano
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {plan.name} · €{Number(plan.price_monthly).toFixed(0)}/mês
      </p>
      <PlanForm
        planId={plan.id}
        initialName={plan.name}
        initialDescription={plan.description ?? ""}
        initialPriceMonthly={Number(plan.price_monthly)}
        initialIncludesDigital={plan.includes_digital_access ?? false}
        initialModalityScope={plan.modality_scope ?? "SINGLE"}
        initialIsActive={plan.is_active ?? true}
        initialStripePriceId={(plan as { stripePriceId?: string | null }).stripePriceId ?? ""}
      />
    </div>
  );
}
