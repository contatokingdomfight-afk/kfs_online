import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { CoachPerfilForm } from "./CoachPerfilForm";

export default async function CoachConfiguracoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const coachId = await getCurrentCoachId();

  const { data: user } = await supabase
    .from("User")
    .select("name, email, avatarUrl")
    .eq("id", dbUser.id)
    .single();

  let phone: string = "";
  let dateOfBirth: string = "";
  if (coachId) {
    const { data: coach } = await supabase
      .from("Coach")
      .select("phone, date_of_birth")
      .eq("id", coachId)
      .single();
    phone = (coach as { phone?: string | null } | null)?.phone ?? "";
    const dob = (coach as { date_of_birth?: string | null } | null)?.date_of_birth;
    dateOfBirth = typeof dob === "string" ? dob : "";
  }

  const initial = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? "",
    phone,
    dateOfBirth,
  };

  return (
    <div style={{ maxWidth: "min(480px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("navHome")}
        </Link>
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("coachSettingsTitle")}
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {t("coachProfileIntro")}
      </p>
      <CoachPerfilForm initial={initial} locale={locale as "pt" | "en"} hasCoachRow={!!coachId} />
    </div>
  );
}
