import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArbitrationJudgeRow } from "./types";

export type StaffJudgeCandidate = {
  userId: string;
  displayName: string;
  roleLabel: string;
};

function displayNameFromUser(user: { name: string | null; email: string | null }): string {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] ?? email;
  return "Utilizador";
}

/** Professores activos, assistentes activos e admins da plataforma. */
export async function listStaffJudgeCandidates(
  supabase: SupabaseClient
): Promise<StaffJudgeCandidate[]> {
  const byUserId = new Map<string, StaffJudgeCandidate>();

  const add = (user: { id: string; name: string | null; email: string | null }, roleLabel: string) => {
    if (!user.id) return;
    const existing = byUserId.get(user.id);
    if (existing) {
      if (existing.roleLabel !== roleLabel && !existing.roleLabel.includes(roleLabel)) {
        byUserId.set(user.id, {
          ...existing,
          roleLabel: `${existing.roleLabel} · ${roleLabel}`,
        });
      }
      return;
    }
    byUserId.set(user.id, {
      userId: user.id,
      displayName: displayNameFromUser(user),
      roleLabel,
    });
  };

  const { data: admins } = await supabase.from("User").select("id, name, email").eq("role", "ADMIN");
  for (const user of admins ?? []) {
    add(user, "Admin");
  }

  const { data: coaches } = await supabase.from("Coach").select("userId").eq("is_active", true);
  const coachUserIds = [...new Set((coaches ?? []).map((c) => c.userId).filter(Boolean))] as string[];
  if (coachUserIds.length > 0) {
    const { data: coachUsers } = await supabase
      .from("User")
      .select("id, name, email")
      .in("id", coachUserIds);
    for (const user of coachUsers ?? []) {
      add(user, "Professor");
    }
  }

  const { data: assistants } = await supabase
    .from("SchoolAssistantCoach")
    .select("studentId")
    .is("revokedAt", null);
  const studentIds = [...new Set((assistants ?? []).map((a) => a.studentId).filter(Boolean))] as string[];
  if (studentIds.length > 0) {
    const { data: students } = await supabase.from("Student").select("userId").in("id", studentIds);
    const assistantUserIds = [...new Set((students ?? []).map((s) => s.userId).filter(Boolean))] as string[];
    if (assistantUserIds.length > 0) {
      const { data: assistantUsers } = await supabase
        .from("User")
        .select("id, name, email")
        .in("id", assistantUserIds);
      for (const user of assistantUsers ?? []) {
        add(user, "Assistente");
      }
    }
  }

  return [...byUserId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt"));
}

/** Garante registo em ArbitrationJudge para cada membro do staff elegível. */
export async function syncStaffArbitrationJudges(supabase: SupabaseClient): Promise<void> {
  const candidates = await listStaffJudgeCandidates(supabase);
  const staffUserIds = new Set(candidates.map((c) => c.userId));

  const { data: existing, error: existingError } = await supabase
    .from("ArbitrationJudge")
    .select("id, userId, displayName, isActive")
    .not("userId", "is", null);

  if (existingError) throw new Error(existingError.message);

  const byUserId = new Map((existing ?? []).map((row) => [row.userId as string, row]));

  for (const candidate of candidates) {
    const row = byUserId.get(candidate.userId);
    if (row) {
      if (row.displayName !== candidate.displayName || row.isActive === false) {
        const { error } = await supabase
          .from("ArbitrationJudge")
          .update({
            displayName: candidate.displayName,
            isActive: true,
          })
          .eq("id", row.id);
        if (error) throw new Error(error.message);
      }
      continue;
    }

    const { error } = await supabase.from("ArbitrationJudge").insert({
      userId: candidate.userId,
      displayName: candidate.displayName,
      isActive: true,
    });
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  for (const row of existing ?? []) {
    if (!row.userId || staffUserIds.has(row.userId) || row.isActive === false) continue;
    const { error } = await supabase.from("ArbitrationJudge").update({ isActive: false }).eq("id", row.id);
    if (error) throw new Error(error.message);
  }
}

export async function listSyncedArbitrationJudges(supabase: SupabaseClient): Promise<ArbitrationJudgeRow[]> {
  await syncStaffArbitrationJudges(supabase);

  const candidates = await listStaffJudgeCandidates(supabase);
  const roleByUserId = new Map(candidates.map((c) => [c.userId, c.roleLabel]));

  const { data, error } = await supabase
    .from("ArbitrationJudge")
    .select("id, displayName, userId")
    .eq("isActive", true)
    .not("userId", "is", null)
    .order("displayName");

  if (error) throw new Error(error.message);

  return (data ?? []).map((j) => ({
    id: j.id,
    displayName: j.displayName,
    userId: j.userId,
    roleLabel: j.userId ? roleByUserId.get(j.userId) ?? null : null,
  }));
}
