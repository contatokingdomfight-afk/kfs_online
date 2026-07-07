import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCachedLocations, getCachedModalityRefs, getCachedSchools } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

export type PublicScheduleLesson = {
  id: string;
  modality: string;
  modalityLabel: string;
  weekday: number;
  startTime: string;
  endTime: string;
  locationName: string | null;
};

export type PublicSchoolSchedule = {
  schoolId: string;
  schoolName: string;
  lessonsByWeekday: Record<number, PublicScheduleLesson[]>;
};

export const PUBLIC_SCHEDULE_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function weekdayLabelForPublicSchedule(weekday: number, locale: "pt" | "en"): string {
  const pt = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const en = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const labels = locale === "en" ? en : pt;
  return labels[weekday] ?? "";
}

export function weekdayShortLabelForPublicSchedule(weekday: number, locale: "pt" | "en"): string {
  const pt = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const en = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const labels = locale === "en" ? en : pt;
  return labels[weekday] ?? "";
}

async function fetchPublicWeeklySchedule(): Promise<PublicSchoolSchedule[]> {
  const result = getAdminClientOrNull();
  if (!result.client) return [];
  const supabase = result.client;

  const [schools, modalities, locations, lessonsRes] = await Promise.all([
    getCachedSchools(supabase),
    getCachedModalityRefs(supabase),
    getCachedLocations(supabase),
    supabase
      .from("Lesson")
      .select("id, modality, weekday, startTime, endTime, schoolId, locationId, isOneOff")
      .eq("isOneOff", false)
      .not("weekday", "is", null)
      .order("startTime", { ascending: true }),
  ]);

  const modalityLabelByCode = new Map((modalities ?? []).map((m) => [m.code, m.name]));
  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const schoolIds = new Set(schools.map((s) => s.id));

  const emptyWeek = (): Record<number, PublicScheduleLesson[]> =>
    Object.fromEntries(PUBLIC_SCHEDULE_WEEKDAYS.map((w) => [w, []])) as Record<number, PublicScheduleLesson[]>;

  const bySchool = new Map<string, PublicSchoolSchedule>();
  for (const school of schools) {
    bySchool.set(school.id, {
      schoolId: school.id,
      schoolName: school.name,
      lessonsByWeekday: emptyWeek(),
    });
  }

  for (const row of lessonsRes.data ?? []) {
    const r = row as {
      id: string;
      modality: string;
      weekday: number | null;
      startTime: string;
      endTime: string;
      schoolId?: string;
      locationId?: string | null;
    };
    if (!r.schoolId || !schoolIds.has(r.schoolId)) continue;
    const wd = r.weekday;
    if (wd == null || wd < 1 || wd > 7) continue;

    const sched = bySchool.get(r.schoolId);
    if (!sched) continue;

    sched.lessonsByWeekday[wd].push({
      id: r.id,
      modality: r.modality,
      modalityLabel: modalityLabelByCode.get(r.modality) ?? MODALITY_LABELS[r.modality] ?? r.modality,
      weekday: wd,
      startTime: r.startTime,
      endTime: r.endTime,
      locationName: r.locationId ? (locationById.get(r.locationId) ?? null) : null,
    });
  }

  return schools.map((s) => bySchool.get(s.id)!);
}

/** Grade semanal recorrente (Lesson.weekday) — mesma fonte que Admin → Turmas. */
export async function loadPublicWeeklySchedule(): Promise<PublicSchoolSchedule[]> {
  return unstable_cache(fetchPublicWeeklySchedule, ["public-weekly-schedule-v1"], {
    revalidate: 300,
    tags: ["public-weekly-schedule"],
  })();
}

/** Chamar após criar/editar/apagar aulas na agenda. */
export function revalidatePublicWeeklySchedule() {
  revalidateTag("public-weekly-schedule");
  revalidatePath("/");
  revalidatePath("/aula-experimental");
}
