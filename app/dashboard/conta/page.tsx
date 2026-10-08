import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  PlayCircle,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies, getThemeFromCookies } from "@/lib/theme-locale-server";
import { getMembershipDocumentsStatus } from "@/lib/membership-documents-status";
import { getFamilyHubForStudent } from "@/lib/family-group";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarPwaInstall } from "@/components/SidebarPwaInstall";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function Row({ href, icon, label, hint, badge }: { href: string; icon: ReactNode; label: string; hint?: string; badge?: ReactNode }) {
  return (
    <Link
      href={href}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", color: "inherit", minHeight: 52 }}
    >
      <span aria-hidden style={{ color: "var(--text-secondary)", display: "inline-flex" }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{label}</span>
        {hint ? <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{hint}</span> : null}
      </span>
      {badge}
      <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
    </Link>
  );
}

/** «Conta» (mockup): cartão do aluno, atalhos grandes, lista do resto e preferências. */
export default async function ContaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const [locale, theme] = await Promise.all([getLocaleFromCookies(), getThemeFromCookies()]);
  const loc = locale === "en" ? "en" : "pt";
  const pt = loc === "pt";
  const supabase = await createClient();

  const [{ data: student }, docs, family, assistant, { count: unread }] = await Promise.all([
    supabase.from("Student").select("planId").eq("id", studentId).maybeSingle(),
    getMembershipDocumentsStatus(supabase, studentId),
    getFamilyHubForStudent(supabase, studentId).catch(() => null),
    dbUser.role === "ALUNO" ? getActiveSchoolAssistantForUserId(supabase, dbUser.id).catch(() => null) : Promise.resolve(null),
    supabase.from("Notification").select("id", { count: "exact", head: true }).eq("studentId", studentId).is("read_at", null),
  ]);
  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const { data: plan } = planId ? await supabase.from("Plan").select("name").eq("id", planId).maybeSingle() : { data: null };
  const planName = (plan as { name?: string } | null)?.name ?? null;
  const name = dbUser.name?.trim() || dbUser.email || "";
  const avatarUrl = (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null;
  const unreadCount = unread ?? 0;

  const tiles = [
    { href: "/dashboard/perfil", icon: <UserRound size={24} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", label: pt ? "Perfil" : "Profile", hint: pt ? "Dados e segurança" : "Details & security" },
    { href: "/dashboard/ficha-fisica", icon: <Activity size={24} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", label: pt ? "Ficha física" : "Physical file", hint: pt ? "Medidas e testes" : "Measures & tests" },
    ...(planId
      ? [{ href: "/dashboard/financeiro", icon: <CreditCard size={24} />, bg: "rgba(250,204,21,0.16)", fg: "#facc15", label: pt ? "Plano e pagamentos" : "Plan & payments", hint: planName ?? "" }]
      : [{ href: "/escolher-plano", icon: <Sparkles size={24} />, bg: "rgba(193,18,31,0.16)", fg: "#f87171", label: pt ? "Escolher plano" : "Choose a plan", hint: pt ? "Ver planos" : "See plans" }]),
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800 }}>{pt ? "Conta" : "Account"}</h1>

      {/* Cartão do aluno */}
      <Link href="/dashboard/perfil" style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "inherit" }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar do Supabase Storage
          <img src={avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)", flexShrink: 0 }} />
        ) : (
          <span aria-hidden style={{ width: 64, height: 64, flexShrink: 0, borderRadius: "50%", border: "3px solid var(--primary)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
            {initialsOf(name)}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 18, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dbUser.email}</span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 9px",
                borderRadius: 999,
                background: planName ? "var(--primary)" : "transparent",
                border: planName ? "none" : "1px dashed var(--border)",
                color: planName ? "#fff" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Sparkles size={12} aria-hidden />
              {planName ?? (pt ? "Sem plano" : "No plan")}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: docs.allDone ? "var(--success)" : "var(--warning)" }}>
              {docs.allDone ? <CheckCircle2 size={13} aria-hidden /> : <AlertCircle size={13} aria-hidden />}
              {docs.allDone ? (pt ? "Documentos em dia" : "Documents up to date") : pt ? "Documentos em falta" : "Documents missing"}
            </span>
          </span>
        </span>
        <ChevronRight size={20} color="var(--text-secondary)" aria-hidden />
      </Link>

      {/* Atalhos grandes */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 10 }}>
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            style={{ ...card, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", textDecoration: "none", color: "inherit", minWidth: 0 }}
          >
            <span aria-hidden style={{ width: 46, height: 46, borderRadius: 14, background: tile.bg, color: tile.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tile.icon}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{tile.label}</span>
            {tile.hint ? (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tile.hint}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {/* Resto */}
      <nav aria-label={pt ? "Mais opções da conta" : "More account options"} style={{ ...card, overflow: "hidden" }}>
        {[
          family && (
            <Row
              key="family"
              href="/dashboard/familia"
              icon={<Users size={20} />}
              label={pt ? "Família" : "Family"}
              hint={`${family.members.length} ${pt ? (family.members.length === 1 ? "membro" : "membros") : family.members.length === 1 ? "member" : "members"}`}
            />
          ),
          planId && (
            <Row
              key="docs"
              href={docs.allDone ? "/dashboard/documentos-adesao" : "/adesao"}
              icon={<FileText size={20} />}
              label={pt ? "Documentos de adesão" : "Membership documents"}
              hint={docs.allDone ? (pt ? "Comprovativo, contrato e termo" : "Form, contract and waiver") : pt ? "Falta concluir a adesão" : "Membership not finished"}
            />
          ),
          <Row
            key="notif"
            href="/dashboard/notificacoes"
            icon={<Bell size={20} />}
            label={pt ? "Notificações" : "Notifications"}
            badge={
              unreadCount > 0 ? (
                <span style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 11, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : undefined
            }
          />,
          assistant && (
            <Row key="assistant" href="/coach" icon={<CalendarCheck size={20} />} label={pt ? "Assistente (presenças na escola)" : "Assistant (school check-in)"} />
          ),
          planId && <Row key="tour" href="/dashboard?replayOnboarding=1" icon={<PlayCircle size={20} />} label={pt ? "Rever tour da app" : "Replay app tour"} />,
        ]
          .filter(Boolean)
          .map((row, i) => (
            <div key={i} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              {row}
            </div>
          ))}
      </nav>

      {/* Preferências e sessão */}
      <section aria-label={pt ? "Preferências" : "Preferences"} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
          {pt ? "Preferências" : "Preferences"}
        </h2>
        <ThemeLocaleSwitcher initialTheme={theme} initialLocale={loc} variant="inline" />
        <SidebarPwaInstall locale={loc} />
        <LogoutButton label={pt ? "Terminar sessão" : "Log out"} variant="sidebar" />
      </section>
    </div>
  );
}
