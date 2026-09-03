import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PerfilForm } from "./PerfilForm";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { LegalDocumentsSection } from "./LegalDocumentsSection";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

/** Valor para `input type="date"` (YYYY-MM-DD). */
function dateOfBirthForInput(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : s.slice(0, 10);
}

export default async function DashboardPerfilPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const { data: student } = await supabase.from("Student").select("userId, primaryModality").eq("id", studentId).single();
  if (!student) redirect("/dashboard");

  const { data: user } = await supabase
    .from("User")
    .select("name, email, avatarUrl")
    .eq("id", student.userId)
    .single();

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("weightKg, heightCm, reachCm, dateOfBirth, medicalNotes, emergencyContact, phone, nickname")
    .eq("studentId", studentId)
    .maybeSingle();

  const [{ data: waiver }, { data: agreement }, { data: enrollmentForm }] = await Promise.all([
    supabase
      .from("StudentWaiver")
      .select("waiverSigned, waiverSignedAt")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase
      .from("StudentEnrollmentForm")
      .select("formCompleted, formCompletedAt")
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  const initial = {
    name: user?.name ?? "",
    nickname: (profile as { nickname?: string | null } | undefined)?.nickname ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? "",
    phone: (profile as { phone?: string | null } | undefined)?.phone ?? "",
    weightKg: profile?.weightKg != null ? String(profile.weightKg) : "",
    heightCm: profile?.heightCm != null ? String(profile.heightCm) : "",
    reachCm: profile?.reachCm != null ? String(profile.reachCm) : "",
    dateOfBirth: dateOfBirthForInput(profile?.dateOfBirth),
    medicalNotes: profile?.medicalNotes ?? "",
    emergencyContact: profile?.emergencyContact ?? "",
    primaryModalityLabel:
      (student as { primaryModality?: string | null } | null)?.primaryModality
        ? MODALITY_LABELS[(student as { primaryModality?: string | null }).primaryModality ?? ""]
          ?? (student as { primaryModality?: string | null }).primaryModality
          ?? (locale === "en" ? "Not set" : "Não definida")
        : (locale === "en" ? "Not set" : "Não definida"),
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
      <LegalDocumentsSection
        locale={locale as "pt" | "en"}
        waiverSigned={Boolean(waiver?.waiverSigned)}
        waiverSignedAt={(waiver as { waiverSignedAt?: string | null } | null)?.waiverSignedAt ?? null}
        enrollmentFormCompleted={Boolean(enrollmentForm?.formCompleted)}
        enrollmentFormCompletedAt={(enrollmentForm as { formCompletedAt?: string | null } | null)?.formCompletedAt ?? null}
        agreementSigned={Boolean(agreement?.agreementSigned)}
        agreementSignedAt={(agreement as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null}
        agreementSignatureName={(agreement as { signatureName?: string | null } | null)?.signatureName ?? null}
      />
      <ChangePasswordSection email={initial.email} locale={locale as "pt" | "en"} />
      <PushNotificationToggle locale={locale as "pt" | "en"} />
      <DeleteAccountSection locale={locale as "pt" | "en"} />
    </div>
  );
}
