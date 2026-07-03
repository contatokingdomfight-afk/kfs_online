import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AvaliacaoFisicaForm } from "./AvaliacaoFisicaForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

/** Evita open redirect: só caminhos internos /coach/* ou /admin/*. */
function safeAfterSavePath(next: string | string[] | undefined, studentId: string): string {
  const fallback = `/coach/alunos/${studentId}`;
  const raw = Array.isArray(next) ? next[0] : next;
  if (!raw || typeof raw !== "string") return fallback;
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  if (!p.startsWith("/coach/") && !p.startsWith("/admin/")) return fallback;
  return p;
}

export const dynamic = "force-dynamic";

export default async function CoachAlunoAvaliacaoFisicaPage({ params, searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const sp = await searchParams;
  const afterSaveHref = safeAfterSavePath(sp.next, studentId);
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: user } = await supabase.from("User").select("id, name, email").eq("id", student.userId).single();
  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth, phone, heightCm, weightKg")
    .eq("studentId", studentId)
    .maybeSingle();

  const name = (user?.name as string | null) ?? "";
  const email = (user?.email as string | null) ?? "";
  const dob = profile?.dateOfBirth != null ? String(profile.dateOfBirth).slice(0, 10) : null;
  const phone = (profile?.phone as string | null) ?? null;
  const height = profile?.heightCm != null ? Number(profile.heightCm) : null;
  const weight = profile?.weightKg != null ? Number(profile.weightKg) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 sm:p-6 max-w-3xl xl:max-w-6xl 2xl:max-w-7xl mx-auto pb-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary m-0 mb-6">
        Ficha de Anamnese e Avaliação Física
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Preenche a ficha e guarda. A renovação é obrigatória a cada 6 meses.
      </p>
      <AvaliacaoFisicaForm
        studentId={studentId}
        afterSaveHref={afterSaveHref}
        studentName={name}
        studentEmail={email}
        studentDob={dob}
        studentPhone={phone}
        studentHeight={height}
        studentWeight={weight}
        assessmentDate={today}
      />
    </div>
  );
}
