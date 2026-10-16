import type { SupabaseClient } from "@supabase/supabase-js";

/** Preços do Passe Kingdom Academy (EUR). Ajustar aqui; o Stripe recebe-os por checkout (sem produtos pré-criados). */
export const ACADEMY_PASS_PRICES = { month: 12, year: 99 } as const;
export type AcademyPassInterval = keyof typeof ACADEMY_PASS_PRICES;

/** Percentagem do professor quando o curso não define outra. */
export const DEFAULT_CREATOR_PCT = 60;

export type AcademyCourse = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  modality: string | null;
  level: string | null;
  price: number | null;
  available_for_purchase: boolean | null;
  included_in_digital_plan: boolean;
  in_pass: boolean;
  show_in_academy: boolean;
  video_url: string | null;
  creator_student_id: string | null;
};

const COURSE_COLUMNS =
  "id, name, description, category, modality, level, price, available_for_purchase, included_in_digital_plan, in_pass, show_in_academy, video_url, creator_student_id";

/** Cursos públicos: ativos, aprovados e com «mostrar na Academy» ligado (`includeHidden` para checkout e acessos já existentes). */
export async function loadPublicCourses(admin: SupabaseClient, opts: { courseId?: string; includeHidden?: boolean } = {}): Promise<AcademyCourse[]> {
  let q = admin
    .from("Course")
    .select(COURSE_COLUMNS)
    .eq("is_active", true)
    .eq("review_status", "PUBLISHED")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (!opts.includeHidden) q = q.eq("show_in_academy", true);
  if (opts.courseId) q = q.eq("id", opts.courseId);
  const { data, error } = await q;
  if (error) console.error("[academy] loadPublicCourses falhou (migração 20261016160000 aplicada?):", error.message);
  return ((data ?? []) as Array<Omit<AcademyCourse, "price"> & { price: number | string | null }>).map((c) => ({
    ...c,
    price: c.price != null ? Number(c.price) : null,
  }));
}

export async function hasActiveAcademyPass(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("AcademyPass")
    .select("status, currentPeriodEnd")
    .eq("userId", userId)
    .maybeSingle();
  const row = data as { status: string; currentPeriodEnd: string | null } | null;
  if (!row) return false;
  if (row.status !== "active" && row.status !== "trialing") return false;
  return !row.currentPeriodEnd || new Date(row.currentPeriodEnd).getTime() > Date.now();
}

export async function loadPurchasedCourseIds(admin: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await admin.from("CoursePurchase").select("courseId").eq("userId", userId).eq("status", "PAID");
  return new Set((data ?? []).map((r) => (r as { courseId: string }).courseId));
}

/** O aluno tem plano com acesso à biblioteca digital? (mesma regra da biblioteca do aluno) */
export async function studentHasDigitalPlan(admin: SupabaseClient, studentId: string | null): Promise<boolean> {
  if (!studentId) return false;
  const { data: student } = await admin.from("Student").select("planId").eq("id", studentId).maybeSingle();
  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  if (!planId) return false;
  const { data: plan } = await admin.from("Plan").select("includesDigitalAccess").eq("id", planId).eq("isActive", true).maybeSingle();
  return (plan as { includesDigitalAccess?: boolean } | null)?.includesDigitalAccess === true;
}

export type AcademyAccess = {
  purchased: Set<string>;
  pass: boolean;
  digitalPlan: boolean;
};

export async function loadAcademyAccess(admin: SupabaseClient, userId: string | null, studentId: string | null): Promise<AcademyAccess> {
  if (!userId) return { purchased: new Set(), pass: false, digitalPlan: false };
  const [purchased, pass, digitalPlan] = await Promise.all([
    loadPurchasedCourseIds(admin, userId),
    hasActiveAcademyPass(admin, userId),
    studentHasDigitalPlan(admin, studentId),
  ]);
  return { purchased, pass, digitalPlan };
}

export type CourseAccessReason = "purchased" | "plan" | "pass" | null;

export function courseAccessReason(course: Pick<AcademyCourse, "id" | "included_in_digital_plan" | "in_pass">, a: AcademyAccess): CourseAccessReason {
  if (a.purchased.has(course.id)) return "purchased";
  if (course.included_in_digital_plan && a.digitalPlan) return "plan";
  if (course.in_pass && a.pass) return "pass";
  return null;
}

export function canBuyCourse(c: Pick<AcademyCourse, "price" | "available_for_purchase">): boolean {
  return Boolean(c.available_for_purchase) && c.price != null && c.price > 0;
}
