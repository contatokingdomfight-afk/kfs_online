import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { StudentWaiverPrintView } from "@/components/documents/StudentWaiverPrintView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoTermoImprimirPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;

  return (
    <StudentWaiverPrintView studentId={studentId} backHref={`/coach/alunos/${studentId}/contrato`} />
  );
}
