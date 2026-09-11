import { redirect } from "next/navigation";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { StudentEnrollmentPrintView } from "@/components/documents/StudentEnrollmentPrintView";

export const dynamic = "force-dynamic";

export default async function ImprimirComprovativoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  return <StudentEnrollmentPrintView studentId={studentId} backHref="/dashboard/documentos-adesao" />;
}
