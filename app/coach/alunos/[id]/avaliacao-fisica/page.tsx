import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AvaliacaoFisicaForm } from "./AvaliacaoFisicaForm";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function CoachAlunoAvaliacaoFisicaPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div className="p-4">
        <p className="text-text-secondary mb-4">Aluno não encontrado.</p>
        <Link href="/coach/alunos" className="btn btn-secondary no-underline">← Voltar</Link>
      </div>
    );
  }

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
    <div className="p-4 max-w-3xl mx-auto pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href={`/coach/alunos/${studentId}`} className="text-sm font-medium text-text-secondary hover:text-primary no-underline">
          ← Perfil do aluno
        </Link>
        <h1 className="text-xl font-semibold text-text-primary m-0">
          Ficha de Anamnese e Avaliação Física
        </h1>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Preenche a ficha e guarda. A renovação é obrigatória a cada 6 meses.
      </p>
      <AvaliacaoFisicaForm
        studentId={studentId}
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
