import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { StudentContractPrintView } from "@/components/documents/StudentContractPrintView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoContratoImprimirPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;

  return (
    <StudentContractPrintView studentId={studentId} backHref={`/admin/alunos/${studentId}/contrato`} />
  );
}
