import "server-only";

import { getAdminClientOrNull } from "@/lib/supabase/admin";
import type { ArbitrationEventRow, ArbitrationFightListRow, ArbitrationJudgeRow } from "./types";
import { unwrapSupabaseJoin } from "./supabase-join";
import { listSyncedArbitrationJudges } from "./staff-judges";

function clientOrNull() {
  return getAdminClientOrNull().client;
}

export async function listArbitrationEvents(): Promise<ArbitrationEventRow[]> {
  const supabase = clientOrNull();
  if (!supabase) return [];

  const { data } = await supabase
    .from("ArbitrationEvent")
    .select("id, name, eventDate, location, totalRoundsDefault, isActive")
    .eq("isActive", true)
    .order("eventDate", { ascending: false, nullsFirst: false });

  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    eventDate: e.eventDate,
    location: e.location,
    totalRoundsDefault: e.totalRoundsDefault,
    isActive: e.isActive,
  }));
}

export async function listArbitrationJudges(): Promise<ArbitrationJudgeRow[]> {
  const supabase = clientOrNull();
  if (!supabase) return [];
  return listSyncedArbitrationJudges(supabase);
}

export async function listArbitrationFights(options?: {
  status?: string[];
  eventId?: string;
  completedOnly?: boolean;
}): Promise<ArbitrationFightListRow[]> {
  const supabase = clientOrNull();
  if (!supabase) return [];

  let query = supabase
    .from("ArbitrationFight")
    .select(
      `id, eventId, modality, category, weightClass, athleteBlueName, athleteRedName, status, totalRounds, currentRound, sortOrder, winner, decisionType,
       event:ArbitrationEvent(name, eventDate)`
    )
    .order("sortOrder")
    .order("createdAt", { ascending: true });

  if (options?.completedOnly) {
    query = query.eq("status", "COMPLETED");
  } else if (options?.status?.length) {
    query = query.in("status", options.status);
  }

  if (options?.eventId) {
    query = query.eq("eventId", options.eventId);
  }

  const { data } = await query;

  return (data ?? []).map((f) => {
    const event = unwrapSupabaseJoin(
      f.event as { name: string; eventDate: string | null } | { name: string; eventDate: string | null }[] | null
    );
    return {
      id: f.id,
      eventId: f.eventId,
      eventName: event?.name ?? "",
      modality: f.modality,
      category: f.category,
      weightClass: f.weightClass,
      athleteBlueName: f.athleteBlueName,
      athleteRedName: f.athleteRedName,
      status: f.status,
      totalRounds: f.totalRounds,
      currentRound: f.currentRound,
      sortOrder: f.sortOrder,
      winner: f.winner,
      decisionType: f.decisionType,
    };
  });
}

export async function filterFightsByJudge(fightIds: string[], judgeId: string): Promise<Set<string>> {
  const supabase = clientOrNull();
  if (!supabase || fightIds.length === 0) return new Set();

  const { data } = await supabase
    .from("ArbitrationFightJudge")
    .select("fightId")
    .eq("judgeId", judgeId)
    .in("fightId", fightIds);

  return new Set((data ?? []).map((r) => r.fightId as string));
}
