import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadModalityOffering, offeredModalities } from "@/lib/school-modalities";
import { getDefaultOnboardingSchoolId, sortSchoolsForOnboarding, SIGNUP_SCHOOL_COOKIE } from "@/lib/onboarding-default-school";
import { CoachRequestForm } from "./CoachRequestForm";
import { cancelCoachAccessRequest } from "./actions";

export const dynamic = "force-dynamic";

/** Escola Demo (só leitura): nunca aparece como escolha. Igual a DEMO_SCHOOL_ID em lib/demo.ts. */
const DEMO_SCHOOL_ID = "demo-school";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function CoachRequestPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role === "COACH") redirect("/coach");
  if (dbUser.role === "ADMIN") redirect("/admin");

  const supabase = createAdminClient();
  const [{ data: lastRequest }, { data: schoolRows }] = await Promise.all([
    supabase
      .from("CoachAccessRequest")
      .select("id, schoolId, modalityCodes, status, rejectionReason, createdAt")
      .eq("userId", dbUser.id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("School").select("id, name").eq("isActive", true).order("createdAt", { ascending: true }),
  ]);

  const schools = sortSchoolsForOnboarding((schoolRows ?? []).filter((s) => s.id !== DEMO_SCHOOL_ID));
  const schoolsWithModalities = await Promise.all(
    schools.map(async (s) => ({
      id: s.id as string,
      name: (s.name as string) ?? s.id,
      modalities: offeredModalities(await loadModalityOffering(supabase, s.id as string), s.id as string).map((m) => ({
        code: m.code,
        name: m.name,
      })),
    }))
  );
  const modalityName = new Map(schoolsWithModalities.flatMap((s) => s.modalities.map((m) => [m.code, m.name] as const)));

  const fromLink = (await cookies()).get(SIGNUP_SCHOOL_COOKIE)?.value;
  const defaultSchoolId =
    fromLink && schools.some((s) => s.id === fromLink) ? fromLink : getDefaultOnboardingSchoolId(schools);

  const pending = lastRequest?.status === "PENDING" ? lastRequest : null;
  const rejected = lastRequest?.status === "REJECTED" ? lastRequest : null;
  const pendingSchool = pending ? schoolsWithModalities.find((s) => s.id === pending.schoolId)?.name ?? "" : "";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Entraste com {dbUser.email}</p>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Sou professor</h1>
        </div>

        {pending ? (
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>✅ Pedido enviado</p>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Enviado a {formatDate(pending.createdAt as string)} para a <strong>{pendingSchool}</strong>. Modalidades:{" "}
              {((pending.modalityCodes as string[]) ?? []).map((c) => modalityName.get(c) ?? c).join(", ")}.
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Vais receber um email quando o Diretor Técnico responder. Depois disso, só falta assinares o contrato.
            </p>
            <form action={cancelCoachAccessRequest}>
              <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
                Cancelar pedido
              </button>
            </form>
          </div>
        ) : (
          <>
            {rejected && (
              <div className="card" style={{ padding: 14, borderLeft: "3px solid var(--danger)" }}>
                <p style={{ margin: 0, fontSize: 14 }}>O teu último pedido não foi aprovado.</p>
                {rejected.rejectionReason && (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    Motivo: {rejected.rejectionReason as string}
                  </p>
                )}
              </div>
            )}
            {schoolsWithModalities.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>Não há escolas disponíveis de momento.</p>
            ) : (
              <CoachRequestForm schools={schoolsWithModalities} defaultSchoolId={defaultSchoolId} />
            )}
          </>
        )}

        {!pending && (
          <Link href="/onboarding" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            ← Afinal sou aluno
          </Link>
        )}
      </div>
    </main>
  );
}
