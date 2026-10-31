import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { missingToOpen, schoolStatus, type SchoolPaymentMethods } from "@/lib/school-status";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { notFound, redirect } from "next/navigation";
import { SchoolDataForm } from "../SchoolDataForm";
import { SchoolStatusPill } from "../SchoolStatusPill";
import { DirectorsPanel, type DirectorRow } from "./DirectorsPanel";
import { SchoolStatusPanel, type PaymentFormValues } from "./SchoolStatusPanel";

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
  if (!isNetworkScope(await getSchoolScope())) redirect("/admin");

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : "equipa";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: school } = await supabase
    .from("School")
    .select("id, name, city, address, phone, email, isActive, openedAt")
    .eq("id", id)
    .maybeSingle();
  if (!school) notFound();

  const [{ data: directorLinks }, { data: settings }, { data: coachLinks }, { data: assistantLinks }, { count: activeStudents }] = await Promise.all([
    supabase.from("SchoolDirector").select("createdAt, User(id, name, email, authUserId)").eq("schoolId", id).order("createdAt", { ascending: true }),
    supabase
      .from("SchoolPaymentSettings")
      .select("ibanEnabled, iban, ibanHolder, bicSwift, mbwayEnabled, mbwayPhone, revolutEnabled, multibancoEnabled")
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
  const missing = missingToOpen(directors.length, settings as SchoolPaymentMethods | null);
  const payment = settings as PaymentFormValues | null;

  return (
    <div style={{ maxWidth: "min(760px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/admin/escolas" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Escolas
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
          <DirectorsPanel schoolId={id} schoolName={school.name as string} directors={directors} />
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
          }}
        />
      )}

      {tab === "estado" && (
        <SchoolStatusPanel
          schoolId={id}
          status={status}
          missing={missing}
          directorCount={directors.length}
          activeStudents={activeStudents ?? 0}
          payment={payment}
        />
      )}
    </div>
  );
}
