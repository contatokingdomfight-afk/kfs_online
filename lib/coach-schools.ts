import type { SupabaseClient } from "@supabase/supabase-js";

/** True se o coach está associado a esta escola (pode lecionar aí). */
export async function coachTeachesAtSchool(
  supabase: SupabaseClient,
  coachId: string,
  schoolId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("CoachSchool")
    .select("schoolId")
    .eq("coachId", coachId)
    .eq("schoolId", schoolId)
    .maybeSingle();
  return data != null;
}

export async function getCoachSchoolIds(supabase: SupabaseClient, coachId: string): Promise<string[]> {
  const { data } = await supabase.from("CoachSchool").select("schoolId").eq("coachId", coachId);
  return (data ?? []).map((r) => r.schoolId);
}
