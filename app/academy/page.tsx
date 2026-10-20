import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Gauge, Swords } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { canBuyCourse, courseAccessReason, loadAcademyAccess, loadCourseThumbnails, loadPublicCourses, type AcademyCourse } from "@/lib/academy/access";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kingdom Academy | Kingdom Fight School",
  description: "Cursos online de Muay Thai, Boxe, Jiu-Jitsu, MMA e preparação física pelos professores da Kingdom Fight School.",
  alternates: { canonical: "/academy" },
};

const CATEGORY_LABEL: Record<string, string> = { TECHNIQUE: "Técnica", MINDSET: "Mentalidade", PERFORMANCE: "Performance" };
const COVER: Record<string, string> = {
  TECHNIQUE: "linear-gradient(135deg, #0c2340 0%, #1e3a8a 100%)",
  MINDSET: "linear-gradient(135deg, #1e1b3a 0%, #312e5f 100%)",
  PERFORMANCE: "linear-gradient(135deg, #3a1d0a 0%, #7c2d12 100%)",
};

function euro(n: number): string {
  return `€${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")}`;
}

function Cover({ c, thumb }: { c: AcademyCourse; thumb?: string | null }) {
  const Icon = c.category === "MINDSET" ? Brain : c.category === "PERFORMANCE" ? Gauge : Swords;
  return (
    <div style={{ position: "relative", height: 130, background: COVER[c.category] ?? COVER.TECHNIQUE, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura externa do YouTube
        <img src={thumb} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Icon size={42} aria-hidden />
      )}
    </div>
  );
}

export default async function AcademyPage({ searchParams }: { searchParams: Promise<{ cat?: string; passe?: string }> }) {
  const { cat, passe } = await searchParams;
  const admin = getAdminClientOrNull().client;
  const user = await getCurrentDbUser();
  const studentId = user ? await getCurrentStudentId() : null;
  const courses = admin ? await loadPublicCourses(admin) : [];
  const thumbs = admin ? await loadCourseThumbnails(admin, courses) : {};
  const access = admin ? await loadAcademyAccess(admin, user?.id ?? null, studentId) : { purchased: new Set<string>(), pass: false, digitalPlan: false };
  const activeCat = cat && CATEGORY_LABEL[cat] ? cat : null;
  const shown = activeCat ? courses.filter((c) => c.category === activeCat) : courses;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn={Boolean(user)} section="academy" />
      <section style={{ padding: "36px 16px", background: "linear-gradient(135deg, #0c2340 0%, var(--bg) 70%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1072, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(24px, 6vw, 34px)", fontWeight: 800 }}>Kingdom Academy</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--text-secondary)", maxWidth: 560 }}>
            Aprende com os professores da Kingdom: técnica, preparação física e mentalidade. Vê as aulas de pré-visualização sem pagar.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/academy/planos" className="btn btn-primary" style={{ textDecoration: "none", fontWeight: 700 }}>
              Ver o Passe
            </Link>
            {!user ? (
              <Link href="/sign-in?next=/academy" className="btn" style={{ textDecoration: "none" }}>
                Entrar
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1072, margin: "0 auto", padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {passe === "ok" ? (
          <div role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(74,222,128,0.12)", border: "1px solid var(--success)", fontSize: 14, fontWeight: 700 }}>
            Obrigado! O teu Passe fica ativo em instantes. Se ainda não vires o acesso, atualiza a página.
          </div>
        ) : null}
        <p style={{ margin: 0, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--success)", background: "rgba(34,197,94,0.08)", fontSize: 13 }}>
          Alunos Kingdom com plano ativo têm os cursos incluídos sem custo. <Link href="/sign-in?next=/academy" style={{ color: "var(--primary)", fontWeight: 700 }}>Entrar para ver o teu acesso</Link>
        </p>
        <nav aria-label="Categorias" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {[null, ...Object.keys(CATEGORY_LABEL)].map((c) => {
            const on = c === activeCat;
            return (
              <Link
                key={c ?? "all"}
                href={c ? `/academy?cat=${c}` : "/academy"}
                style={{
                  flexShrink: 0,
                  height: 36,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0 14px",
                  borderRadius: 999,
                  border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
                  background: on ? "var(--text-primary)" : "transparent",
                  color: on ? "var(--bg)" : "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {c ? CATEGORY_LABEL[c] : "Tudo"}
              </Link>
            );
          })}
        </nav>

        {shown.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Ainda não há cursos nesta categoria. Volta em breve.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
            {shown.map((c) => {
              const reason = courseAccessReason(c, access);
              return (
                <li key={c.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <Link href={`/academy/${c.id}`} style={{ color: "inherit", textDecoration: "none", display: "flex", flexDirection: "column" }}>
                    <Cover c={c} thumb={thumbs[c.id]} />
                    <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {CATEGORY_LABEL[c.category] ?? c.category}
                        {c.modality ? ` · ${c.modality}` : ""}
                      </span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: reason ? "var(--success)" : c.included_in_digital_plan ? "var(--success)" : c.in_pass ? "var(--warning)" : "var(--text-secondary)" }}>
                          {reason ? "Tens acesso" : c.included_in_digital_plan ? "Incluído para alunos" : c.in_pass ? "No Passe" : ""}
                        </span>
                        {canBuyCourse(c) ? <span style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>{euro(c.price ?? 0)}</span> : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
