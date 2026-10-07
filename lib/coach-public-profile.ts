import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRankInfoForStudent } from "@/lib/get-rank-info";
import { getBeltName } from "@/lib/belts";
import { loadDisplayGrade } from "@/lib/graduation/display-grade";

export type CoachTestimonialPublic = {
  id: string;
  studentFirstName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type CoachPublicProfileData = {
  coachId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  instagramHandle: string | null;
  facebookUrl: string | null;
  schoolNames: string[];
  beltName: string | null;
  currentStudentCount: number;
  lessonsTaughtCount: number;
  testimonials: CoachTestimonialPublic[];
  averageRating: number | null;
  memberSinceLabel: string;
};

export type CoachPublicProfileResult =
  | { ok: true; data: CoachPublicProfileData }
  | { ok: false; reason: "not_found" | "not_public" | "not_active" };

const MONTH_LABELS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function memberSinceLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTH_LABELS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Conta aulas (ocorrências com presença confirmada) lecionadas por este coach, como principal ou coadjuvante. */
async function countLessonsTaught(supabase: SupabaseClient, coachId: string): Promise<number> {
  const [{ data: ownLessons }, { data: coLessons }] = await Promise.all([
    supabase.from("Lesson").select("id").eq("coachId", coachId),
    supabase.from("LessonCoach").select("lessonId").eq("coachId", coachId),
  ]);

  const lessonIds = new Set<string>();
  for (const l of ownLessons ?? []) lessonIds.add(l.id as string);
  for (const l of coLessons ?? []) lessonIds.add(l.lessonId as string);
  if (lessonIds.size === 0) return 0;

  const { data: attendances } = await supabase
    .from("Attendance")
    .select("lessonId, occurrenceDate")
    .in("lessonId", [...lessonIds])
    .eq("status", "CONFIRMED");

  const occurrences = new Set<string>();
  for (const a of attendances ?? []) {
    occurrences.add(`${a.lessonId}::${a.occurrenceDate}`);
  }
  return occurrences.size;
}

/**
 * Dados do perfil público de um treinador — usado pela página pública.
 * Aplica sempre as regras de elegibilidade no servidor: só coaches ativos com
 * `publicProfileEnabled = true`.
 */
export async function getCoachPublicProfileData(
  supabase: SupabaseClient,
  coachId: string
): Promise<CoachPublicProfileResult> {
  const { data: coach } = await supabase
    .from("Coach")
    .select(
      "id, userId, studentId, specialties, bio, yearsExperience, instagramHandle, facebookUrl, publicProfileEnabled, is_active, createdAt"
    )
    .eq("id", coachId)
    .maybeSingle();

  if (!coach) return { ok: false, reason: "not_found" };
  if ((coach as { is_active?: boolean }).is_active === false) return { ok: false, reason: "not_active" };
  if (!(coach as { publicProfileEnabled?: boolean }).publicProfileEnabled) return { ok: false, reason: "not_public" };

  const studentId = (coach as { studentId?: string | null }).studentId ?? null;

  const [{ data: user }, { data: coachSchools }, rankInfo, currentStudents, lessonsTaughtCount, testimonialRows, grade] =
    await Promise.all([
      supabase.from("User").select("name, avatarUrl").eq("id", coach.userId).maybeSingle(),
      supabase.from("CoachSchool").select("schoolId").eq("coachId", coachId),
      studentId ? getRankInfoForStudent(supabase, studentId) : Promise.resolve(null),
      supabase.from("Athlete").select("id", { count: "exact", head: true }).eq("mainCoachId", coachId),
      countLessonsTaught(supabase, coachId),
      supabase
        .from("CoachTestimonial")
        .select("id, studentId, rating, body, createdAt")
        .eq("coachId", coachId)
        .eq("status", "APPROVED")
        .order("createdAt", { ascending: false })
        .limit(20),
      studentId ? loadDisplayGrade(studentId) : Promise.resolve(null),
    ]);

  const schoolIds = [...new Set((coachSchools ?? []).map((r) => r.schoolId as string))];
  const { data: schools } =
    schoolIds.length > 0 ? await supabase.from("School").select("name").in("id", schoolIds) : { data: [] };

  const testimonialStudentIds = [...new Set((testimonialRows.data ?? []).map((t) => t.studentId as string))];
  const studentNameById = new Map<string, string>();
  if (testimonialStudentIds.length > 0) {
    const { data: testimonialStudents } = await supabase
      .from("Student")
      .select("id, userId")
      .in("id", testimonialStudentIds);
    const userIds = (testimonialStudents ?? []).map((s) => s.userId as string);
    const { data: testimonialUsers } = userIds.length
      ? await supabase.from("User").select("id, name").in("id", userIds)
      : { data: [] };
    const nameByUserId = new Map((testimonialUsers ?? []).map((u) => [u.id as string, u.name as string | null]));
    for (const s of testimonialStudents ?? []) {
      const fullName = nameByUserId.get(s.userId as string) ?? "";
      studentNameById.set(s.id as string, fullName.trim().split(/\s+/)[0] || "Aluno Kingdom");
    }
  }

  const testimonials: CoachTestimonialPublic[] = (testimonialRows.data ?? []).map((t) => ({
    id: t.id as string,
    studentFirstName: studentNameById.get(t.studentId as string) ?? "Aluno Kingdom",
    rating: t.rating as number,
    body: t.body as string,
    createdAt: t.createdAt as string,
  }));

  const averageRating =
    testimonials.length > 0
      ? Math.round((testimonials.reduce((acc, t) => acc + t.rating, 0) / testimonials.length) * 10) / 10
      : null;

  const specialties = ((coach as { specialties?: string | null }).specialties ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ok: true,
    data: {
      coachId,
      name: (user as { name?: string | null } | null)?.name?.trim() || "Treinador Kingdom",
      avatarUrl: (user as { avatarUrl?: string | null } | null)?.avatarUrl ?? null,
      bio: (coach as { bio?: string | null }).bio ?? null,
      specialties,
      yearsExperience: (coach as { yearsExperience?: number | null }).yearsExperience ?? null,
      instagramHandle: (coach as { instagramHandle?: string | null }).instagramHandle ?? null,
      facebookUrl: (coach as { facebookUrl?: string | null }).facebookUrl ?? null,
      schoolNames: (schools ?? []).map((s) => s.name as string),
      // Grau de graduação quando publicado (sem grau = não mostra); senão a faixa antiga por XP.
      beltName: grade ? grade.gradeName : rankInfo ? getBeltName(rankInfo.displayBeltIndex) : null,
      currentStudentCount: currentStudents.count ?? 0,
      lessonsTaughtCount,
      testimonials,
      averageRating,
      memberSinceLabel: memberSinceLabel((coach as { createdAt?: string | null }).createdAt),
    },
  };
}
