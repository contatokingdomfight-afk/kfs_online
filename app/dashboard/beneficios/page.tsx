import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getPlanAccess } from "@/lib/plan-access";
import { requirePlan } from "@/lib/require-plan";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import Link from "next/link";

export default async function BeneficiosPage() {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);

  if (!studentId || !planAccess.hasExclusiveBenefits) {
    redirect("/dashboard");
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 700, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        {t("navExclusiveBenefits")}
      </h1>
      <p style={{ fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)", marginBottom: 24 }}>
        {locale === "pt"
          ? "O teu plano Kingdom FULL inclui brindes e benefícios exclusivos. Contacta a secretaria para mais informações sobre o que está disponível para ti."
          : "Your Kingdom FULL plan includes exclusive gifts and benefits. Contact the office for more information on what is available for you."}
      </p>
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
          {locale === "pt" ? "O que inclui" : "What's included"}
        </h2>
        <ul style={{ listStyle: "disc", paddingLeft: 20, margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {locale === "pt" ? (
            <>
              <li>Brindes exclusivos da escola</li>
              <li>Descontos em eventos e workshops</li>
              <li>Prioridade em inscrições</li>
              <li>Outros benefícios conforme disponibilidade</li>
            </>
          ) : (
            <>
              <li>Exclusive school gifts</li>
              <li>Discounts on events and workshops</li>
              <li>Priority registration</li>
              <li>Other benefits as available</li>
            </>
          )}
        </ul>
        <p style={{ marginTop: 16, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {locale === "pt"
            ? "Para mais detalhes, fala com a equipa ou com o teu coach."
            : "For more details, speak with the team or your coach."}
        </p>
      </div>
      <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: "none", marginTop: 24, display: "inline-block" }}>
        {locale === "pt" ? "← Voltar ao início" : "← Back to home"}
      </Link>
    </div>
  );
}
