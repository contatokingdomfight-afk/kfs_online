import { getSchoolScope, canAccessSchool } from "@/lib/school-scope";
import Link from "next/link";
import { MessageCircle, Pencil, Wallet } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getFamilyContext } from "@/lib/family-group";
import { computeFamilyGroupMonthlyTuition, type FamilyPricingBreakdown } from "@/lib/family-tuition";
import { buildDocumentsPendingMessage, buildFeesOverdueMessage, buildPaymentOverdueMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { loadStudentAdminSummary, type SummaryTone } from "@/lib/admin-student-ficha";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getPublicOrigin } from "@/lib/site-public-url";
import { AdminAlunoTabs } from "./AdminAlunoTabs";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { studentPaymentReference } from "@/lib/revolut/match";

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
    .select("id, userId, status, planId, primaryModality, paymentCode, schoolId")
    .eq("id", studentId)
    .single();

  // Multi-escola: ficha de aluno de outra escola — sai antes de renderizar qualquer subpágina.
  if (student && !canAccessSchool(await getSchoolScope(), student.schoolId as string)) redirect("/admin/alunos");

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

  const summary = await loadStudentAdminSummary(supabase, studentId, (student as { planId?: string | null }).planId ?? null);
  const firstName = (user?.name ?? "").split(" ")[0] ?? "";
  const paymentRef = studentPaymentReference((student as { paymentCode?: number | null }).paymentCode ?? null);
  const phone = studentProfile?.phone ?? null;
  // Um só WhatsApp, com a mensagem do que for mais urgente.
  const whatsappUrl = phone
    ? buildWhatsAppUrl(
        phone,
        summary.tuition.lateTotal > 0
          ? buildPaymentOverdueMessage(firstName)
          : summary.fees.lateTotal > 0
            ? buildFeesOverdueMessage(firstName, summary.fees.detail.replace(/ ·.*/, "").replace(/^seguro/, "o seguro desportivo").replace(/^matrícula/, "a matrícula").replace(" por pagar", "") + ` (${summary.fees.lateTotal.toFixed(0)} €)`)
            : summary.documents.missing.length
              ? buildDocumentsPendingMessage(firstName, `${getPublicOrigin()}/adesao`)
              : `Olá ${firstName}! 👋 Aqui é da Kingdom Fight School.`
      )
    : null;
  const modality = (student as { primaryModality?: string | null }).primaryModality;
  const initials = (user?.name ?? "?").trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
  const base = `/admin/alunos/${studentId}`;
  const cards: { title: string; detail: string; tone: SummaryTone; href: string }[] = [
    { title: summary.tuition.title, detail: summary.tuition.detail, tone: summary.tuition.tone, href: `${base}/plano-seguro` },
    { title: summary.fees.title, detail: summary.fees.detail, tone: summary.fees.tone, href: `${base}/plano-seguro` },
    { title: "Documentos", detail: summary.documents.detail, tone: summary.documents.tone, href: `${base}/contrato` },
    { title: "Último treino", detail: summary.training.detail, tone: summary.training.tone, href: `${base}/performance` },
  ];
  const TONE: Record<SummaryTone, { bg: string; border: string; fg: string }> = {
    red: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.45)", fg: "#f87171" },
    amber: { bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.45)", fg: "#eab308" },
    green: { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.4)", fg: "#22c55e" },
    neutral: { bg: "var(--bg-secondary)", border: "var(--border)", fg: "var(--text-secondary)" },
  };

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
      <div className="no-print">
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span aria-hidden style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 24, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
          {initials}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800, color: "var(--text-primary)" }}>{user?.name || "Aluno"}</h1>
          {paymentRef ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              Referência de pagamento: <strong style={{ color: "var(--text-primary)", letterSpacing: 0.5 }}>{paymentRef}</strong>
              <CopyTextButton text={paymentRef} />
            </p>
          ) : null}
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            {[modality ? MODALITY_LABELS[modality] ?? modality : null, summary.planName ?? "sem plano"].filter(Boolean).join(" · ")} ·{" "}
            <strong style={{ color: student.status === "ATIVO" ? "var(--success)" : student.status === "INADIMPLENTE" ? "var(--danger)" : "var(--text-secondary)" }}>
              {STATUS_LABEL[student.status] ?? student.status}
            </strong>
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 8, marginBottom: 12 }}>
        {cards.map((c) => (
          <Link key={c.title + c.href} href={c.href} style={{ padding: "10px 12px", borderRadius: 12, background: TONE[c.tone].bg, border: `1px solid ${TONE[c.tone].border}`, textDecoration: "none", color: "var(--text-primary)" }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: TONE[c.tone].fg }}>{c.title}</span>
            <span style={{ display: "block", fontSize: 12.5, marginTop: 2, lineHeight: 1.35 }}>{c.detail}</span>
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 42 }}>
            <MessageCircle size={16} aria-hidden /> WhatsApp
          </a>
        ) : null}
        <Link href={`/admin/financeiro/novo?studentId=${studentId}`} className="btn btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 42 }}>
          <Wallet size={16} aria-hidden /> Registar pagamento
        </Link>
        <Link href={`${base}/editar`} className="btn btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 42 }}>
          <Pencil size={16} aria-hidden /> Editar
        </Link>
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
      </div>

      {children}
    </div>
  );
}
