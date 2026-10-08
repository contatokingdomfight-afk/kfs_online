import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarCheck, Gift, MessageCircle, Percent, Sparkles, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getPlanAccess } from "@/lib/plan-access";
import { requirePlan } from "@/lib/require-plan";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";

type Benefit = { icon: ReactNode; bg: string; fg: string; title: string; body: string };

export default async function BeneficiosPage() {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);

  if (!studentId || !planAccess.hasExclusiveBenefits) {
    redirect("/dashboard");
  }

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const pt = locale !== "en";
  const t = getTranslations(locale);

  const benefits: Benefit[] = pt
    ? [
        { icon: <Gift size={24} />, bg: "rgba(193,18,31,0.16)", fg: "#f87171", title: "Brindes exclusivos", body: "Ofertas da escola só para quem tem o teu plano." },
        { icon: <Percent size={24} />, bg: "rgba(250,204,21,0.16)", fg: "#facc15", title: "Descontos em eventos", body: "Preço especial em workshops, seminários e camps." },
        { icon: <CalendarCheck size={24} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", title: "Prioridade nas inscrições", body: "Garante o teu lugar antes de abrirem a todos." },
        { icon: <Star size={24} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", title: "Outras vantagens", body: "Novidades e benefícios conforme a disponibilidade." },
      ]
    : [
        { icon: <Gift size={24} />, bg: "rgba(193,18,31,0.16)", fg: "#f87171", title: "Exclusive gifts", body: "School gifts only for members on your plan." },
        { icon: <Percent size={24} />, bg: "rgba(250,204,21,0.16)", fg: "#facc15", title: "Event discounts", body: "Special prices on workshops, seminars and camps." },
        { icon: <CalendarCheck size={24} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", title: "Priority registration", body: "Secure your spot before it opens to everyone." },
        { icon: <Star size={24} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", title: "More perks", body: "New benefits as they become available." },
      ];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>
          {t("navExclusiveBenefits")}
        </h1>
      </header>

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", display: "flex", alignItems: "center", gap: 16, borderColor: "var(--primary)" }}>
        <span aria-hidden style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 16, backgroundColor: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={28} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 21px)", fontWeight: 800 }}>
            {pt ? "Vantagens do teu plano" : "Your plan's perks"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {pt
              ? "O teu plano inclui brindes e benefícios exclusivos da Kingdom."
              : "Your plan includes exclusive Kingdom gifts and benefits."}
          </p>
        </div>
      </section>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
        {benefits.map((b) => (
          <li key={b.title} className="card" style={{ padding: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span aria-hidden style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, backgroundColor: b.bg, color: b.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {b.icon}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{b.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>{b.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <MessageCircle size={22} color="var(--primary)" aria-hidden />
        <span style={{ flex: 1, fontSize: 14, color: "var(--text-secondary)" }}>
          {pt
            ? "Para saber o que está disponível agora, fala com a secretaria ou com o teu coach."
            : "To find out what's available now, speak with the front desk or your coach."}
        </span>
      </div>
    </div>
  );
}
