import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { WaiverSigningForm } from "./WaiverSigningForm";

export default async function WaiverSigningPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ALUNO") redirect("/dashboard");

  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();

  const { data: waiver } = await supabase
    .from("StudentWaiver")
    .select("waiverSigned")
    .eq("studentId", studentId)
    .maybeSingle();

  if (waiver?.waiverSigned) {
    const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).maybeSingle();
    redirect(student?.planId ? "/dashboard" : "/escolher-plano");
  }

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth")
    .eq("studentId", studentId)
    .maybeSingle();

  const todayYmd = new Date().toISOString().slice(0, 10);
  const isMinor = isMinorFromDateOfBirth(
    (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? null,
    todayYmd
  );

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div className="container-mobile" style={{ width: "100%" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
          Termo de responsabilidade
        </h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>
          Antes de continuar, lê e assina o termo de responsabilidade da escola.
        </p>
        <WaiverSigningForm isMinor={isMinor} />
      </div>
    </main>
  );
}
