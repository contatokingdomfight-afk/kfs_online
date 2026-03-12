import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const [dbUser, studentId, locale] = await Promise.all([
    getCurrentDbUser(),
    getCurrentStudentId(),
    getLocaleFromCookies(),
  ]);
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();

  // Verificar se já completou onboarding → redirecionar para dashboard
  if (studentId) {
    const { data: profile } = await supabase
      .from("StudentProfile")
      .select("hasCompletedOnboarding")
      .eq("studentId", studentId)
      .maybeSingle();
    if (profile?.hasCompletedOnboarding) {
      redirect("/dashboard");
    }
  }

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("createdAt", { ascending: true });

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg"
      style={{ color: "var(--text-primary)" }}
    >
      <OnboardingWizard
        userName={dbUser.name}
        schools={schools ?? []}
        locale={(locale as "pt" | "en") ?? "pt"}
      />
    </main>
  );
}
