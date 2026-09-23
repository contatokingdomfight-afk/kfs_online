import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, PartyPopper, PenLine } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { AdminSchoolFilter } from "@/app/admin/AdminSchoolFilter";
import { getInsuranceSettings, isMembershipAgreementCurrent } from "@/lib/insurance-settings";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";
import { buildDocumentsPendingMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getPublicOrigin } from "@/lib/site-public-url";
import { MarkPhysicalContractButton } from "./MarkPhysicalContractButton";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
};

type SearchParams = Promise<{ school?: string }>;

export default async function AdminDocumentosAdesaoPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const schoolId = params.school?.trim() || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [schools, settings] = await Promise.all([getCachedSchools(supabase), getInsuranceSettings(supabase)]);

  let studentsQuery = supabase
    .from("Student")
    .select("id, userId, status, schoolId")
    .in("status", ["ATIVO", "INADIMPLENTE", "INATIVO"])
    .order("createdAt", { ascending: false })
    .limit(500);
  if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);

  const { data: students } = await studentsQuery;
  const list = students ?? [];
  const studentIds = list.map((s) => s.id as string);
  const userIds = [...new Set(list.map((s) => s.userId as string))];
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  if (studentIds.length === 0) {
    return (
      <div style={{ maxWidth: "min(820px, 100%)" }}>
        <Header schools={schools} schoolId={schoolId} />
        <p style={{ color: "var(--text-secondary)" }}>Sem alunos para mostrar.</p>
      </div>
    );
  }

  const [{ data: users }, { data: profiles }, { data: waivers }, { data: agreements }, { data: forms }] =
    await Promise.all([
      supabase.from("User").select("id, name, email").in("id", userIds),
      supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds),
      supabase.from("StudentWaiver").select("studentId, waiverSigned").in("studentId", studentIds),
      supabase.from("StudentMembershipAgreement").select("studentId, agreementSigned, agreementVersion").in("studentId", studentIds),
      supabase.from("StudentEnrollmentForm").select("studentId, formCompleted, formVersion").in("studentId", studentIds),
    ]);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u as { name: string | null; email: string }]));
  const phoneMap = new Map((profiles ?? []).map((p) => [p.studentId as string, p.phone as string | null]));
  const waiverMap = new Map((waivers ?? []).map((w) => [w.studentId as string, Boolean(w.waiverSigned)]));
  const agreementMap = new Map(
    (agreements ?? []).map((a) => [
      a.studentId as string,
      { agreementSigned: a.agreementSigned as boolean, agreementVersion: a.agreementVersion as string | null },
    ])
  );
  const formMap = new Map(
    (forms ?? []).map((f) => [
      f.studentId as string,
      { formCompleted: f.formCompleted as boolean, formVersion: f.formVersion as string | null },
    ])
  );

  const rows = list
    .map((s) => {
      const studentId = s.id as string;
      const waiverSigned = waiverMap.get(studentId) ?? false;
      const agreementCurrent = isMembershipAgreementCurrent(agreementMap.get(studentId) ?? null, settings.membershipAgreementVersion);
      const formCurrent = isEnrollmentFormCurrent(formMap.get(studentId) ?? null, settings.enrollmentFormVersion);
      if (waiverSigned && agreementCurrent && formCurrent) return null;
      const user = userMap.get(s.userId as string);
      return {
        studentId,
        status: s.status as string,
        schoolName: schoolMap.get(s.schoolId as string) ?? "—",
        name: user?.name ?? "—",
        email: user?.email ?? "—",
        phone: phoneMap.get(studentId) ?? null,
        waiverSigned,
        agreementCurrent,
        formCurrent,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div style={{ maxWidth: "min(820px, 100%)" }}>
      <Header schools={schools} schoolId={schoolId} />

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
          <PartyPopper size={18} aria-hidden />
          Nenhum aluno com documentos de adesão pendentes — tudo assinado.
        </p>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: "clamp(12px, 3vw, 16px)" }}>
            {rows.length} aluno{rows.length === 1 ? "" : "s"} com pelo menos um documento por assinar.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {rows.map((r) => {
              const whatsAppUrl = r.phone
                ? buildWhatsAppUrl(r.phone, buildDocumentsPendingMessage(r.name.split(" ")[0] ?? "", `${getPublicOrigin()}/adesao`))
                : null;
              return (
                <li key={r.studentId} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>· {r.schoolName}</span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: r.status === "INADIMPLENTE" ? "var(--danger)" : "var(--bg-secondary)",
                        color: r.status === "INADIMPLENTE" ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--text-secondary)" }}>{r.email}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    <PendingBadge label="Comprovativo" pending={!r.formCurrent} />
                    <PendingBadge label="Condições Gerais" pending={!r.agreementCurrent} />
                    <PendingBadge label="Termo de Responsabilidade" pending={!r.waiverSigned} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <Link href={`/admin/alunos/${r.studentId}/contrato`} className="btn btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>
                      Ver ficha
                    </Link>
                    <Link
                      href={`/admin/alunos/${r.studentId}/contrato/assinar`}
                      className="btn btn-primary"
                      style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <PenLine size={15} aria-hidden />
                      Assinar presencial
                    </Link>
                    <MarkPhysicalContractButton studentId={r.studentId} studentName={r.name} />
                    {whatsAppUrl ? (
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <MessageCircle size={15} aria-hidden />
                        Lembrar (WhatsApp)
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", alignSelf: "center" }}>
                        Sem telefone no perfil
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Header({ schools, schoolId }: { schools: { id: string; name: string }[]; schoolId: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "clamp(12px, 3vw, 16px)",
        marginBottom: "clamp(16px, 4vw, 20px)",
      }}
    >
      <Link
        href="/admin"
        style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
      >
        ← Voltar
      </Link>
      <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Documentos de adesão pendentes
      </h1>
      <div style={{ marginLeft: "auto" }}>
        <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
      </div>
    </div>
  );
}

function PendingBadge({ label, pending }: { label: string; pending: boolean }) {
  if (!pending) return null;
  return (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--danger)",
        color: "#fff",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
