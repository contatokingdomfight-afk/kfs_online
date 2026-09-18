import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { StaffStudentMembershipDocumentsView } from "@/components/documents/StaffStudentMembershipDocumentsView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAlunoContratoPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;
  const base = `/admin/alunos/${studentId}`;

  return (
    <StaffStudentMembershipDocumentsView
      studentId={studentId}
      printComprovativoHref={`${base}/comprovativo`}
      printContratoHref={`${base}/contrato/imprimir`}
      showAdminSignShortcut
    />
  );
}
