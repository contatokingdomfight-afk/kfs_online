import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { formatLessonDate, weekdayLabelMon1 } from "@/lib/lesson-utils";
import { EditarAulaForm } from "./EditarAulaForm";
import { CancelarAulaButton } from "./CancelarAulaButton";
import { getCachedModalityRefs, getLocationsForSchool } from "@/lib/cached-reference-data";
import { buildTurmasListQuery } from "@/lib/turmas-list-query";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminTurmaEditarPage({ params, searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: lessonId } = await params;
  const sp = await searchParams;
  const turmasReturnQuery = buildTurmasListQuery(sp);
  const occurrenceRaw = typeof sp.occurrence === "string" ? sp.occurrence.trim() : "";
  const occurrenceDate = /^\d{4}-\d{2}-\d{2}$/.test(occurrenceRaw) ? occurrenceRaw : null;

  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());

  const { data: lesson } = await supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, coachId, schoolId, locationId, capacity, planningNotes, isOneOff, isOpenClass, offerTrialBooking"
    )
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    const backHref = turmasReturnQuery ? `/admin/turmas?${turmasReturnQuery}` : "/admin/turmas";
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aula não encontrada.</p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const { data: lessonCoachRows } = await supabase
    .from("LessonCoach")
    .select("coachId, sortOrder")
    .eq("lessonId", lessonId)
    .order("sortOrder");

  const initialCoachIds =
    lessonCoachRows && lessonCoachRows.length > 0
      ? lessonCoachRows.map((r) => (r as { coachId: string }).coachId)
      : lesson.coachId
        ? [lesson.coachId]
        : [];

  const schoolId = (lesson as { schoolId?: string }).schoolId ?? "";
  const { data: coachSchoolRows } = await supabase.from("CoachSchool").select("coachId").eq("schoolId", schoolId);

  const allowedCoachIds = new Set((coachSchoolRows ?? []).map((r) => r.coachId));

  const { data: coaches } = await supabase.from("Coach").select("id, userId");
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const coachOptionsAll = (coaches ?? []).map((c) => ({
    id: c.id,
    name: userById.get(c.userId)?.name ?? userById.get(c.userId)?.email ?? "—",
  }));
  const coachOptions =
    allowedCoachIds.size > 0
      ? coachOptionsAll.filter((c) => allowedCoachIds.has(c.id))
      : coachOptionsAll;

  let locationOptions = schoolId ? await getLocationsForSchool(supabase, schoolId) : [];
  const initialLocationId = (lesson as { locationId?: string }).locationId ?? "";
  if (initialLocationId && !locationOptions.some((l) => l.id === initialLocationId)) {
    const { data: orphan } = await supabase.from("Location").select("id, name").eq("id", initialLocationId).maybeSingle();
    if (orphan) {
      locationOptions = [...locationOptions, orphan];
    } else {
      locationOptions = [
        ...locationOptions,
        { id: initialLocationId, name: "(local atual — já não disponível na lista)" },
      ];
    }
  }

  const modalityOptions = await getCachedModalityRefs(supabase);
  const modalityName = modalityOptions.find((m) => m.code === lesson.modality)?.name ?? lesson.modality;

  const isOneOff = Boolean((lesson as { isOneOff?: boolean }).isOneOff);
  const wd = (lesson as { weekday?: number | null }).weekday;
  const initialWeekday =
    typeof wd === "number" && Number.isInteger(wd) && wd >= 1 && wd <= 7 ? wd : null;
  const dateStr = typeof lesson.date === "string" ? lesson.date.slice(0, 10) : "";

  const scheduleSubtitle = isOneOff
    ? `${formatLessonDate(dateStr)} ${lesson.startTime}–${lesson.endTime}`
    : `${weekdayLabelMon1(initialWeekday ?? 1)} · ${lesson.startTime}–${lesson.endTime}`;

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href={turmasReturnQuery ? `/admin/turmas?${turmasReturnQuery}` : "/admin/turmas"}
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Editar aula
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {modalityName} · {scheduleSubtitle}
        {isOneOff && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            Aula única
          </span>
        )}
        {(lesson as { isOpenClass?: boolean }).isOpenClass && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "var(--primary)",
              color: "#fff",
            }}
          >
            Aula livre
          </span>
        )}
      </p>
      <EditarAulaForm
        lessonId={lessonId}
        turmasReturnQuery={turmasReturnQuery}
        isOneOff={isOneOff}
        initialModality={lesson.modality}
        initialDate={dateStr}
        initialStartTime={lesson.startTime}
        initialEndTime={lesson.endTime}
        initialWeekday={initialWeekday}
        initialCoachIds={initialCoachIds}
        initialLocationId={initialLocationId}
        initialCapacity={lesson.capacity ?? ""}
        initialPlanningNotes={lesson.planningNotes ?? ""}
        initialIsOpenClass={Boolean((lesson as { isOpenClass?: boolean }).isOpenClass)}
        initialOfferTrialBooking={(lesson as { offerTrialBooking?: boolean }).offerTrialBooking !== false}
        coachOptions={coachOptions}
        locationOptions={locationOptions ?? []}
        modalityOptions={modalityOptions ?? []}
      />
      <CancelarAulaButton
        lessonId={lessonId}
        turmasReturnQuery={turmasReturnQuery}
        isOneOff={isOneOff}
        occurrenceDate={occurrenceDate}
      />
    </div>
  );
}
