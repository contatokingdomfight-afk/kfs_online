import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";

export const dynamic = "force-dynamic";

export default async function AdminGraduacaoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const [{ data: modalities }, { data: templates }, { data: grades }] = await Promise.all([
    result.client.from("ModalityRef").select("code, name, graduationModalities").order("sortOrder", { ascending: true }),
    result.client.from("GraduationTemplate").select("id, modalityCode, isPublished"),
    result.client.from("GraduationGrade").select("templateId, colors, minMonths, sortOrder").order("sortOrder", { ascending: true }),
  ]);

  const nameOf = new Map((modalities ?? []).map((m) => [m.code as string, m.name as string]));
  const rows = (modalities ?? []).map((m) => {
    const template = (templates ?? []).find((t) => t.modalityCode === m.code) ?? null;
    const templateGrades = template ? (grades ?? []).filter((g) => g.templateId === template.id) : [];
    return {
      ...m,
      template,
      gradeCount: templateGrades.length,
      totalMonths: templateGrades.reduce((sum, g) => sum + (g.minMonths ?? 0), 0),
      gradeColors: templateGrades.map((g) => (g.colors ?? []) as string[]),
      components: ((m.graduationModalities as string[] | null) ?? []).map((c) => nameOf.get(c) ?? c),
    };
  });

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>
        Graduação por modalidade
      </h1>
      <p style={{ margin: "0 0 var(--space-5) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Define os graus de cada modalidade: o que o aluno precisa dominar nos 4 eixos (Técnico, Tático, Teórico e Físico), os cursos da
        plataforma e o tempo mínimo de treino. O grau do aluno passa a ser atribuído pelo exame de graduação.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {rows.map((m) => (
          <li key={m.code}>
            <Link
              href={`/admin/graduacao/${encodeURIComponent(m.code)}`}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", color: "var(--text-primary)" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>{m.name}</span>
                  <TemplateStatus template={m.template} composite={m.components.length > 0} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                  {m.template
                    ? `${m.gradeCount} ${m.gradeCount === 1 ? "grau" : "graus"} · ${m.totalMonths} meses até ao grau máximo`
                    : m.components.length > 0
                      ? `Usa os graus de: ${m.components.join(", ")}`
                      : "Ainda sem graduação configurada"}
                </p>
                {m.gradeColors.length > 0 && (
                  <div style={{ display: "flex", gap: 3, marginTop: 10, flexWrap: "wrap" }} aria-hidden>
                    {m.gradeColors.map((colors, i) => (
                      <BeltSwatch key={i} colors={colors} width={28} height={8} />
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateStatus({ template, composite }: { template: { isPublished: boolean } | null; composite?: boolean }) {
  const [label, color, bg] = !template
    ? composite
      ? ["Composta", "var(--primary)", "color-mix(in srgb, var(--primary) 14%, transparent)"]
      : ["Por configurar", "var(--text-secondary)", "var(--bg)"]
    : template.isPublished
      ? ["Publicado", "var(--success)", "color-mix(in srgb, var(--success) 14%, transparent)"]
      : ["Rascunho", "var(--warning)", "color-mix(in srgb, var(--warning) 14%, transparent)"];
  return (
    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, padding: "2px 8px", borderRadius: 999, color, background: bg }}>
      {label}
    </span>
  );
}
