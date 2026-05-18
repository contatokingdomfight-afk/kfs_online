import { NextResponse } from "next/server";
import { requireAdminForRoute } from "@/lib/supabase/route-handler";
import { performUpdateLesson } from "@/lib/admin/update-lesson";

export async function POST(request: Request) {
  const auth = await requireAdminForRoute();
  if (!auth.adminOk) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (e) {
    console.error("update-lesson: body parse error", e);
    return NextResponse.json({ error: "Corpo do pedido inválido (não é JSON)." }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  const modality = typeof body.modality === "string" ? body.modality.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";

  let coachIds: string[] = [];
  const rawCoachIds = body.coachIds;
  if (Array.isArray(rawCoachIds)) {
    coachIds = rawCoachIds.map((x) => String(x).trim()).filter(Boolean);
  } else if (typeof body.coachId === "string" && body.coachId.trim()) {
    coachIds = [body.coachId.trim()];
  }

  const locationRaw = body.locationId;
  const locationId =
    typeof locationRaw === "string" && locationRaw.trim() !== "" ? locationRaw.trim() : null;

  let capacity: number | null = null;
  const capRaw = body.capacity;
  if (capRaw !== undefined && capRaw !== null && capRaw !== "") {
    const n = typeof capRaw === "number" ? capRaw : parseInt(String(capRaw), 10);
    if (Number.isNaN(n) || n < 1) {
      return NextResponse.json({ error: "Capacidade deve ser um número positivo." }, { status: 400 });
    }
    capacity = n;
  }

  const planningRaw = body.planningNotes;
  const planningNotes =
    typeof planningRaw === "string" && planningRaw.trim() !== "" ? planningRaw.trim() : null;

  const isOpenClass = body.isOpenClass === true;

  const offerTrialBooking =
    body.offerTrialBooking === false || body.offerTrialBooking === "false" ? false : true;

  let weekday: number | null = null;
  const wdRaw = body.weekday;
  if (wdRaw !== undefined && wdRaw !== null && wdRaw !== "") {
    const n = typeof wdRaw === "number" ? wdRaw : parseInt(String(wdRaw), 10);
    if (!Number.isNaN(n)) weekday = n;
  }

  try {
    const result = await performUpdateLesson({
      lessonId,
      modality,
      date,
      startTime,
      endTime,
      coachIds,
      locationId,
      capacity,
      planningNotes,
      isOpenClass,
      offerTrialBooking,
      weekday,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("update-lesson: performUpdateLesson error", e);
    return NextResponse.json({ error: "Erro interno ao guardar aula." }, { status: 500 });
  }
}
