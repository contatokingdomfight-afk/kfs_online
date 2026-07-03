import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CoachAlunoAdminEnrollmentSection } from "../_components/CoachAlunoAdminEnrollmentSection";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoInscricaoPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: studentId } = await params;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <CoachAlunoAdminEnrollmentSection studentId={studentId} />
    </div>
  );
}
