import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";

const BATCH = 500;

/**
 * Cron diário: grava o XP atual de cada atleta (aluno ATIVO) em `AthleteXpSnapshot`.
 * Base para o ranking "por período" (XP ganho desde uma data) sem reescrever os
 * pontos onde XP é hoje atribuído — ver DOCS/ROADMAP_Plataforma_KFS.md (Rank v2).
 * Idempotente: `upsert` por (athleteId, snapshotDate), seguro correr 2x no mesmo dia.
 *
 * GET /api/cron/xp-snapshot
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = calendarDateLisbon(new Date());

  const { data: rows } = await supabase
    .from("Athlete")
    .select("id, xp, student:Student!inner(status)")
    .eq("student.status", "ATIVO");

  const list = (rows ?? []) as { id: string; xp: number | null }[];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  let count = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH).map((r) => ({
      id: crypto.randomUUID(),
      athleteId: r.id,
      xp: r.xp ?? 0,
      snapshotDate: today,
    }));
    const { error } = await supabase
      .from("AthleteXpSnapshot")
      .upsert(chunk, { onConflict: "athleteId,snapshotDate" });
    if (!error) count += chunk.length;
    else console.error("[xp-snapshot] upsert", error);
  }

  return NextResponse.json({ ok: true, count });
}
