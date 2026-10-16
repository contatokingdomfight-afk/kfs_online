import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { canBuyCourse, courseAccessReason, loadAcademyAccess, loadPublicCourses } from "@/lib/academy/access";
import { AcademyCheckoutButton } from "@/components/academy/CheckoutButton";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { CourseContentViewer } from "@/app/dashboard/biblioteca/CourseContentViewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ pago?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = getAdminClientOrNull().client;
  const [c] = admin ? await loadPublicCourses(admin, { courseId: id }) : [];
  return c
    ? { title: `${c.name} | Kingdom Academy`, description: c.description ?? undefined, alternates: { canonical: `/academy/${id}` } }
    : { title: "Kingdom Academy" };
}

type Unit = { id: string; module_id: string; name: string; description: string | null; content_type: string; video_url: string | null; text_content: string | null; pdf_url: string | null; sort_order: number };

function euro(n: number): string {
  return `€${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")}`;
}

export default async function AcademyCursoPage({ params, searchParams }: Props) {
  const [{ id }, { pago }] = await Promise.all([params, searchParams]);
  const admin = getAdminClientOrNull().client;
  if (!admin) notFound();
  const [course] = await loadPublicCourses(admin, { courseId: id, includeHidden: true });
  if (!course) notFound();

  const user = await getCurrentDbUser();
  const studentId = user ? await getCurrentStudentId() : null;
  const access = await loadAcademyAccess(admin, user?.id ?? null, studentId);
  const reason = courseAccessReason(course, access);
  if (!course.show_in_academy && !reason) notFound();
  const here = `/academy/${id}`;

  const { data: mods } = await admin
    .from("CourseModule")
    .select("id, name, description, video_url, sort_order")
    .eq("course_id", id)
    .eq("status", "PUBLISHED")
    .order("sort_order", { ascending: true });
  const moduleList = (mods ?? []) as { id: string; name: string; description: string | null; video_url: string | null; sort_order: number }[];
  const moduleIds = moduleList.map((m) => m.id);
  const unitsByModule: Record<string, Unit[]> = {};
  if (reason && moduleIds.length > 0) {
    const { data: units } = await admin
      .from("CourseUnit")
      .select("id, module_id, name, description, content_type, video_url, text_content, pdf_url, sort_order")
      .in("module_id", moduleIds)
      .eq("status", "PUBLISHED");
    for (const u of (units ?? []) as Unit[]) (unitsByModule[u.module_id] ??= []).push(u);
    for (const list of Object.values(unitsByModule)) list.sort((a, b) => a.sort_order - b.sort_order);
  }

  let completedUnitIds: string[] = [];
  let completedModuleIds: string[] = [];
  if (reason && studentId) {
    const [{ data: up }, { data: mp }] = await Promise.all([
      admin.from("CourseUnitProgress").select("unit_id").eq("student_id", studentId),
      admin.from("CourseProgress").select("module_id").eq("student_id", studentId),
    ]);
    completedUnitIds = (up ?? []).map((r) => (r as { unit_id: string }).unit_id);
    completedModuleIds = (mp ?? []).map((r) => (r as { module_id: string }).module_id);
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn={Boolean(user)} section="academy" crumb={course.name} />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {pago === "1" && !reason ? (
          <div role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(250,204,21,0.14)", border: "1px solid var(--warning)", fontSize: 14 }}>
            Pagamento recebido! O acesso fica ativo em instantes. Atualiza a página se ainda não vires as aulas.
          </div>
        ) : null}
        <header>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 800 }}>{course.name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            {[course.modality, course.level].filter(Boolean).join(" · ")}
          </p>
          {course.description ? <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{course.description}</p> : null}
        </header>

        {reason ? (
          <CourseContentViewer
            courseId={course.id}
            moduleList={moduleList}
            unitsByModule={unitsByModule}
            completedUnitIds={completedUnitIds}
            completedModuleIds={completedModuleIds}
            studentId={studentId}
            videoComingSoon="Vídeo em breve."
            completePreviousUnit="Conclui a aula anterior."
            videoUnavailable="Vídeo indisponível."
          />
        ) : (
          <>
            <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {canBuyCourse(course) ? (
                <>
                  <strong style={{ fontSize: 24 }}>{euro(course.price ?? 0)}</strong>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pagamento único · acesso para sempre</span>
                </>
              ) : null}
              {!user ? (
                <>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Para comprar e ver as aulas é preciso ter conta e entrar. Voltas automaticamente a este curso.</p>
                  <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="btn btn-primary" style={{ minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, textDecoration: "none" }}>
                    Entrar para comprar
                  </Link>
                  <Link href={`/sign-up?next=${encodeURIComponent(here)}`} style={{ textAlign: "center", fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
                    Ainda não tenho conta
                  </Link>
                </>
              ) : (
                <>
                  {canBuyCourse(course) ? <AcademyCheckoutButton kind="course" courseId={course.id} label="Comprar curso" /> : null}
                  {course.in_pass ? (
                    <Link href="/academy/planos" className="btn" style={{ minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontWeight: 700 }}>
                      Ou subscrever o Passe
                    </Link>
                  ) : null}
                  {!canBuyCourse(course) && !course.in_pass ? (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                      {course.included_in_digital_plan ? "Este curso está incluído nos planos de aluno Kingdom." : "Este curso não está disponível de momento."}
                    </p>
                  ) : null}
                </>
              )}
              {course.included_in_digital_plan ? (
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>Alunos Kingdom com plano ativo têm este curso incluído.</p>
              ) : null}
            </section>

            <section aria-label="Conteúdo do curso" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Conteúdo</h2>
              {moduleList.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Conteúdo em preparação.</p>
              ) : (
                moduleList.map((m, i) => (
                  <div key={m.id} className="card" style={{ padding: "10px 14px", fontSize: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span>
                      {i + 1} · {m.name}
                    </span>
                    <span aria-hidden style={{ color: "var(--text-secondary)" }}>🔒</span>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
