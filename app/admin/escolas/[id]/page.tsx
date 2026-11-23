import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadSchoolBankStatus } from "@/lib/revolut/bank-accounts";
import { loadSchoolMerchantStatus } from "@/lib/revolut/merchant-accounts";
import { canAccessSchool, getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { hasLegalData, missingToOpen, schoolStatus, type SchoolPaymentMethods } from "@/lib/school-status";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SchoolDataForm } from "../SchoolDataForm";
import { SchoolStatusPill } from "../SchoolStatusPill";
import { DirectorsPanel, type DirectorRow } from "./DirectorsPanel";
import { SchoolStatusPanel, type PaymentFormValues } from "./SchoolStatusPanel";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { getInsuranceSettings } from "@/lib/insurance-settings";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "equipa", label: "Equipa" },
  { id: "dados", label: "Dados" },
  { id: "estado", label: "Estado" },
] as const;

export default async function EscolaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const { id } = await params;
  const scope = await getSchoolScope();
  // Admin Geral: qualquer escola. Diretor: só a(s) sua(s), sem gerir diretores nem abrir/desativar.
  const isNetwork = isNetworkScope(scope);
  if (!canAccessSchool(scope, id)) redirect("/admin");

  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : isNetwork ? "equipa" : "estado";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: school } = await supabase
    .from("School")
    .select("id, name, city, address, phone, email, legalName, legalAddress, isActive, openedAt, slug")
    .eq("id", id)
    .maybeSingle();
  if (!school) notFound();

  const [{ data: directorLinks }, { data: settings }, { data: coachLinks }, { data: assistantLinks }, { count: activeStudents }] = await Promise.all([
    supabase.from("SchoolDirector").select("createdAt, User(id, name, email, authUserId)").eq("schoolId", id).order("createdAt", { ascending: true }),
    supabase
      .from("SchoolPaymentSettings")
      .select("nif, ibanEnabled, iban, ibanHolder, ibanHolderAddress, bicSwift, revolutTag, mbwayEnabled, mbwayPhone, revolutEnabled, multibancoEnabled")
      .eq("schoolId", id)
      .maybeSingle(),
    supabase.from("CoachSchool").select("coachId").eq("schoolId", id),
    supabase.from("SchoolAssistantCoach").select("studentId").eq("schoolId", id).is("revokedAt", null),
    supabase.from("Student").select("id", { count: "exact", head: true }).eq("schoolId", id).eq("status", "ATIVO"),
  ]);

  // Pendente = convidado que ainda não entrou; a data do 1.º login só existe no Auth.
  const directors: DirectorRow[] = await Promise.all(
    (directorLinks ?? []).map(async (link) => {
      const user = link.User as unknown as { id: string; name: string | null; email: string; authUserId: string };
      const { data: auth } = await supabase.auth.admin.getUserById(user.authUserId);
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        since: link.createdAt as string,
        pending: !auth?.user?.last_sign_in_at,
      };
    })
  );

  const coachIds = (coachLinks ?? []).map((c) => c.coachId as string);
  const studentIds = (assistantLinks ?? []).map((a) => a.studentId as string);
  const [{ data: coaches }, { data: students }] = await Promise.all([
    coachIds.length ? supabase.from("Coach").select("userId, specialties").in("id", coachIds) : Promise.resolve({ data: [] }),
    studentIds.length ? supabase.from("Student").select("userId").in("id", studentIds) : Promise.resolve({ data: [] }),
  ]);
  const teamUserIds = [...(coaches ?? []), ...(students ?? [])].map((r) => r.userId as string);
  const { data: teamUsers } = teamUserIds.length
    ? await supabase.from("User").select("id, name, email").in("id", teamUserIds)
    : { data: [] };
  const teamName = (userId: string) => {
    const user = (teamUsers ?? []).find((u) => u.id === userId);
    return (user?.name as string | null) ?? (user?.email as string | undefined) ?? "—";
  };
  const team = [
    ...(coaches ?? []).map((c) => ({
      userId: c.userId as string,
      role: "Coach",
      detail: ((c as { specialties?: string | null }).specialties ?? null) as string | null,
    })),
    ...(students ?? []).map((s) => ({ userId: s.userId as string, role: "Assistente", detail: null as string | null })),
  ];

  const status = schoolStatus(school as { isActive: boolean; openedAt: string | null });
  const isSede = id === SEDE_SCHOOL_ID;
  const legalName = school.legalName as string | null;
  const legalAddress = school.legalAddress as string | null;
  const nif = (settings as { nif?: string | null } | null)?.nif ?? null;
  const legalDataReady = isSede || hasLegalData({ legalName, legalAddress, nif });
  const missing = missingToOpen(directors.length, settings as SchoolPaymentMethods | null, legalDataReady);
  // Taxas à parte: se a migração das colunas ainda não estiver aplicada, a consulta falha sozinha e o resto da página segue.
  const [{ data: feeRow }, networkSettings] =
    tab === "estado"
      ? await Promise.all([
          supabase.from("SchoolPaymentSettings").select("enrollmentAmount, insuranceAnnualAmount").eq("schoolId", id).maybeSingle(),
          getInsuranceSettings(supabase),
        ])
      : [{ data: null }, null];
  const payment = settings
    ? ({ ...(settings as PaymentFormValues), ...((feeRow as Partial<PaymentFormValues> | null) ?? {}) } as PaymentFormValues)
    : null;
  const networkFees = { enrollment: networkSettings?.enrollmentAmount ?? 0, insurance: networkSettings?.annualAmount ?? 0 };
  const merchant = tab === "estado" ? await loadSchoolMerchantStatus(supabase, id) : null;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`;
  const bank = tab === "estado" ? await loadSchoolBankStatus(supabase, id, origin) : null;
  const schoolSlug = (school as { slug?: string | null }).slug ?? null;
  // Link que o site da escola usa: com nome quando existe, senão com o código da escola.
  const signupLink = `${origin}/sign-up/escola/${schoolSlug ?? id}`;
  const trialLink = `${origin}/aula-experimental?escola=${schoolSlug ?? id}`;

  return (
    <div style={{ maxWidth: "min(760px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href={isNetwork ? "/admin/escolas" : "/admin"} style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          {isNetwork ? "← Escolas" : "← Painel"}
        </Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>{school.name as string}</h1>
        <SchoolStatusPill status={status} />
      </div>
      <p style={{ margin: "0 0 var(--space-4) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        {[school.city as string | null, `${activeStudents ?? 0} alunos ativos`].filter(Boolean).join(" · ")}
      </p>

      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: "var(--space-4)" }}>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/escolas/${id}?tab=${t.id}`}
            style={{
              fontSize: "var(--text-sm)",
              padding: "8px 12px",
              textDecoration: "none",
              color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "equipa" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Nomear/remover diretores é só do Admin Geral. */}
          {isNetwork && <DirectorsPanel schoolId={id} schoolName={school.name as string} directors={directors} />}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <h2 style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Coaches e assistentes</h2>
            {team.length === 0 ? (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Ainda não há coaches nesta escola.</p>
            ) : (
              team.map((member) => (
                <div key={`${member.role}-${member.userId}`} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{teamName(member.userId)}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{[member.role, member.detail].filter(Boolean).join(" · ")}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "dados" && (
        <SchoolDataForm
          school={{
            id,
            name: school.name as string,
            city: school.city as string | null,
            address: school.address as string | null,
            phone: school.phone as string | null,
            email: school.email as string | null,
            slug: (school as { slug?: string | null }).slug ?? null,
          }}
          legal={isSede ? undefined : { legalName, legalAddress, nif }}
        />
      )}

      {tab === "estado" && merchant && bank && (
        <SchoolStatusPanel
          canChangeStatus={isNetwork}
          schoolId={id}
          status={status}
          missing={missing}
          directorCount={directors.length}
          activeStudents={activeStudents ?? 0}
          payment={payment}
          networkFees={networkFees}
          legalDataReady={legalDataReady}
          merchant={merchant}
          bank={bank}
        />
      )}

      {tab === "estado" && status === "ATIVA" && (
        <section className="card" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Links para o site da escola</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Quem se regista por este link fica com esta escola já escolhida.
          </p>
          <code style={{ fontSize: 13, overflowWrap: "anywhere" }}>{signupLink}</code>
          <CopyTextButton text={signupLink} label="Copiar link" copiedLabel="Copiado" />
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 0" }}>Aula experimental</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Mostra só os horários desta escola; a confirmação por WhatsApp vai para o telefone da escola (separador Dados).
          </p>
          <code style={{ fontSize: 13, overflowWrap: "anywhere" }}>{trialLink}</code>
          <CopyTextButton text={trialLink} label="Copiar link" copiedLabel="Copiado" />
          {!schoolSlug && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              Para um link com nome (ex.: …/sign-up/escola/kfs-lisboa), preenche o «Link de inscrição» no separador Dados.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
