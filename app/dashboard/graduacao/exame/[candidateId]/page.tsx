import Link from "next/link";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { retakeAvailableFrom, sheetEntries, type ExamResult } from "@/lib/graduation/exam";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { sheetForGrade } from "@/lib/graduation/load-exam";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { ExamResultBreakdown, type ExamScoreRowView } from "@/components/graduation/ExamResultBreakdown";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";

export const dynamic = "force-dynamic";

export default async function MeuExamePage({ params }: { params: Promise<{ candidateId: string }> }) {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  const supabase = getAdminClientOrNull().client;
  if (!studentId || !supabase) notFound();

  const { candidateId } = await params;
  const { data: candidate } = await supabase
    .from("GraduationExamCandidate")
    .select("id, eventId, studentId, gradeId, status, feedback, result, decidedAt")
    .eq("id", candidateId)
    .maybeSingle();
  // Só o próprio aluno vê o seu exame, e só depois de decidido.
  if (!candidate || candidate.studentId !== studentId || !["PASSED", "FAILED"].includes(candidate.status)) notFound();

  const [{ data: event }, { data: grade }, { data: scoreRows }] = await Promise.all([
    supabase.from("GraduationExamEvent").select("title, scheduledAt, modalityCode").eq("id", candidate.eventId).maybeSingle(),
    supabase.from("GraduationGrade").select("name, colors").eq("id", candidate.gradeId).maybeSingle(),
    supabase
      .from("GraduationExamScore")
      .select("scoreKey, examinerUserId, section, axis, label, isCritical, score, comment")
      .eq("candidateId", candidateId),
  ]);
  const template = event ? await loadGraduationTemplate(supabase, event.modalityCode) : null;
  const sheet = template ? sheetForGrade(template, candidate.gradeId) : null;
  const result = candidate.result as ExamResult | null;
  const passed = candidate.status === "PASSED";

  return (
    <div className="mx-auto w-full max-w-[680px] py-4 sm:py-6">
      <Link href="/dashboard/graduacao" className="mb-4 inline-block text-sm font-medium text-text-secondary no-underline hover:text-text-primary">
        ← A minha graduação
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="m-0 text-2xl font-bold text-text-primary">Exame: {grade?.name ?? "Grau"}</h1>
        <ExamStatusChip status={candidate.status} />
      </div>
      <p className="m-0 mt-1 flex items-center gap-2 text-sm text-text-secondary">
        <BeltSwatch colors={(grade?.colors as string[] | null) ?? []} width={32} height={10} />
        {event?.title} · {event ? formatExamDate(event.scheduledAt, false) : ""}
      </p>

      <div
        className="mt-4 flex gap-3 rounded-2xl border p-4"
        style={{
          borderColor: passed ? "var(--success)" : "var(--border)",
          background: passed ? "color-mix(in srgb, var(--success) 10%, transparent)" : "var(--bg-secondary)",
        }}
      >
        {passed && <PartyPopper size={22} aria-hidden className="mt-0.5 shrink-0 text-success" />}
        <div>
          <p className="m-0 text-base font-bold text-text-primary">{passed ? `Parabéns, agora és ${grade?.name}!` : "Ainda não foi desta."}</p>
          <p className="m-0 mt-1 text-sm text-text-secondary">
            {passed
              ? "O teu novo grau já aparece na tua graduação, com o próximo objetivo."
              : candidate.decidedAt
                ? `Usa as notas e o feedback para te preparares. Podes voltar a fazer o exame a partir de ${formatExamDate(
                    retakeAvailableFrom(new Date(candidate.decidedAt)).toISOString(),
                    false
                  )}.`
                : "Usa as notas e o feedback para te preparares para o próximo exame."}
          </p>
        </div>
      </div>

      {candidate.feedback && (
        <div className="mt-4 rounded-2xl border border-border bg-bg-secondary p-4">
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-secondary">Feedback dos avaliadores</p>
          <p className="m-0 mt-2 whitespace-pre-line text-sm text-text-primary">{candidate.feedback}</p>
        </div>
      )}

      {result && (scoreRows ?? []).length > 0 && (
        <div className="mt-4">
          <ExamResultBreakdown
            result={result}
            rows={(scoreRows ?? []) as ExamScoreRowView[]}
            keyOrder={sheet ? sheetEntries(sheet).map((e) => e.key) : undefined}
          />
        </div>
      )}
    </div>
  );
}
