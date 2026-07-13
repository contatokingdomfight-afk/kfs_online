import "server-only";

import { getAdminClientOrNull } from "@/lib/supabase/admin";
import type {
  ArbitrationEventRow,
  ArbitrationFightHistoryRow,
  ArbitrationFightListRow,
  ArbitrationJudgeRow,
  JudgeHistoryCard,
  JudgeHistoryRoundRow,
} from "./types";
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

export async function loadFightJudgeHistory(fightIds: string[]): Promise<Map<string, JudgeHistoryCard[]>> {
  const supabase = clientOrNull();
  const result = new Map<string, JudgeHistoryCard[]>();
  if (!supabase || fightIds.length === 0) return result;

  const { data: fightResults } = await supabase
    .from("ArbitrationFightResult")
    .select(
      `fightId, totalBlueOfficial, totalRedOfficial, winner,
       fightJudge:ArbitrationFightJudge(id, judgeNumber, judge:ArbitrationJudge(displayName))`
    )
    .in("fightId", fightIds);

  const fightJudgeIds = new Set<string>();
  for (const row of fightResults ?? []) {
    const fj = unwrapSupabaseJoin(
      row.fightJudge as
        | { id: string; judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }
        | { id: string; judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }[]
    );
    if (fj?.id) fightJudgeIds.add(fj.id);
  }

  const roundsByFightJudge = new Map<string, JudgeHistoryRoundRow[]>();
  if (fightJudgeIds.size > 0) {
    const { data: rounds } = await supabase
      .from("ArbitrationFightRound")
      .select("id, fightId, roundNumber")
      .in("fightId", fightIds)
      .order("roundNumber");

    const roundMeta = new Map<string, { fightId: string; roundNumber: number }>();
    const roundIds: string[] = [];
    for (const r of rounds ?? []) {
      roundIds.push(r.id as string);
      roundMeta.set(r.id as string, { fightId: r.fightId as string, roundNumber: r.roundNumber as number });
    }

    if (roundIds.length > 0) {
      const { data: evals } = await supabase
        .from("ArbitrationRoundEvaluation")
        .select(
          "fightJudgeId, roundId, blueTotal, redTotal, officialBlueScore, officialRedScore, isLocked"
        )
        .in("roundId", roundIds)
        .in("fightJudgeId", [...fightJudgeIds])
        .eq("isLocked", true);

      for (const ev of evals ?? []) {
        const meta = roundMeta.get(ev.roundId as string);
        if (!meta) continue;
        const fjId = ev.fightJudgeId as string;
        const list = roundsByFightJudge.get(fjId) ?? [];
        list.push({
          roundNumber: meta.roundNumber,
          blueTotal: ev.blueTotal as number | null,
          redTotal: ev.redTotal as number | null,
          officialBlueScore: ev.officialBlueScore as number | null,
          officialRedScore: ev.officialRedScore as number | null,
        });
        roundsByFightJudge.set(fjId, list);
      }
    }
  }

  for (const row of fightResults ?? []) {
    const fightId = row.fightId as string;
    const fj = unwrapSupabaseJoin(
      row.fightJudge as
        | { id: string; judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }
        | { id: string; judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }[]
    );
    if (!fj) continue;
    const judge = unwrapSupabaseJoin(fj.judge ?? null);
    const card: JudgeHistoryCard = {
      judgeNumber: fj.judgeNumber,
      judgeName: judge?.displayName ?? "—",
      totalBlueOfficial: row.totalBlueOfficial as number,
      totalRedOfficial: row.totalRedOfficial as number,
      winner: row.winner as JudgeHistoryCard["winner"],
      rounds: (roundsByFightJudge.get(fj.id) ?? []).sort((a, b) => a.roundNumber - b.roundNumber),
    };
    const cards = result.get(fightId) ?? [];
    cards.push(card);
    result.set(fightId, cards);
  }

  for (const [fightId, cards] of result) {
    cards.sort((a, b) => a.judgeNumber - b.judgeNumber);
    result.set(fightId, cards);
  }

  return result;
}

export async function enrichFightsWithJudgeHistory(
  fights: ArbitrationFightListRow[]
): Promise<ArbitrationFightHistoryRow[]> {
  const judgeMap = await loadFightJudgeHistory(fights.map((f) => f.id));
  return fights.map((f) => ({
    ...f,
    judgeCards: judgeMap.get(f.id) ?? [],
  }));
}
