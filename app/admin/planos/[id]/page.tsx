import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PlanForm } from "../PlanForm";
import { PlanPriceForm } from "../PlanPriceForm";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function AdminPlanosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: planId } = await params;
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("Plan")
    .select("id, name, description, priceMonthly, includesDigitalAccess, modalityScope, isActive, stripePriceId, schoolId, includes_performance_tracking, includes_check_in, max_check_ins_per_day, includes_exclusive_benefits")
    .eq("id", planId)
    .single();

  if (planError) {
    console.error("AdminPlanosEditarPage Plan select:", planError);
    return (
      <div>
        <p style={{ color: "var(--danger, #c0392b)", marginBottom: 16 }}>Erro ao carregar plano: {planError.message}</p>
        <Link href="/admin/planos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

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

  const { data: planPrices } = await supabase
    .from("PlanPrice")
    .select("id, intervalLabel, stripePriceId, amountCents")
    .eq("planId", planId)
    .eq("isActive", true)
    .order("sortOrder", { ascending: true });

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
        {plan.name} · €{Number(plan.priceMonthly).toFixed(0)}/mês
      </p>
      <PlanForm
        planId={plan.id}
        initialName={plan.name}
        initialDescription={plan.description ?? ""}
        initialPriceMonthly={Number(plan.priceMonthly)}
        initialIncludesDigital={plan.includesDigitalAccess ?? false}
        initialModalityScope={plan.modalityScope ?? "SINGLE"}
        initialIsActive={plan.isActive ?? true}
        initialStripePriceId={plan.stripePriceId ?? ""}
        initialSchoolId={plan.schoolId ?? ""}
        initialIncludesPerformanceTracking={plan.includes_performance_tracking ?? true}
        initialIncludesCheckIn={plan.includes_check_in ?? true}
        initialMaxCheckInsPerDay={plan.max_check_ins_per_day ?? null}
        initialIncludesExclusiveBenefits={plan.includes_exclusive_benefits ?? false}
      />
      {planPrices && planPrices.length > 0 && (
        <PlanPriceForm planPrices={planPrices.map((pp) => ({ id: pp.id, intervalLabel: pp.intervalLabel, stripePriceId: pp.stripePriceId, amountCents: pp.amountCents }))} />
      )}
    </div>
  );
}
