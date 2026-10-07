import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getBeltName } from "@/lib/belts";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import { inChunks } from "@/lib/graduation/queries";
import { proposeMigrationGrade } from "@/lib/graduation/migration";
import { MigrationTable, type MigrationRow } from "./MigrationTable";

export const dynamic = "force-dynamic";

export default async function GraduacaoMigracaoPage({ params }: { params: Promise<{ modality: string }> }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const modalityCode = decodeURIComponent((await params).modality);
  const [{ data: modality }, readiness] = await Promise.all([
    supabase.from("ModalityRef").select("code, name").eq("code", modalityCode).maybeSingle(),
    loadModalityReadiness(supabase, modalityCode),
  ]);
  if (!modality) notFound();

  const back = (
    <Link
      href={`/admin/graduacao/${encodeURIComponent(modalityCode)}`}
      style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}
    >
      ← Graduação {modality.name}
    </Link>
  );
  if (!readiness) {
    return (
      <div>
        {back}
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Configura primeiro os graus desta modalidade.
        </p>
      </div>
    );
  }

  const ids = readiness.students.map((s) => s.studentId);
  const [athletes, grades] = await Promise.all([
    inChunks(ids, async (chunk) => (await supabase.from("Athlete").select("studentId, xp, displayBeltIndex").in("studentId", chunk)).data ?? []),
    inChunks(
      ids,
      async (chunk) =>
        (
          await supabase
            .from("StudentGrade")
            .select("studentId, gradeId, source, awardedAt")
            .eq("modalityCode", modalityCode)
            .in("studentId", chunk)
            .order("awardedAt", { ascending: false })
        ).data ?? []
    ),
  ]);
  const athleteBy = new Map(athletes.map((a) => [a.studentId, a]));
  const latestBy = new Map<string, { gradeId: string; source: string }>();
  for (const g of grades) if (!latestBy.has(g.studentId)) latestBy.set(g.studentId, g);
  const gradeIndex = new Map(readiness.template.grades.map((g, i) => [g.id, i]));

  const rows: MigrationRow[] = readiness.students
    .map((s) => {
      const athlete = athleteBy.get(s.studentId);
      const legacy = athlete ? (athlete.displayBeltIndex as number) : null;
      const latest = latestBy.get(s.studentId);
      return {
        studentId: s.studentId,
        name: s.name,
        isPrimary: s.isPrimary,
        legacyBeltName: legacy == null ? null : getBeltName(legacy),
        legacyXp: athlete ? (athlete.xp as number) : null,
        qualifyingMonths: s.progress.qualifyingMonthsTotal,
        proposal: proposeMigrationGrade(legacy, s.progress.qualifyingMonthsTotal, readiness.template.grades),
        current: latest ? { gradeIndex: gradeIndex.get(latest.gradeId) ?? -1, source: latest.source } : null,
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, "pt"));

  return (
    <div style={{ maxWidth: "min(860px, 100%)", paddingBottom: 96 }}>
      {back}
      <h1 style={{ margin: "var(--space-4) 0 8px", fontSize: "var(--text-xl)", fontWeight: 600 }}>Graus iniciais · {modality.name}</h1>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Converte a faixa antiga (por XP) no grau equivalente, limitado ao tempo de treino já registado na plataforma. Revê e ajusta os
        alunos que já treinavam antes da plataforma — tu conheces o nível real deles. Nada é gravado até carregares em
        &quot;Aplicar&quot;. Os graus ficam registados como migração: o tempo acumulado até esse grau conta como cumprido e o tempo
        mínimo para o próximo conta a partir de hoje.
      </p>
      {!readiness.template.isPublished && (
        <p
          style={{
            margin: "0 0 var(--space-4)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            background: "color-mix(in srgb, var(--warning) 12%, transparent)",
          }}
        >
          A graduação está em rascunho: os alunos só passam a ver o grau quando a publicares no editor.
        </p>
      )}
      <MigrationTable
        modalityCode={modalityCode}
        grades={readiness.template.grades.map((g) => ({ id: g.id, name: g.name, colors: g.colors }))}
        rows={rows}
      />
    </div>
  );
}
