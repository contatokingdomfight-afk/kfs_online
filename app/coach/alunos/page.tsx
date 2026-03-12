import Link from "next/link";
import { AlunoProfileLink } from "@/components/AlunoProfileLink";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AlunosFiltersPanel } from "@/components/AlunosFiltersPanel";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

function buildQuery(
  overrides: { status?: string; modality?: string; school?: string; plan?: string; q?: string }
): string {
  const p = new URLSearchParams();
  if (overrides.status && overrides.status !== "all") p.set("status", overrides.status);
  if (overrides.modality && overrides.modality !== "all") p.set("modality", overrides.modality);
  if (overrides.school && overrides.school !== "all") p.set("school", overrides.school);
  if (overrides.plan && overrides.plan !== "all") p.set("plan", overrides.plan);
  if (overrides.q?.trim()) p.set("q", overrides.q.trim());
  const s = p.toString();
  return s ? `?${s}` : "";
}

type SearchParams = Promise<{ status?: string; modality?: string; school?: string; plan?: string; q?: string }>;

export default async function CoachAlunosPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const params = await searchParams;
  const filterStatus = params.status ?? "all";
  const filterModality = params.modality ?? "all";
  const filterSchool = params.school ?? "all";
  const filterPlan = params.plan ?? "all";
  const searchQuery = (params.q ?? "").trim().toLowerCase();

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: schools }, { data: studentsData }, { data: plansData }, modalitiesForFilter] = await Promise.all([
    supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true }),
    supabase.from("Student").select("id, userId, status, primaryModality, schoolId, planId, createdAt").order("createdAt", { ascending: false }),
    supabase.from("Plan").select("id, name").eq("is_active", true).order("name", { ascending: true }),
    getCachedModalityRefs(supabase),
  ]);

  const students = studentsData ?? [];
  let filtered = students;
  if (filterStatus !== "all") {
    filtered = filtered.filter((s) => s.status === filterStatus);
  }
  if (filterModality !== "all") {
    filtered = filtered.filter(
      (s) => (s as { primaryModality?: string | null }).primaryModality === filterModality
    );
  }
  if (filterSchool !== "all") {
    filtered = filtered.filter((s) => s.schoolId === filterSchool);
  }
  if (filterPlan !== "all") {
    if (filterPlan === "none") {
      filtered = filtered.filter((s) => !(s as { planId?: string | null }).planId);
    } else {
      filtered = filtered.filter((s) => (s as { planId?: string | null }).planId === filterPlan);
    }
  }

  const userIds = [...new Set(filtered.map((s) => s.userId))];
  const studentIds = filtered.map((s) => s.id);

  const [{ data: usersData }, { data: profilesData }] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", userIds),
    studentIds.length > 0
      ? supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userById = new Map((usersData ?? []).map((u) => [u.id, u]));
  const profileByStudentId = new Map((profilesData ?? []).map((p) => [p.studentId, p]));

  if (searchQuery) {
    const qNorm = searchQuery.replace(/\s/g, "");
    filtered = filtered.filter((s) => {
      const u = userById.get(s.userId);
      const p = profileByStudentId.get(s.id);
      const name = (u?.name ?? "").toLowerCase();
      const email = (u?.email ?? "").toLowerCase();
      const phone = (p?.phone ?? "").replace(/\s/g, "");
      return name.includes(searchQuery) || email.includes(searchQuery) || (qNorm && phone.includes(qNorm));
    });
  }

  const baseFilters = { status: filterStatus, modality: filterModality, school: filterSchool, plan: filterPlan, q: params.q ?? "" };

  return (
    <div style={{ maxWidth: "min(700px, 100%)", paddingTop: 8 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/coach"
          className="btn btn-secondary"
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            textDecoration: "none",
            padding: "8px 12px",
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Alunos
        </h1>
      </div>

      <AlunosFiltersPanel
        basePath="/coach/alunos"
        defaultValue={params.q ?? ""}
        status={filterStatus}
        modality={filterModality}
        school={filterSchool}
        plan={filterPlan}
        buildQuery={buildQuery}
        baseFilters={baseFilters}
        filterStatus={filterStatus}
        filterModality={filterModality}
        filterSchool={filterSchool}
        filterPlan={filterPlan}
        statusLabel={STATUS_LABEL}
        modalities={modalitiesForFilter}
        schools={schools ?? []}
        plans={plansData ?? []}
      />

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {students.length === 0
            ? "Ainda não há alunos cadastrados."
            : "Nenhum aluno com estes filtros."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {filtered.map((s) => {
            const u = userById.get(s.userId);
            const primMod = (s as { primaryModality?: string | null }).primaryModality;
            return (
              <li key={s.id}>
                <AlunoProfileLink
                  href={`/coach/alunos/${s.id}`}
                  className="card"
                  style={{
                    display: "block",
                    padding: "clamp(14px, 3.5vw, 18px)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || "—"}
                    </span>
                    <span
                      style={{
                        fontSize: "clamp(12px, 3vw, 14px)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    {primMod && (
                      <span
                        style={{
                          fontSize: "clamp(12px, 3vw, 14px)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {modalitiesForFilter.find((x) => x.code === primMod)?.name ?? primMod}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {u?.email ?? "—"}
                  </p>
                </AlunoProfileLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
