import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { EditarAlunoForm } from "../EditarAlunoForm";
import { DeleteStudentButton } from "../DeleteStudentButton";
import { planRequiresPrimaryModality } from "@/lib/plan-primary-modality";
import { EditarDadosPessoaisSection } from "@/components/students/EditarDadosPessoaisSection";
import { getFamilyContext } from "@/lib/family-group";
import { computeFamilyGroupMonthlyTuition, type FamilyPricingBreakdown } from "@/lib/family-tuition";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { resolveEffectiveAccessPlan } from "@/lib/family-effective-plan";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoEditarDadosPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("name", { ascending: true });

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, planId, primaryModality, schoolId")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: user } = await supabase.from("User").select("id, name, email, role").eq("id", student.userId).single();

  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, priceMonthly, schoolId, isActive, modalityScope")
    .eq("isActive", true)
    .order("priceMonthly", { ascending: true });

  let planRows = [...(plans ?? [])];
  const currentPlanId = student.planId;
  if (currentPlanId && !planRows.some((p) => p.id === currentPlanId)) {
    const { data: currentPlan } = await supabase
      .from("Plan")
      .select("id, name, priceMonthly, schoolId, isActive, modalityScope")
      .eq("id", currentPlanId)
      .maybeSingle();
    if (currentPlan) planRows = [currentPlan, ...planRows];
  }

  const schoolIds = [...new Set(planRows.map((p) => p.schoolId).filter(Boolean))] as string[];
  const { data: plansSchools } =
    schoolIds.length > 0
      ? await supabase.from("School").select("id, name").in("id", schoolIds)
      : { data: [] as { id: string; name: string | null }[] };
  const schoolNameById = new Map((plansSchools ?? []).map((s) => [s.id, s.name ?? s.id]));

  const studentSchoolId = (student as { schoolId?: string }).schoolId ?? "";
  planRows.sort((a, b) => {
    const aHere = a.schoolId === studentSchoolId ? 0 : 1;
    const bHere = b.schoolId === studentSchoolId ? 0 : 1;
    if (aHere !== bHere) return aHere - bHere;
    return Number(a.priceMonthly) - Number(b.priceMonthly);
  });

  const planOptions = planRows.map((p) => {
    const schoolLabel = schoolNameById.get(p.schoolId ?? "") ?? "Escola?";
    // O plano família não tem mensalidade fixa por pessoa: o valor é a soma das quotas
    // de referência dos membros (com desconto), cobrada no titular. Evitamos afirmar «€80/mês».
    const label = isFamilyPlan(p.id, p.name)
      ? `${p.name} (gestão por grupo) — ${schoolLabel}`
      : `${p.name} (€${Number(p.priceMonthly).toFixed(0)}/mês) — ${schoolLabel}`;
    return { id: p.id, label };
  });

  const { data: modalityRows } = await supabase
    .from("ModalityRef")
    .select("code, name")
    .order("sortOrder", { ascending: true });

  const accessPlan = student.planId
    ? await resolveEffectiveAccessPlan(supabase, studentId, student.planId)
    : null;
  const scope = accessPlan?.modalityScope ?? null;
  const requiresPrimaryModality = planRequiresPrimaryModality(scope, accessPlan?.id, accessPlan?.name);
  const rawPrimary = (student as { primaryModality?: string | null }).primaryModality ?? null;
  const initialPrimaryModality = requiresPrimaryModality ? rawPrimary ?? "" : "";
  const modalityOptionsForForm = requiresPrimaryModality
    ? (modalityRows ?? []).map((r) => ({ code: r.code, name: r.name ?? r.code }))
    : [
        { code: "", name: "Todas as modalidades" },
        ...(modalityRows ?? []).map((r) => ({ code: r.code, name: r.name ?? r.code })),
      ];

  const familyCtx = await getFamilyContext(supabase, studentId);
  let familyPricing: FamilyPricingBreakdown | null = null;
  if (familyCtx) {
    const pricing = await computeFamilyGroupMonthlyTuition(supabase, familyCtx.group.id);
    if (!("error" in pricing)) familyPricing = pricing;
  }
  const myFamilyShare = familyPricing?.members.find((m) => m.studentId === studentId) ?? null;

  return (
    <>
      <details
        open
        className="aluno-edit-details"
        style={{
          marginTop: "clamp(24px, 6vw, 32px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-secondary)",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            padding: "clamp(14px, 3.5vw, 18px)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            fontWeight: 600,
            color: "var(--text-primary)",
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ opacity: 0.8 }} aria-hidden>▼</span>
          Editar dados do aluno
        </summary>
        <div style={{ padding: "0 clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px) clamp(14px, 3.5vw, 18px)", borderTop: "1px solid var(--border)" }}>
          <EditarAlunoForm
            key={`${student.status}-${(student as { schoolId?: string }).schoolId ?? ""}-${student.planId ?? ""}-${initialPrimaryModality}-${user?.name ?? ""}`}
            studentId={studentId}
            initialName={user?.name ?? ""}
            initialStatus={student.status}
            initialSchoolId={(student as { schoolId?: string }).schoolId ?? ""}
            schoolOptions={(schools ?? []).map((s) => ({ id: s.id, name: s.name ?? s.id }))}
            initialPlanId={student.planId ?? ""}
            initialPrimaryModality={initialPrimaryModality}
            planOptions={planOptions}
            modalityOptions={modalityOptionsForForm}
            requiresPrimaryModality={requiresPrimaryModality}
            isFamilyPlanMember={Boolean(familyCtx)}
            referencePlanName={accessPlan?.name ?? myFamilyShare?.referencePlanName ?? null}
            statusLabels={STATUS_LABEL}
          />
        </div>
      </details>

      <EditarDadosPessoaisSection studentId={studentId} />

      {user?.role === "ALUNO" && (
        <DeleteStudentButton
          studentId={studentId}
          studentName={user?.name ?? ""}
          studentEmail={user?.email ?? ""}
        />
      )}
    </>
  );
}
