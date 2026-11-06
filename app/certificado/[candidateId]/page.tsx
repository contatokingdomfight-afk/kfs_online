import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { formatCertificateDate, loadPublicCertificate } from "@/lib/graduation/certificate";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificação de certificado · Kingdom Fight School", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f-]{20,40}$/i;

/** Página pública do QR do certificado: confirma que é verdadeiro, só com os dados essenciais (sem NIF). */
export default async function VerificarCertificadoPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const supabase = getAdminClientOrNull().client;
  if (!supabase || !UUID.test(candidateId)) notFound();
  const cert = await loadPublicCertificate(supabase, candidateId);
  if (!cert) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Aluno", cert.studentName],
    [
      "Grau",
      <span key="g" className="inline-flex items-center gap-2">
        <BeltSwatch colors={cert.gradeColors} width={32} height={10} modality={cert.modalityCode} /> {cert.gradeName} · {cert.modalityName}
      </span>,
    ],
    ["Data", formatCertificateDate(cert.issuedAt)],
    ["N.º", cert.number],
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-4 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/kfs-emblem.svg" alt="Kingdom Fight School" className="mx-auto mb-4 h-20 w-auto" />
      <div
        className="flex items-center gap-3 rounded-xl border p-3"
        style={{ borderColor: "color-mix(in srgb, var(--success) 45%, transparent)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }}
      >
        <BadgeCheck size={26} aria-hidden className="shrink-0 text-success" />
        <div>
          <p className="m-0 font-bold text-text-primary">Certificado válido</p>
          <p className="m-0 text-sm text-text-secondary">Emitido pela Kingdom Fight School</p>
        </div>
      </div>
      <dl className="m-0 mt-4 rounded-2xl border border-border bg-bg-secondary p-4">
        {rows.map(([k, v]) => (
          <div key={k} className="py-1.5">
            <dt className="text-xs text-text-secondary">{k}</dt>
            <dd className="m-0 font-semibold text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
