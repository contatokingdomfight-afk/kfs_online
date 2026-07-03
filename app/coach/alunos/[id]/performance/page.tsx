import { Suspense } from "react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PerformanceContent } from "./_components/PerformanceContent";
import { PerformanceContentSkeleton } from "./_components/PerformanceContentSkeleton";

type Props = { params: Promise<{ id: string }> };

export default async function CoachAlunoPerformancePage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  return (
    <Suspense fallback={<PerformanceContentSkeleton />}>
      <PerformanceContent studentId={studentId} />
    </Suspense>
  );
}
