import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { courseAccessReason, loadAcademyAccess, loadPublicCourses, type CourseAccessReason } from "@/lib/academy/access";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus cursos | Kingdom Academy", robots: { index: false } };

const REASON_LABEL: Record<Exclude<CourseAccessReason, null>, string> = {
  purchased: "Comprado",
  plan: "Incluído no teu plano",
  pass: "Incluído no Passe",
};

export default async function AcademyMeusCursosPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/academy/meus-cursos")}`);
  const admin = getAdminClientOrNull().client;
  const studentId = await getCurrentStudentId();
  const courses = admin ? await loadPublicCourses(admin) : [];
  const access = admin ? await loadAcademyAccess(admin, user.id, studentId) : { purchased: new Set<string>(), pass: false, digitalPlan: false };
  const mine = courses.flatMap((c) => {
    const reason = courseAccessReason(c, access);
    return reason ? [{ course: c, reason }] : [];
  });

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn section="academy" crumb="Meus cursos" />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Meus cursos</h1>
        {access.pass ? <p style={{ margin: 0, fontSize: 13, color: "var(--success)", fontWeight: 700 }}>O teu Passe está ativo.</p> : null}
        {mine.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Ainda não tens cursos. <Link href="/academy" style={{ color: "var(--primary)", fontWeight: 600 }}>Ver o catálogo</Link>
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {mine.map(({ course, reason }) => (
              <li key={course.id}>
                <Link href={`/academy/${course.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none", color: "var(--text-primary)" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{course.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{course.modality ?? ""}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--success)", whiteSpace: "nowrap" }}>{REASON_LABEL[reason]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
