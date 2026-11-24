import type { SupabaseClient } from "@supabase/supabase-js";
import { coachIdsInScope, filterSchools, getSchoolScope, scopeQuery } from "@/lib/school-scope";
import { loadModalityOffering, offeredModalities } from "@/lib/school-modalities";
import { CoachRequestCard, type CoachRequestView } from "./CoachRequestCard";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CoachActiveToggle } from "./CoachActiveToggle";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  // Usar admin client (bypassa RLS) quando disponível; fallback para createClient
  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());

  const [{ data: coaches }, { count: pendingTestimonials }, { data: requestRows }] = await Promise.all([
    filterSchools(supabase.from("Coach").select("id, userId, specialties, createdAt, is_active"), await coachIdsInScope(), "id").order("createdAt", { ascending: false }),
    supabase.from("CoachTestimonial").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    // Pedidos de professor (registo via Google): o diretor só vê os da sua escola.
    scopeQuery(
      supabase.from("CoachAccessRequest").select("id, userId, schoolId, modalityCodes, phone, createdAt").eq("status", "PENDING"),
      await getSchoolScope()
    ).order("createdAt", { ascending: true }),
  ]);
  const requests = await buildCoachRequestViews(supabase, requestRows ?? []);

  const list = coaches ?? [];
  const userIds = list.map((c) => c.userId);
  const [{ data: users }, coachSchoolsRes] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", userIds),
    list.length > 0
      ? supabase.from("CoachSchool").select("coachId, schoolId").in(
          "coachId",
          list.map((c) => c.id)
        )
      : Promise.resolve({ data: [] as { coachId: string; schoolId: string }[] }),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const schoolIds = [...new Set((coachSchoolsRes.data ?? []).map((r) => r.schoolId))];
  const { data: schoolRows } =
    schoolIds.length > 0 ? await supabase.from("School").select("id, name").in("id", schoolIds) : { data: [] };
  const schoolNameById = new Map((schoolRows ?? []).map((s) => [s.id, s.name]));
  const schoolsLabelByCoach = new Map<string, string>();
  for (const row of coachSchoolsRes.data ?? []) {
    const n = schoolNameById.get(row.schoolId) ?? row.schoolId;
    const prev = schoolsLabelByCoach.get(row.coachId);
    schoolsLabelByCoach.set(row.coachId, prev ? `${prev} · ${n}` : n);
  }

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
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
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Coaches
        </h1>
        <Link
          href="/admin/coaches/depoimentos"
          className="btn btn-secondary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Depoimentos{pendingTestimonials ? ` (${pendingTestimonials})` : ""}
        </Link>
        <Link
          href="/admin/coaches/novo"
          className="btn btn-primary"
          style={{ textDecoration: "none" }}
        >
          Novo coach
        </Link>
      </div>

      {requests.length > 0 && (
        <section style={{ marginBottom: "clamp(20px, 5vw, 28px)" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Pedidos pendentes ({requests.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {requests.map((r) => (
              <CoachRequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}

      {list.length === 0 ? (
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            Ainda não há coaches cadastrados.
          </p>
          {!adminResult.client && (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)", maxWidth: 420 }}>
              Se já existem coaches na base de dados, configura <code>SUPABASE_SERVICE_ROLE_KEY</code> em Vercel (Settings → Environment Variables) e faz redeploy.
            </p>
          )}
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {list.map((c) => {
            const u = userById.get(c.userId);
            return (
              <li key={c.id}>
                <div
                  className="card"
                  style={{
                    padding: "clamp(14px, 3.5vw, 18px)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "clamp(10px, 2.5vw, 12px)",
                  }}
                >
                  <Link
                    href={`/admin/coaches/${c.id}`}
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || "—"}
                    </span>
                    {!(c as { is_active?: boolean }).is_active && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--text-secondary)",
                          color: "var(--bg)",
                        }}
                      >
                        Inativo
                      </span>
                    )}
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {u?.email ?? "—"}
                    </p>
                    {schoolsLabelByCoach.get(c.id) && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                        {schoolsLabelByCoach.get(c.id)}
                      </p>
                    )}
                    {c.specialties && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                        {c.specialties}
                      </p>
                    )}
                  </Link>
                  <CoachActiveToggle coachId={c.id} isActive={(c as { is_active?: boolean }).is_active !== false} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type RequestRow = { id: string; userId: string; schoolId: string; modalityCodes: string[] | null; phone: string | null; createdAt: string };

/** Junta nome/email do utilizador, nome da escola e as modalidades que a escola oferece (para o diretor ajustar). */
async function buildCoachRequestViews(
  supabase: SupabaseClient,
  rows: RequestRow[]
): Promise<CoachRequestView[]> {
  if (rows.length === 0) return [];
  const schoolIds = [...new Set(rows.map((r) => r.schoolId))];
  const [{ data: users }, { data: schools }, offerings] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", [...new Set(rows.map((r) => r.userId))]),
    supabase.from("School").select("id, name").in("id", schoolIds),
    Promise.all(
      schoolIds.map(async (id) => [id, offeredModalities(await loadModalityOffering(supabase, id), id)] as const)
    ),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
  const schoolName = new Map((schools ?? []).map((s) => [s.id as string, s.name as string]));
  const modsBySchool = new Map(offerings);
  return rows.map((r) => {
    const u = userById.get(r.userId);
    return {
      id: r.id,
      name: (u?.name as string) || (u?.email as string) || "—",
      email: (u?.email as string) ?? "—",
      phone: r.phone,
      schoolName: schoolName.get(r.schoolId) ?? r.schoolId,
      createdAt: r.createdAt,
      requestedCodes: r.modalityCodes ?? [],
      modalities: (modsBySchool.get(r.schoolId) ?? []).map((m) => ({ code: m.code, name: m.name })),
    };
  });
}
