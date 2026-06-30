import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getDefaultOnboardingSchoolId, sortSchoolsForOnboarding } from "@/lib/onboarding-default-school";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const [dbUser, locale] = await Promise.all([getCurrentDbUser(), getLocaleFromCookies()]);
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("createdAt", { ascending: true });

  const schoolsSorted = sortSchoolsForOnboarding(schools ?? []);
  const defaultSchoolId = getDefaultOnboardingSchoolId(schoolsSorted);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg"
      style={{ color: "var(--text-primary)" }}
    >
      <OnboardingWizard
        userName={dbUser.name}
        schools={schoolsSorted}
        defaultSchoolId={defaultSchoolId}
        locale={(locale as "pt" | "en") ?? "pt"}
      />
    </main>
  );
}
