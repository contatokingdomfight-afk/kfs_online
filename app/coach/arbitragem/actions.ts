"use server";

import { revalidatePath } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import {
  aggregateJudgeTotals,
  computeDecisionType,
  cornerScoresFromEvaluationRow,
  suggestTenPointMust,
  sumCornerScores,
  winnerFromTotals,
} from "@/lib/arbitration/scoring";
import { unwrapSupabaseJoin } from "@/lib/arbitration/supabase-join";
import {
  applyOfficialPointDeduction,
  occurrencesFromDbRow,
  occurrencesToDbPayload,
  syncDeductionsFromOccurrences,
} from "@/lib/arbitration/occurrences";
import type {
  ArbitrationModality,
  OccurrenceInput,
  RoundScoresInput,
} from "@/lib/arbitration/types";

function supabaseOrThrow() {
  const result = getAdminClientOrNull();
  if (!result.client) throw new Error("Supabase admin não configurado");
  return result.client;
}

function criteriaToDb(prefix: "blue" | "red", scores: RoundScoresInput[typeof prefix]) {
  return {
    [`${prefix}OffensiveVolume`]: scores.offensiveVolume,
    [`${prefix}StrikePrecision`]: scores.strikePrecision,
    [`${prefix}RingControl`]: scores.ringControl,
    [`${prefix}Movement`]: scores.movement,
    [`${prefix}Defense`]: scores.defense,
    [`${prefix}Technique`]: scores.technique,
  };
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

async function ensureFightRound(supabase: ReturnType<typeof supabaseOrThrow>, fightId: string, roundNumber: number) {
  const { data: existing } = await supabase
    .from("ArbitrationFightRound")
    .select("id")
    .eq("fightId", fightId)
    .eq("roundNumber", roundNumber)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("ArbitrationFightRound")
    .insert({ fightId, roundNumber })
    .select("id")
    .single();

  if (!error && created?.id) return created.id as string;

  if (isUniqueViolation(error)) {
    const { data: retry } = await supabase
      .from("ArbitrationFightRound")
      .select("id")
      .eq("fightId", fightId)
      .eq("roundNumber", roundNumber)
      .maybeSingle();
    if (retry?.id) return retry.id;
  }

  if (error) throw new Error(error.message);
  throw new Error("Não foi possível criar o round.");
}

async function finalizeFightIfComplete(
  supabase: ReturnType<typeof supabaseOrThrow>,
  fightId: string
) {
  const { data: fight } = await supabase
    .from("ArbitrationFight")
    .select("id, totalRounds, status")
    .eq("id", fightId)
    .single();
  if (!fight || fight.status === "COMPLETED") return;

  const { data: fightRounds } = await supabase
    .from("ArbitrationFightRound")
    .select("id, roundNumber")
    .eq("fightId", fightId)
    .order("roundNumber");

  const fightRoundIds = (fightRounds ?? []).map((r) => r.id as string);
  if (fightRoundIds.length < fight.totalRounds) return;

  const { data: fightJudges } = await supabase
    .from("ArbitrationFightJudge")
    .select("id, judgeNumber")
    .eq("fightId", fightId);

  if (!fightJudges?.length) return;

  for (const fj of fightJudges) {
    const { data: evals, error: evalsError } = await supabase
      .from("ArbitrationRoundEvaluation")
      .select("officialBlueScore, officialRedScore, isLocked, roundId")
      .eq("fightJudgeId", fj.id)
      .eq("isLocked", true)
      .in("roundId", fightRoundIds);

    if (evalsError) throw new Error(evalsError.message);
    if ((evals ?? []).length < fight.totalRounds) continue;

    const evalByRound = new Map<string, { officialBlueScore: number | null; officialRedScore: number | null }>();
    for (const e of evals ?? []) {
      evalByRound.set(e.roundId as string, e);
    }

    const ordered = (fightRounds ?? [])
      .map((r) => evalByRound.get(r.id as string))
      .filter(Boolean) as { officialBlueScore: number | null; officialRedScore: number | null }[];

    if (ordered.length < fight.totalRounds) continue;

    const totals = aggregateJudgeTotals(ordered);
    if (!totals) continue;

    const winner = winnerFromTotals(totals.blue, totals.red);
    const { error: resultError } = await supabase.from("ArbitrationFightResult").upsert(
      {
        fightId,
        fightJudgeId: fj.id,
        totalBlueOfficial: totals.blue,
        totalRedOfficial: totals.red,
        winner,
      },
      { onConflict: "fightId,fightJudgeId" }
    );
    if (resultError) throw new Error(resultError.message);
  }

  const { data: results, error: resultsError } = await supabase
    .from("ArbitrationFightResult")
    .select("winner")
    .eq("fightId", fightId);

  if (resultsError) throw new Error(resultsError.message);

  const allJudgesDone = (results?.length ?? 0) >= (fightJudges?.length ?? 0);
  if (!allJudgesDone) return;

  const winners = (results ?? []).map((r) => r.winner as "BLUE" | "RED" | "DRAW");
  const decisionType = computeDecisionType(winners);
  const blueWins = winners.filter((w) => w === "BLUE").length;
  const redWins = winners.filter((w) => w === "RED").length;
  let fightWinner: "BLUE" | "RED" | "DRAW" = "DRAW";
  if (blueWins > redWins) fightWinner = "BLUE";
  else if (redWins > blueWins) fightWinner = "RED";

  const { error: fightError } = await supabase
    .from("ArbitrationFight")
    .update({
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      winner: fightWinner,
      decisionType,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", fightId)
    .eq("status", "IN_PROGRESS");

  if (fightError) throw new Error(fightError.message);
}

export async function createArbitrationEvent(input: {
  name: string;
  eventDate: string | null;
  location: string | null;
  totalRoundsDefault: number;
}) {
  const access = await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { data, error } = await supabase
    .from("ArbitrationEvent")
    .insert({
      name: input.name.trim(),
      eventDate: input.eventDate || null,
      location: input.location?.trim() || null,
      totalRoundsDefault: input.totalRoundsDefault,
      createdByUserId: access.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/coach/arbitragem");
  revalidatePath("/coach/arbitragem/gestao");
  return { id: data.id as string };
}

export async function createArbitrationJudge(input: { displayName: string; userId?: string | null }) {
  await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { data, error } = await supabase
    .from("ArbitrationJudge")
    .insert({
      displayName: input.displayName.trim(),
      userId: input.userId || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/coach/arbitragem/gestao");
  return { id: data.id as string };
}

export async function createArbitrationFight(input: {
  eventId: string;
  modality: ArbitrationModality;
  category: string;
  weightClass: string | null;
  athleteBlueName: string;
  athleteRedName: string;
  totalRounds: number;
  judgeIds: string[];
}) {
  await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { data: fight, error } = await supabase
    .from("ArbitrationFight")
    .insert({
      eventId: input.eventId,
      modality: input.modality,
      category: input.category.trim(),
      weightClass: input.weightClass?.trim() || null,
      athleteBlueName: input.athleteBlueName.trim(),
      athleteRedName: input.athleteRedName.trim(),
      totalRounds: input.totalRounds,
      status: "SCHEDULED",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const judgeIds = input.judgeIds.slice(0, 3);
  if (judgeIds.length > 0) {
    const rows = judgeIds.map((judgeId, i) => ({
      fightId: fight.id,
      judgeId,
      judgeNumber: i + 1,
    }));
    const { error: fjError } = await supabase.from("ArbitrationFightJudge").insert(rows);
    if (fjError) throw new Error(fjError.message);
  }

  revalidatePath("/coach/arbitragem");
  revalidatePath("/coach/arbitragem/gestao");
  return { id: fight.id as string };
}

export async function startFightJudging(fightId: string) {
  await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { error } = await supabase
    .from("ArbitrationFight")
    .update({
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
      currentRound: 1,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", fightId)
    .in("status", ["SCHEDULED", "IN_PROGRESS"]);

  if (error) throw new Error(error.message);
  await ensureFightRound(supabase, fightId, 1);
  revalidatePath("/coach/arbitragem");
  revalidatePath(`/coach/arbitragem/${fightId}`);
}

export async function saveArbitrationRound(input: {
  fightId: string;
  fightJudgeId: string;
  roundNumber: number;
  scores: RoundScoresInput;
  occurrences: OccurrenceInput;
}) {
  const access = await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const roundId = await ensureFightRound(supabase, input.fightId, input.roundNumber);

  const { data: existingEval } = await supabase
    .from("ArbitrationRoundEvaluation")
    .select("id, isLocked, blueTotal, redTotal, officialBlueScore, officialRedScore")
    .eq("fightJudgeId", input.fightJudgeId)
    .eq("roundId", roundId)
    .maybeSingle();

  const { data: fightMeta } = await supabase
    .from("ArbitrationFight")
    .select("totalRounds")
    .eq("id", input.fightId)
    .single();

  const totalRounds = fightMeta?.totalRounds ?? 3;
  const nextRound = input.roundNumber + 1;

  if (existingEval?.isLocked) {
    if (nextRound > totalRounds) {
      await finalizeFightIfComplete(supabase, input.fightId);
    }
    revalidatePath("/coach/arbitragem");
    revalidatePath(`/coach/arbitragem/${input.fightId}`);
    revalidatePath("/coach/arbitragem/historico");
    return {
      nextRound: nextRound <= totalRounds ? nextRound : null,
      blueTotal: existingEval.blueTotal as number,
      redTotal: existingEval.redTotal as number,
      officialBlue: existingEval.officialBlueScore as number,
      officialRed: existingEval.officialRedScore as number,
      alreadyLocked: true,
    };
  }

  const blueTotal = sumCornerScores(input.scores.blue);
  const redTotal = sumCornerScores(input.scores.red);
  if (blueTotal == null || redTotal == null) {
    throw new Error("Preencha todos os critérios (1–5) para ambos os atletas.");
  }

  const suggested = suggestTenPointMust(blueTotal, redTotal);
  const syncedOccurrences = syncDeductionsFromOccurrences(input.occurrences);
  const blueDeduction = Math.max(0, Math.min(3, Math.round(syncedOccurrences.blueOfficialPointDeduction)));
  const redDeduction = Math.max(0, Math.min(3, Math.round(syncedOccurrences.redOfficialPointDeduction)));
  const baseOfficialBlue = input.scores.officialBlueScore ?? suggested.blue;
  const baseOfficialRed = input.scores.officialRedScore ?? suggested.red;
  const officialBlue = applyOfficialPointDeduction(baseOfficialBlue, blueDeduction);
  const officialRed = applyOfficialPointDeduction(baseOfficialRed, redDeduction);

  const evalPayload = {
    roundId,
    fightJudgeId: input.fightJudgeId,
    ...criteriaToDb("blue", input.scores.blue),
    ...criteriaToDb("red", input.scores.red),
    blueTotal,
    redTotal,
    suggestedBlueOfficial: suggested.blue,
    suggestedRedOfficial: suggested.red,
    officialBlueScore: officialBlue,
    officialRedScore: officialRed,
    bluePointDeduction: blueDeduction,
    redPointDeduction: redDeduction,
    isLocked: true,
    lockedAt: new Date().toISOString(),
    scoredByUserId: access.userId,
    updatedAt: new Date().toISOString(),
  };

  const { error: occError } = await supabase.from("ArbitrationRoundOccurrence").upsert(
    {
      roundId,
      fightJudgeId: input.fightJudgeId,
      ...occurrencesToDbPayload(syncedOccurrences),
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "roundId,fightJudgeId" }
  );
  if (occError) throw new Error(occError.message);

  const { error: evalError } = await supabase.from("ArbitrationRoundEvaluation").upsert(evalPayload, {
    onConflict: "roundId,fightJudgeId",
  });
  if (evalError) throw new Error(evalError.message);

  if (nextRound <= totalRounds) {
    const { error: fightUpdateError } = await supabase
      .from("ArbitrationFight")
      .update({ currentRound: nextRound, updatedAt: new Date().toISOString() })
      .eq("id", input.fightId);
    if (fightUpdateError) throw new Error(fightUpdateError.message);
    await ensureFightRound(supabase, input.fightId, nextRound);
  } else {
    await finalizeFightIfComplete(supabase, input.fightId);
  }

  revalidatePath("/coach/arbitragem");
  revalidatePath(`/coach/arbitragem/${input.fightId}`);
  revalidatePath("/coach/arbitragem/historico");

  return {
    nextRound: nextRound <= totalRounds ? nextRound : null,
    blueTotal,
    redTotal,
    officialBlue,
    officialRed,
  };
}

export async function getFightJudgingState(fightId: string, fightJudgeId: string) {
  await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { data: fight } = await supabase
    .from("ArbitrationFight")
    .select(
      `id, modality, category, weightClass, athleteBlueName, athleteRedName, status, totalRounds, currentRound, winner, decisionType,
       event:ArbitrationEvent(id, name, roundDurationSeconds)`
    )
    .eq("id", fightId)
    .single();

  if (!fight) return null;

  const event = unwrapSupabaseJoin(
    fight.event as { id: string; name: string; roundDurationSeconds: number | null } | { id: string; name: string; roundDurationSeconds: number | null }[] | null
  );

  const { data: rounds } = await supabase
    .from("ArbitrationFightRound")
    .select("id, roundNumber")
    .eq("fightId", fightId)
    .order("roundNumber");

  const roundIds = (rounds ?? []).map((r) => r.id);
  let evaluations: Record<string, unknown>[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase
      .from("ArbitrationRoundEvaluation")
      .select("*")
      .eq("fightJudgeId", fightJudgeId)
      .in("roundId", roundIds);
    evaluations = data ?? [];
  }

  let occurrences: Record<string, unknown>[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase
      .from("ArbitrationRoundOccurrence")
      .select("*")
      .eq("fightJudgeId", fightJudgeId)
      .in("roundId", roundIds);
    occurrences = data ?? [];
  }

  const evalByRoundId = new Map(evaluations.map((e) => [e.roundId as string, e]));
  const occByRoundId = new Map((occurrences ?? []).map((o) => [o.roundId as string, o]));

  const roundStates = (rounds ?? []).map((r) => {
    const ev = evalByRoundId.get(r.id);
    const occ = occByRoundId.get(r.id);
    const occInput = occurrencesFromDbRow(occ as Record<string, unknown> | undefined);
    if (ev) {
      occInput.blueOfficialPointDeduction = (ev.bluePointDeduction as number) ?? 0;
      occInput.redOfficialPointDeduction = (ev.redPointDeduction as number) ?? 0;
    }
    return {
      roundNumber: r.roundNumber,
      isLocked: Boolean(ev?.isLocked),
      blueTotal: (ev?.blueTotal as number) ?? null,
      redTotal: (ev?.redTotal as number) ?? null,
      officialBlueScore: (ev?.officialBlueScore as number) ?? null,
      officialRedScore: (ev?.officialRedScore as number) ?? null,
      occurrences: occInput,
      scores: ev
        ? {
            blue: cornerScoresFromEvaluationRow(ev, "blue"),
            red: cornerScoresFromEvaluationRow(ev, "red"),
          }
        : null,
    };
  });

  const activeRound =
    roundStates.find((r) => !r.isLocked)?.roundNumber ??
    (fight.currentRound as number) ??
    1;

  const { data: judgeResults } = await supabase
    .from("ArbitrationFightResult")
    .select(`totalBlueOfficial, totalRedOfficial, winner, fightJudge:ArbitrationFightJudge(judgeNumber, judge:ArbitrationJudge(displayName))`)
    .eq("fightId", fightId);

  return {
    fight: {
      id: fight.id,
      modality: fight.modality,
      category: fight.category,
      weightClass: fight.weightClass,
      athleteBlueName: fight.athleteBlueName,
      athleteRedName: fight.athleteRedName,
      status: fight.status,
      totalRounds: fight.totalRounds,
      currentRound: fight.currentRound,
      winner: fight.winner,
      decisionType: fight.decisionType,
      eventName: event?.name ?? "",
      roundDurationSeconds: event?.roundDurationSeconds ?? null,
    },
    activeRound,
    rounds: roundStates,
    judgeResults: (judgeResults ?? []).map((jr) => {
      const fj = unwrapSupabaseJoin(
        jr.fightJudge as
          | { judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }
          | { judgeNumber: number; judge: { displayName: string } | { displayName: string }[] }[]
      );
      const judge = unwrapSupabaseJoin(fj?.judge ?? null);
      return {
        judgeNumber: fj?.judgeNumber ?? 0,
        judgeName: judge?.displayName ?? "—",
        totalBlueOfficial: jr.totalBlueOfficial,
        totalRedOfficial: jr.totalRedOfficial,
        winner: jr.winner,
      };
    }),
  };
}

export async function resolveFightJudgeForUser(fightId: string, userId: string) {
  await requireArbitrationAccess();
  const supabase = supabaseOrThrow();

  const { data: assignments } = await supabase
    .from("ArbitrationFightJudge")
    .select(`id, judgeNumber, judge:ArbitrationJudge(id, displayName, userId)`)
    .eq("fightId", fightId)
    .order("judgeNumber");

  const matched = (assignments ?? []).find((a) => {
    const judge = unwrapSupabaseJoin(
      a.judge as { userId: string | null } | { userId: string | null }[] | null
    );
    return judge?.userId === userId;
  });

  return {
    assignments: (assignments ?? []).map((a) => {
      const judge = unwrapSupabaseJoin(
        a.judge as { id: string; displayName: string; userId: string | null } | { id: string; displayName: string; userId: string | null }[]
      )!;
      return {
        id: a.id as string,
        judgeNumber: a.judgeNumber as number,
        judge: { id: judge.id, displayName: judge.displayName, userId: judge.userId },
      };
    }),
    suggestedFightJudgeId: (matched?.id as string) ?? null,
  };
}
