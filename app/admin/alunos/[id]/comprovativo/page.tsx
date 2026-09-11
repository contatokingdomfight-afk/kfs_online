import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { StudentEnrollmentPrintView } from "@/components/documents/StudentEnrollmentPrintView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoComprovativoPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;

  return <StudentEnrollmentPrintView studentId={studentId} backHref={`/admin/alunos/${studentId}/plano-seguro`} />;
}
