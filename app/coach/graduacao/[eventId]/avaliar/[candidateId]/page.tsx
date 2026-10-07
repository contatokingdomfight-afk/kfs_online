import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { loadCandidateSheet } from "@/lib/graduation/load-exam";
import { ExamScoringSheet } from "./ExamScoringSheet";

export const dynamic = "force-dynamic";

export default async function AvaliarCandidatoPage({ params }: { params: Promise<{ eventId: string; candidateId: string }> }) {
  const { userId } = await requireGraduationExamPage();
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { eventId, candidateId } = await params;
  const data = await loadCandidateSheet(result.client, candidateId, userId);
  if (!data || data.event.id !== eventId) notFound();
  if (data.candidate.status !== "CONVOKED" || data.event.status !== "SCHEDULED") {
    redirect(`/coach/graduacao/${eventId}/resultado/${candidateId}`);
  }

  return (
    <div style={{ maxWidth: "min(720px, 100%)", paddingBottom: 120 }}>
      <Link href={`/coach/graduacao/${eventId}`} style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
        ← {data.event.title}
      </Link>
      <ExamScoringSheet
        eventId={eventId}
        candidateId={candidateId}
        studentName={data.candidate.studentName}
        sheet={data.sheet}
        initialScores={data.myScores}
      />
    </div>
  );
}
