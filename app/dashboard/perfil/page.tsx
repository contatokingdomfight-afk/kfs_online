import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PerfilForm } from "./PerfilForm";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { LegalDocumentsSection } from "./LegalDocumentsSection";
import { ReferralInviteSection } from "./ReferralInviteSection";
import { FighterCardSection } from "./FighterCardSection";
import { CoachTestimonialSection } from "./CoachTestimonialSection";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getPublicOrigin } from "@/lib/site-public-url";
import { isFighterCardEligibleAge } from "@/lib/fighter-card";
import { CheckCircle2, AlertCircle, Sparkles, UserRound, Gift, IdCard, MessageSquareQuote, FileText, ShieldCheck } from "lucide-react";

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

  const { data: student } = await supabase.from("Student").select("userId, primaryModality, planId, createdAt").eq("id", studentId).single();
  if (!student) redirect("/dashboard");

  const { data: user } = await supabase
    .from("User")
    .select("name, email, avatarUrl")
    .eq("id", student.userId)
    .single();

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("weightKg, heightCm, reachCm, dateOfBirth, medicalNotes, emergencyContact, phone, nickname, fighterCardPublic")
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

  const planId = (student as { planId?: string | null }).planId ?? null;
  const { data: planRow } = planId
    ? await supabase.from("Plan").select("name").eq("id", planId).maybeSingle()
    : { data: null };
  const planName = (planRow as { name?: string } | null)?.name ?? null;
  const memberSince = (student as { createdAt?: string | null }).createdAt
    ? new Date(String((student as { createdAt: string }).createdAt)).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
        month: "long",
        year: "numeric",
      })
    : null;
  const documentsDone =
    Boolean(waiver?.waiverSigned) && Boolean(agreement?.agreementSigned) && Boolean(enrollmentForm?.formCompleted);

  const { data: athlete } = await supabase.from("Athlete").select("mainCoachId").eq("studentId", studentId).maybeSingle();
  const mainCoachId = (athlete as { mainCoachId?: string | null } | null)?.mainCoachId ?? null;
  let mainCoachName = "";
  let existingTestimonial: { rating: number; body: string; status: "PENDING" | "APPROVED" | "REJECTED" } | null = null;
  if (mainCoachId) {
    // Nome do coach lido via admin client: a sessão do aluno (RLS) só pode ler o próprio User.
    const admin = getAdminClientOrNull().client;
    if (admin) {
      const { data: coachRow } = await admin.from("Coach").select("userId").eq("id", mainCoachId).maybeSingle();
      if (coachRow?.userId) {
        const { data: coachUser } = await admin.from("User").select("name").eq("id", coachRow.userId).maybeSingle();
        mainCoachName = coachUser?.name?.trim() || "";
      }
    }
    const { data: testimonialRow } = await supabase
      .from("CoachTestimonial")
      .select("rating, body, status")
      .eq("coachId", mainCoachId)
      .eq("studentId", studentId)
      .maybeSingle();
    if (testimonialRow) {
      existingTestimonial = testimonialRow as { rating: number; body: string; status: "PENDING" | "APPROVED" | "REJECTED" };
    }
  }

  const [{ count: invitedCount }, { data: referredStudents }] = await Promise.all([
    supabase.from("TrialClass").select("id", { count: "exact", head: true }).eq("referredByStudentId", studentId),
    supabase.from("Student").select("referralRewardGrantedAt").eq("referredByStudentId", studentId),
  ]);
  const convertedCount = (referredStudents ?? []).filter((r) => r.referralRewardGrantedAt != null).length;
  const referralLink = `${getPublicOrigin()}/aula-experimental?ref=${studentId}`;
  const fighterCardUrl = `${getPublicOrigin()}/t/f/${studentId}`;
  const fighterCardImageUrl = `${getPublicOrigin()}/t/f/${studentId}/image`;
  const fighterCardEligibleAge = isFighterCardEligibleAge(
    (profile as { dateOfBirth?: string | null } | undefined)?.dateOfBirth
  );

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

  const pt = locale !== "en";
  const initials =
    (initial.name || initial.email)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const sections = [
    { id: "dados", label: pt ? "Dados pessoais" : "Personal details", icon: <UserRound size={14} aria-hidden /> },
    { id: "convidar", label: pt ? "Convidar amigos" : "Invite friends", icon: <Gift size={14} aria-hidden /> },
    { id: "cartao", label: pt ? "Cartão de lutador" : "Fighter card", icon: <IdCard size={14} aria-hidden /> },
    ...(mainCoachId && mainCoachName
      ? [{ id: "testemunho", label: pt ? "Testemunho" : "Testimonial", icon: <MessageSquareQuote size={14} aria-hidden /> }]
      : []),
    { id: "documentos", label: pt ? "Documentos" : "Documents", icon: <FileText size={14} aria-hidden /> },
    { id: "seguranca", label: pt ? "Segurança" : "Security", icon: <ShieldCheck size={14} aria-hidden /> },
  ];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>
          {pt ? "Perfil" : "Profile"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{t("profileIntro")}</p>
      </header>

      {/* Cartão do aluno */}
      <section
        className="card"
        style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}
      >
        {initial.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar do Supabase Storage
          <img
            src={initial.avatarUrl}
            alt=""
            style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)", flexShrink: 0 }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 84,
              height: 84,
              flexShrink: 0,
              borderRadius: "50%",
              border: "3px solid var(--primary)",
              backgroundColor: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {initials}
          </span>
        )}
        <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: "clamp(19px, 4.8vw, 22px)", fontWeight: 800, lineHeight: 1.2 }}>{initial.name || initial.email}</div>
            {initial.nickname ? (
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 2 }}>«{initial.nickname}»</div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid var(--border)", fontSize: 12, fontWeight: 600 }}>
              {initial.primaryModalityLabel}
            </span>
            <Link
              href={planName ? "/dashboard/financeiro" : "/escolher-plano"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 999,
                backgroundColor: planName ? "var(--primary)" : "transparent",
                border: planName ? "none" : "1px dashed var(--border)",
                color: planName ? "#fff" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Sparkles size={12} aria-hidden />
              {planName ?? (pt ? "Sem plano" : "No plan")}
            </Link>
            {memberSince ? (
              <span style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
                {pt ? "Desde" : "Since"} {memberSince}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/dashboard/documentos-adesao"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            color: documentsDone ? "var(--success)" : "var(--warning)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {documentsDone ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
          {documentsDone ? (pt ? "Documentos em dia" : "Documents up to date") : pt ? "Documentos em falta" : "Documents missing"}
        </Link>
      </section>

      {/* Atalhos para as secções */}
      <nav
        aria-label={pt ? "Secções do perfil" : "Profile sections"}
        className="swipe-carousel-scroll"
        style={{ display: "flex", gap: 8, overflowX: "auto" }}
      >
        {sections.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {sec.icon}
            {sec.label}
          </a>
        ))}
      </nav>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div className="perfil-stack" style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div id="dados" className="perfil-anchor">
            <PerfilForm initial={initial} locale={locale as "pt" | "en"} />
          </div>
        </div>
        <div className="perfil-stack" style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div id="convidar" className="perfil-anchor">
            <ReferralInviteSection
              referralLink={referralLink}
              invitedCount={invitedCount ?? 0}
              convertedCount={convertedCount}
              locale={locale as "pt" | "en"}
            />
          </div>
          <div id="cartao" className="perfil-anchor">
            <FighterCardSection
              studentId={studentId}
              initialEnabled={Boolean((profile as { fighterCardPublic?: boolean } | undefined)?.fighterCardPublic)}
              eligibleAge={fighterCardEligibleAge}
              cardUrl={fighterCardUrl}
              imageUrl={fighterCardImageUrl}
              locale={locale as "pt" | "en"}
            />
          </div>
          {mainCoachId && mainCoachName ? (
            <div id="testemunho" className="perfil-anchor">
              <CoachTestimonialSection
                coachId={mainCoachId}
                coachName={mainCoachName}
                existing={existingTestimonial}
                locale={locale as "pt" | "en"}
              />
            </div>
          ) : null}
          <div id="documentos" className="perfil-anchor">
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
          </div>
          <div id="seguranca" className="perfil-anchor perfil-stack" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ChangePasswordSection email={initial.email} locale={locale as "pt" | "en"} />
            <PushNotificationToggle locale={locale as "pt" | "en"} />
            <DeleteAccountSection locale={locale as "pt" | "en"} />
          </div>
        </div>
      </div>
    </div>
  );
}
