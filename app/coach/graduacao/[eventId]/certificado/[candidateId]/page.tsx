import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { loadCertificate } from "@/lib/graduation/certificate";
import { GraduationCertificate } from "@/components/graduation/GraduationCertificate";
import { CertificateSwitcher } from "@/components/graduation/CertificateSwitcher";

export const dynamic = "force-dynamic";

/** Coach/admin: certificado completo do aluno aprovado (ver, imprimir para entregar, guardar imagem). */
export default async function CertificadoAlunoStaffPage({ params }: { params: Promise<{ eventId: string; candidateId: string }> }) {
  await requireGraduationExamPage();
  const supabase = getAdminClientOrNull();
  if (!supabase.client) return <AdminConfigMissing errorType={supabase.error} />;

  const { eventId, candidateId } = await params;
  const { data: candidate } = await supabase.client
    .from("GraduationExamCandidate")
    .select("id, eventId")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate || candidate.eventId !== eventId) notFound();
  // Só existe depois da revelação (aprovado + número de certificado).
  const certificate = await loadCertificate(supabase.client, candidateId);
  if (!certificate) notFound();

  return (
    <div style={{ maxWidth: "min(720px, 100%)", paddingBottom: 96 }}>
      <Link
        href={`/coach/graduacao/${eventId}?separador=aprovados`}
        style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}
      >
        ← Aprovados
      </Link>
      <header style={{ margin: "var(--space-4) 0" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700 }}>{certificate.studentName}</h1>
        <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Certificado de graduação · {certificate.gradeName} · {certificate.modalityName} · N.º {certificate.number}
        </p>
      </header>
      <section className="card" style={{ padding: "var(--space-4)" }}>
        <CertificateSwitcher
          dark={<GraduationCertificate data={certificate} />}
          light={<GraduationCertificate data={certificate} variant="light" />}
          fileName={`certificado-${certificate.studentName}-${certificate.gradeName}`.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}
          shareText={`Novo grau na Kingdom Fight School: ${certificate.studentName} — ${certificate.gradeName} (${certificate.modalityName}) 🥊`}
          verifyUrl={certificate.verifyUrl}
        />
      </section>
    </div>
  );
}
