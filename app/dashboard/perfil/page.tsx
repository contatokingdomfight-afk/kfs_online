import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PerfilForm } from "./PerfilForm";

export default async function DashboardPerfilPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).single();
  if (!student) redirect("/dashboard");

  const { data: user } = await supabase
    .from("User")
    .select("name, email, avatarUrl")
    .eq("id", student.userId)
    .single();

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("weightKg, heightCm, dateOfBirth, medicalNotes, emergencyContact, phone")
    .eq("studentId", studentId)
    .maybeSingle();

  const initial = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? "",
    phone: (profile as { phone?: string | null } | undefined)?.phone ?? "",
    weightKg: profile?.weightKg != null ? String(profile.weightKg) : "",
    heightCm: profile?.heightCm != null ? String(profile.heightCm) : "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    medicalNotes: profile?.medicalNotes ?? "",
    emergencyContact: profile?.emergencyContact ?? "",
  };

  return (
    <div style={{ maxWidth: "min(480px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/dashboard"
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
        {t("myDataTitle")}
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {t("profileIntro")}
      </p>
      <PerfilForm initial={initial} locale={locale as "pt" | "en"} />
    </div>
  );
}
