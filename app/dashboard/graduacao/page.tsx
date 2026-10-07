import Link from "next/link";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { StudentGraduationView } from "@/components/graduation/StudentGraduationView";
import { ModalitySummaryCard } from "@/components/graduation/ModalitySummaryCard";

export const dynamic = "force-dynamic";

export default async function MinhaGraduacaoPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  const admin = getAdminClientOrNull().client;
  const graduations = studentId && admin ? await loadStudentGraduations(admin, studentId) : [];

  const { m } = await searchParams;
  const selected = graduations.find((g) => g.modalityCode === m) ?? graduations[0] ?? null;

  // Sem graduação para mostrar: diz qual é a modalidade do aluno que ainda não tem graduação.
  let pendingModalityName: string | null = null;
  if (!selected && studentId && admin) {
    const { data: student } = await admin.from("Student").select("primaryModality").eq("id", studentId).maybeSingle();
    const code = (student?.primaryModality as string | null) ?? null;
    if (code) {
      const { data: modality } = await admin.from("ModalityRef").select("name").eq("code", code).maybeSingle();
      pendingModalityName = (modality?.name as string | undefined) ?? code;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[680px] py-4 sm:py-6">
      <Link href="/dashboard/performance" className="mb-4 inline-block text-sm font-medium text-text-secondary no-underline hover:text-text-primary">
        ← Perfil do atleta
      </Link>
      <h1 className="m-0 text-2xl font-bold text-text-primary">A minha graduação</h1>

      {graduations.length > 1 && (
        <section aria-label="As tuas graduações" className="mt-4">
          <p className="m-0 text-sm text-text-secondary">
            Tens graduação em {graduations.length} modalidades. Escolhe uma para ver o detalhe.
          </p>
          <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {graduations.map((g) => (
              <li key={g.modalityCode}>
                <ModalitySummaryCard graduation={g} active={g.modalityCode === selected?.modalityCode} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected ? (
        <StudentGraduationView graduation={selected} />
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-bg-secondary p-6 text-center">
          <p className="m-0 text-base font-semibold text-text-primary">
            {pendingModalityName ? `A graduação de ${pendingModalityName} ainda não está disponível` : "A graduação ainda não está disponível"}
          </p>
          <p className="mx-auto mt-2 mb-0 max-w-[420px] text-sm text-text-secondary">
            Assim que a academia publicar a graduação {pendingModalityName ? `de ${pendingModalityName}` : "da tua modalidade"}, vais ver
            aqui o teu grau e tudo o que precisas para o próximo exame.
          </p>
        </div>
      )}
    </div>
  );
}
