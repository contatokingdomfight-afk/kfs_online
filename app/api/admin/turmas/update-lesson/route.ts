import { NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { performUpdateLesson } from "@/lib/admin/update-lesson";

export async function POST(request: Request) {
  const dbUser = await getCurrentDbUserUncached();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  const modality = typeof body.modality === "string" ? body.modality.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
  const coachId = typeof body.coachId === "string" ? body.coachId.trim() : "";
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

  const result = await performUpdateLesson({
    lessonId,
    modality,
    date,
    startTime,
    endTime,
    coachId,
    locationId,
    capacity,
    planningNotes,
    isOpenClass,
  });
  return NextResponse.json(result);
}
