import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { NewExamForm } from "./NewExamForm";

export const dynamic = "force-dynamic";

export default async function NovoExamePage() {
  await requireGraduationExamPage();
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const [{ data: templates }, { data: modalities }] = await Promise.all([
    result.client.from("GraduationTemplate").select("modalityCode, isPublished"),
    result.client.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true }),
  ]);
  const options = (modalities ?? [])
    .map((m) => ({ code: m.code, name: m.name, template: (templates ?? []).find((t) => t.modalityCode === m.code) }))
    .filter((m) => m.template)
    .map((m) => ({ code: m.code, name: m.name, isPublished: Boolean(m.template?.isPublished) }));

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <Link href="/coach/graduacao" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
        ← Exames de graduação
      </Link>
      <h1 style={{ margin: "var(--space-4) 0 var(--space-4)", fontSize: "var(--text-xl)", fontWeight: 600 }}>Novo exame</h1>
      {options.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Nenhuma modalidade tem graduação configurada. Configura-a em Admin → Graduação.
        </p>
      ) : (
        <NewExamForm modalities={options} />
      )}
    </div>
  );
}
