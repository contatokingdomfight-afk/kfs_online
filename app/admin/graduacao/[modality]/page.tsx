import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { GraduationTemplateEditor, type CourseOption } from "./GraduationTemplateEditor";

export const dynamic = "force-dynamic";

export default async function AdminGraduacaoModalityPage({ params }: { params: Promise<{ modality: string }> }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { modality: rawModality } = await params;
  const modalityCode = decodeURIComponent(rawModality);

  const [{ data: modalities }, { data: courseRows }, { data: templates }, template] = await Promise.all([
    result.client.from("ModalityRef").select("code, name, graduationModalities").order("sortOrder", { ascending: true }),
    result.client.from("Course").select("id, name, modality, is_active").order("name", { ascending: true }),
    result.client.from("GraduationTemplate").select("modalityCode, isPublished"),
    loadGraduationTemplate(result.client, modalityCode),
  ]);

  const modality = (modalities ?? []).find((m) => m.code === modalityCode);
  if (!modality) notFound();

  const modalityNames = new Map((modalities ?? []).map((m) => [m.code, m.name]));
  const courses: CourseOption[] = (courseRows ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      modalityName: c.modality ? modalityNames.get(c.modality) ?? c.modality : null,
      isActive: c.is_active,
      sameModality: c.modality === modalityCode,
    }))
    // Primeiro os cursos desta modalidade, depois os gerais, depois os de outras modalidades.
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "pt"));

  const copySources = (templates ?? [])
    .map((t) => t.modalityCode)
    .filter((code) => code !== modalityCode)
    .map((code) => ({ code, name: modalityNames.get(code) ?? code }));

  return (
    <div style={{ maxWidth: "min(860px, 100%)", paddingBottom: 96 }}>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Link href="/admin/graduacao" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Graduação
        </Link>
      </div>
      <GraduationTemplateEditor
        modalityCode={modality.code}
        modalityName={modality.name}
        initialTemplate={template}
        courses={courses}
        copySources={copySources}
        components={(modality.graduationModalities as string[] | null) ?? []}
        componentOptions={(modalities ?? [])
          .filter((m) => m.code !== modalityCode)
          .map((m) => ({
            code: m.code,
            name: m.name,
            graduation: (() => {
              const t = (templates ?? []).find((x) => x.modalityCode === m.code);
              return t ? (t.isPublished ? "published" : "draft") : "none";
            })() as "published" | "draft" | "none",
          }))}
      />
    </div>
  );
}

function rank(c: CourseOption): number {
  if (c.sameModality) return 0;
  if (!c.modalityName) return 1;
  return 2;
}
