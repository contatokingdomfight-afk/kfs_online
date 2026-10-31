import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { hasLegalData, missingToOpen, schoolStatus, type SchoolPaymentMethods, type SchoolStatus } from "@/lib/school-status";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { redirect } from "next/navigation";
import { SchoolStatusPill } from "./SchoolStatusPill";

export const dynamic = "force-dynamic";

type SchoolRow = { id: string; name: string; city: string | null; address: string | null; legalName: string | null; legalAddress: string | null; isActive: boolean; openedAt: string | null };

export default async function AdminEscolasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  if (!isNetworkScope(await getSchoolScope())) redirect("/admin");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: schoolRows }, { data: directors }, { data: coaches }, { data: settings }] = await Promise.all([
    supabase.from("School").select("id, name, city, address, legalName, legalAddress, isActive, openedAt").order("name", { ascending: true }),
    supabase.from("SchoolDirector").select("schoolId, User(name, email)"),
    supabase.from("CoachSchool").select("schoolId"),
    supabase.from("SchoolPaymentSettings").select("schoolId, nif, ibanEnabled, iban, mbwayEnabled, mbwayPhone, revolutEnabled, multibancoEnabled"),
  ]);
  const schools = (schoolRows ?? []) as SchoolRow[];

  const studentCounts = await Promise.all(
    schools.map(async (s) => {
      const { count } = await supabase
        .from("Student")
        .select("id", { count: "exact", head: true })
        .eq("schoolId", s.id)
        .eq("status", "ATIVO");
      return [s.id, count ?? 0] as const;
    })
  );
  const studentsBySchool = new Map(studentCounts);

  const directorNames = (schoolId: string) =>
    (directors ?? [])
      .filter((d) => d.schoolId === schoolId)
      .map((d) => {
        const user = d.User as unknown as { name: string | null; email: string } | null;
        return user?.name ?? user?.email ?? "—";
      });
  const countByStatus = (status: SchoolStatus) => schools.filter((s) => schoolStatus(s) === status).length;

  return (
    <div style={{ maxWidth: "min(960px, 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-5)" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>Escolas</h1>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {countByStatus("ATIVA")} ativa(s) · {countByStatus("PREPARACAO")} em preparação · {countByStatus("DESATIVADA")} desativada(s)
          </p>
        </div>
        <Link href="/admin/escolas/nova" className="btn btn-primary" style={{ fontSize: "var(--text-sm)", textDecoration: "none" }}>
          + Nova escola
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {schools.map((school) => {
          const status = schoolStatus(school);
          const names = directorNames(school.id);
          const schoolSettings = (settings ?? []).find((s) => s.schoolId === school.id) as (SchoolPaymentMethods & { nif: string | null }) | undefined;
          const legalDataReady = school.id === SEDE_SCHOOL_ID || hasLegalData({ ...school, nif: schoolSettings?.nif });
          const missing = status === "ATIVA" ? [] : missingToOpen(names.length, schoolSettings, legalDataReady);
          return (
            <div
              key={school.id}
              className="card"
              style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", opacity: status === "DESATIVADA" ? 0.65 : 1 }}
            >
              <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{school.name}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 2 }}>
                  {[school.city, school.address].filter(Boolean).join(" · ") || "Sem morada"}
                </div>
              </div>
              <div style={{ flex: "2 1 160px", minWidth: 0, fontSize: "var(--text-sm)", color: names.length ? "var(--text-primary)" : "var(--warning)" }}>
                {names.length === 0 ? "Sem diretor" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`}
              </div>
              <div style={{ flex: "1 1 130px", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                {studentsBySchool.get(school.id) ?? 0} alunos · {(coaches ?? []).filter((c) => c.schoolId === school.id).length} coaches
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <SchoolStatusPill status={status} />
                {missing.length > 0 && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 4 }}>falta: {missing.join(", ")}</div>
                )}
              </div>
              <Link href={`/admin/escolas/${school.id}`} className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", textDecoration: "none" }}>
                Abrir
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
