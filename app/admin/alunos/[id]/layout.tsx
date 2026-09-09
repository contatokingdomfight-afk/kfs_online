import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getFamilyContext } from "@/lib/family-group";
import { computeFamilyGroupMonthlyTuition, type FamilyPricingBreakdown } from "@/lib/family-tuition";
import { buildPaymentOverdueMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { AdminAlunoTabs } from "./AdminAlunoTabs";

const formatEur = (n: number) => `€${n.toFixed(2).replace(".", ",")}`;

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function AdminAlunoLayout({ children, params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aluno não encontrado.</p>
        <Link href="/admin/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const { data: user } = await supabase.from("User").select("name, email").eq("id", student.userId).single();
  const { data: studentProfile } = await supabase
    .from("StudentProfile")
    .select("phone")
    .eq("studentId", studentId)
    .maybeSingle();

  const overdueWhatsAppUrl =
    student.status === "INADIMPLENTE" && studentProfile?.phone
      ? buildWhatsAppUrl(studentProfile.phone, buildPaymentOverdueMessage((user?.name ?? "").split(" ")[0] ?? ""))
      : null;

  const familyCtx = await getFamilyContext(supabase, studentId);
  let familyPricing: FamilyPricingBreakdown | null = null;
  if (familyCtx) {
    const pricing = await computeFamilyGroupMonthlyTuition(supabase, familyCtx.group.id);
    if (!("error" in pricing)) familyPricing = pricing;
  }
  const myFamilyShare = familyPricing?.members.find((m) => m.studentId === studentId) ?? null;
  const familyDiscountPct = familyPricing?.discountPercent ?? 0;
  const myShareBase = myFamilyShare?.referencePrice ?? null;
  const myShareFinal =
    myShareBase != null ? Math.round(myShareBase * (1 - familyDiscountPct / 100) * 100) / 100 : null;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/alunos"
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
        {user?.name || "Aluno"}
      </h1>
      <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {user?.email}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span
          style={{
            fontSize: "clamp(12px, 3vw, 14px)",
            padding: "2px 8px",
            borderRadius: "var(--radius-md)",
            backgroundColor: student.status === "INADIMPLENTE" ? "var(--danger)" : "var(--bg)",
            color: student.status === "INADIMPLENTE" ? "#fff" : "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          {STATUS_LABEL[student.status] ?? student.status}
        </span>
        {overdueWhatsAppUrl ? (
          <a
            href={overdueWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: "clamp(13px, 3.2vw, 14px)",
            }}
          >
            <span aria-hidden>💬</span> Lembrar pagamento (WhatsApp)
          </a>
        ) : null}
      </div>
      {familyCtx ? (
        <div style={{ marginTop: 8, marginBottom: 4, display: "flex", flexDirection: "column", gap: 6 }}>
          <Link
            href={`/admin/familias/${familyCtx.group.id}`}
            className="card"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Plano família — {familyCtx.isTitular ? "titular" : "membro"}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {familyCtx.group.name || "Grupo familiar"} · {familyCtx.memberCount}{" "}
              {familyCtx.memberCount === 1 ? "membro" : "membros"}
            </span>
          </Link>
          {familyPricing ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {familyCtx.isTitular ? (
                <>
                  Mensalidade combinada da família:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {formatEur(familyPricing.finalMonthlyAmount)}/mês
                  </strong>{" "}
                  (base {formatEur(familyPricing.baseTotal)}
                  {familyPricing.discountPercent > 0 ? ` −${familyPricing.discountPercent}%` : ""}). Cobrada
                  apenas no titular; os membros não têm mensalidade própria.
                </>
              ) : myFamilyShare?.usedFallback || myShareBase == null ? (
                <>
                  Quota individual <strong style={{ color: "var(--text-primary)" }}>por definir</strong> —
                  falta o plano de referência deste membro (a usar {formatEur(myShareBase ?? 80)} como
                  fallback). A mensalidade é cobrada no titular.
                </>
              ) : (
                <>
                  Quota individual:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {myFamilyShare?.referencePlanName ? `${myFamilyShare.referencePlanName} — ` : ""}
                    {formatEur(myShareBase)}
                  </strong>
                  {familyDiscountPct > 0 && myShareFinal != null
                    ? ` · −${familyDiscountPct}% = ${formatEur(myShareFinal)}/mês`
                    : "/mês"}
                  . A mensalidade é cobrada no titular; o preço do catálogo do plano família não se
                  aplica por pessoa.
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <AdminAlunoTabs studentId={studentId} />

      {children}
    </div>
  );
}
