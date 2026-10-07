import Link from "next/link";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { StudentGraduationView } from "@/components/graduation/StudentGraduationView";

export const dynamic = "force-dynamic";

export default async function MinhaGraduacaoPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  const admin = getAdminClientOrNull().client;
  const graduations = studentId && admin ? await loadStudentGraduations(admin, studentId) : [];

  const { m } = await searchParams;
  const selected = graduations.find((g) => g.modalityCode === m) ?? graduations[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[680px] py-4 sm:py-6">
      <Link href="/dashboard/performance" className="mb-4 inline-block text-sm font-medium text-text-secondary no-underline hover:text-text-primary">
        ← Perfil do atleta
      </Link>
      <h1 className="m-0 text-2xl font-bold text-text-primary">A minha graduação</h1>

      {graduations.length > 1 && (
        <nav aria-label="Modalidades" className="mt-4 flex flex-wrap gap-2">
          {graduations.map((g) => {
            const active = g.modalityCode === selected?.modalityCode;
            return (
              <Link
                key={g.modalityCode}
                href={`/dashboard/graduacao?m=${encodeURIComponent(g.modalityCode)}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold no-underline transition-colors ${
                  active ? "border-primary bg-primary text-white" : "border-border bg-bg-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {g.modalityName}
              </Link>
            );
          })}
        </nav>
      )}

      {selected ? (
        <StudentGraduationView graduation={selected} />
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-bg-secondary p-6 text-center">
          <p className="m-0 text-base font-semibold text-text-primary">A graduação ainda não está disponível</p>
          <p className="mx-auto mt-2 mb-0 max-w-[420px] text-sm text-text-secondary">
            Assim que a academia publicar a graduação da tua modalidade, vais ver aqui o teu grau e tudo o que precisas para o próximo
            exame.
          </p>
        </div>
      )}
    </div>
  );
}
