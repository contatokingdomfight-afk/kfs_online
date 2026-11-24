import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { cookies } from "next/headers";
import { getDefaultOnboardingSchoolId, sortSchoolsForOnboarding, SIGNUP_SCHOOL_COOKIE } from "@/lib/onboarding-default-school";

/** Escola Demo (só leitura): nunca aparece como escolha. Igual a DEMO_SCHOOL_ID em lib/demo.ts (não versionado). */
const DEMO_SCHOOL_ID = "demo-school";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const [dbUser, locale] = await Promise.all([getCurrentDbUser(), getLocaleFromCookies()]);
  if (!dbUser) redirect("/sign-in");

  // Professor com pedido de acesso à espera: a página dele é a do pedido, não a do aluno.
  const admin = getAdminClientOrNull().client;
  if (admin) {
    const { data: pendingCoachRequest } = await admin
      .from("CoachAccessRequest")
      .select("id")
      .eq("userId", dbUser.id)
      .eq("status", "PENDING")
      .maybeSingle();
    if (pendingCoachRequest) redirect("/onboarding/professor");
  }

  const supabase = await createClient();

  const { data: schools } = await supabase
    .from("School")
    .select("id, name")
    .eq("isActive", true)
    .order("createdAt", { ascending: true });

  const schoolsSorted = sortSchoolsForOnboarding((schools ?? []).filter((s) => s.id !== DEMO_SCHOOL_ID));
  // Veio pelo link de inscrição de uma escola: essa fica escolhida.
  const fromLink = (await cookies()).get(SIGNUP_SCHOOL_COOKIE)?.value;
  const defaultSchoolId =
    fromLink && schoolsSorted.some((s) => s.id === fromLink) ? fromLink : getDefaultOnboardingSchoolId(schoolsSorted);

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
