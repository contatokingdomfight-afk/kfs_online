import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, PartyPopper, PenLine, Printer, Archive } from "lucide-react";
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
import { MarkPhysicallyFiledButton } from "./MarkPhysicallyFiledButton";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
};

type SearchParams = Promise<{ school?: string; view?: string }>;

export default async function AdminDocumentosAdesaoPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const schoolId = params.school?.trim() || null;
  const view = params.view === "arquivo" ? "arquivo" : "pendentes";

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

  // Consulta isolada e tolerante a falhas: enquanto a migração da coluna
  // "physicalDocumentsFiledAt" não estiver aplicada em produção, a lista principal
  // ("Por assinar") continua a funcionar normalmente — só a aba "Por imprimir/arquivar"
  // fica temporariamente a mostrar todos os alunos assinados como por arquivar.
  const filedAtMap = new Map<string, string | null>();
  if (studentIds.length > 0) {
    const { data: filedRows } = await supabase
      .from("Student")
      .select("id, physicalDocumentsFiledAt")
      .in("id", studentIds);
    for (const row of filedRows ?? []) {
      filedAtMap.set(row.id as string, (row as { physicalDocumentsFiledAt?: string | null }).physicalDocumentsFiledAt ?? null);
    }
  }

  if (studentIds.length === 0) {
    return (
      <div style={{ maxWidth: "min(820px, 100%)" }}>
        <Header schools={schools} schoolId={schoolId} view={view} />
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

  const allRows = list.map((s) => {
    const studentId = s.id as string;
    const waiverSigned = waiverMap.get(studentId) ?? false;
    const agreementCurrent = isMembershipAgreementCurrent(agreementMap.get(studentId) ?? null, settings.membershipAgreementVersion);
    const formCurrent = isEnrollmentFormCurrent(formMap.get(studentId) ?? null, settings.enrollmentFormVersion);
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
      documentsSigned: waiverSigned && agreementCurrent && formCurrent,
      physicalDocumentsFiledAt: filedAtMap.get(studentId) ?? null,
    };
  });

  const pendingRows = allRows.filter((r) => !r.documentsSigned);
  const archiveRows = allRows.filter((r) => r.documentsSigned && !r.physicalDocumentsFiledAt);
  const rows = view === "arquivo" ? archiveRows : pendingRows;

  return (
    <div style={{ maxWidth: "min(820px, 100%)" }}>
      <Header schools={schools} schoolId={schoolId} view={view} pendingCount={pendingRows.length} archiveCount={archiveRows.length} />

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
          <PartyPopper size={18} aria-hidden />
          {view === "arquivo"
            ? "Nenhum aluno por imprimir/arquivar — tudo em dia."
            : "Nenhum aluno com documentos de adesão pendentes — tudo assinado."}
        </p>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: "clamp(12px, 3vw, 16px)" }}>
            {view === "arquivo"
              ? `${rows.length} aluno${rows.length === 1 ? "" : "s"} assinado${rows.length === 1 ? "" : "s"} digitalmente, por imprimir e arquivar em papel.`
              : `${rows.length} aluno${rows.length === 1 ? "" : "s"} com pelo menos um documento por assinar.`}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {rows.map((r) =>
              view === "arquivo" ? (
                <ArchiveRow key={r.studentId} row={r} />
              ) : (
                <PendingRow key={r.studentId} row={r} />
              )
            )}
          </ul>
        </>
      )}
    </div>
  );
}

type Row = {
  studentId: string;
  status: string;
  schoolName: string;
  name: string;
  email: string;
  phone: string | null;
  waiverSigned: boolean;
  agreementCurrent: boolean;
  formCurrent: boolean;
  documentsSigned: boolean;
  physicalDocumentsFiledAt: string | null;
};

function StudentRowHeader({ row }: { row: Row }) {
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>· {row.schoolName}</span>
        <span
          style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: "var(--radius-md)",
            backgroundColor: row.status === "INADIMPLENTE" ? "var(--danger)" : "var(--bg-secondary)",
            color: row.status === "INADIMPLENTE" ? "#fff" : "var(--text-primary)",
          }}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </div>
      <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--text-secondary)" }}>{row.email}</p>
    </>
  );
}

function PendingRow({ row }: { row: Row }) {
  const whatsAppUrl = row.phone
    ? buildWhatsAppUrl(row.phone, buildDocumentsPendingMessage(row.name.split(" ")[0] ?? "", `${getPublicOrigin()}/adesao`))
    : null;
  return (
    <li className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
      <StudentRowHeader row={row} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <PendingBadge label="Comprovativo" pending={!row.formCurrent} />
        <PendingBadge label="Condições Gerais" pending={!row.agreementCurrent} />
        <PendingBadge label="Termo de Responsabilidade" pending={!row.waiverSigned} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href={`/admin/alunos/${row.studentId}/contrato`} className="btn btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>
          Ver ficha
        </Link>
        <Link
          href={`/admin/alunos/${row.studentId}/contrato/assinar`}
          className="btn btn-primary"
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <PenLine size={15} aria-hidden />
          Assinar presencial
        </Link>
        <MarkPhysicalContractButton studentId={row.studentId} studentName={row.name} />
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
}

function ArchiveRow({ row }: { row: Row }) {
  const base = `/admin/alunos/${row.studentId}`;
  return (
    <li className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
      <StudentRowHeader row={row} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <Link
          href={`${base}/comprovativo`}
          target="_blank"
          className="btn btn-secondary"
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Printer size={15} aria-hidden />
          Comprovativo
        </Link>
        <Link
          href={`${base}/contrato/imprimir`}
          target="_blank"
          className="btn btn-secondary"
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Printer size={15} aria-hidden />
          Condições Gerais
        </Link>
        <Link
          href={`${base}/contrato/termo`}
          target="_blank"
          className="btn btn-secondary"
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Printer size={15} aria-hidden />
          Termo
        </Link>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href={`${base}/contrato`} className="btn btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>
          Ver ficha
        </Link>
        <MarkPhysicallyFiledButton studentId={row.studentId} studentName={row.name} />
      </div>
    </li>
  );
}

function Header({
  schools,
  schoolId,
  view,
  pendingCount,
  archiveCount,
}: {
  schools: { id: string; name: string }[];
  schoolId: string | null;
  view: "pendentes" | "arquivo";
  pendingCount?: number;
  archiveCount?: number;
}) {
  const schoolQs = schoolId ? `&school=${encodeURIComponent(schoolId)}` : "";
  return (
    <div style={{ marginBottom: "clamp(16px, 4vw, 20px)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: 14,
        }}
      >
        <Link
          href="/admin"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Documentos de adesão
        </h1>
        <div style={{ marginLeft: "auto" }}>
          <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
        </div>
      </div>
      <nav style={{ display: "flex", gap: 8 }} aria-label="Vistas de documentos de adesão">
        <Link
          href={`?view=pendentes${schoolQs}`}
          className={view === "pendentes" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          aria-current={view === "pendentes" ? "page" : undefined}
        >
          <PenLine size={14} aria-hidden />
          Por assinar{typeof pendingCount === "number" ? ` (${pendingCount})` : ""}
        </Link>
        <Link
          href={`?view=arquivo${schoolQs}`}
          className={view === "arquivo" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          aria-current={view === "arquivo" ? "page" : undefined}
        >
          <Archive size={14} aria-hidden />
          Por imprimir/arquivar{typeof archiveCount === "number" ? ` (${archiveCount})` : ""}
        </Link>
      </nav>
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
