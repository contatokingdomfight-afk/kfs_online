import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CreateLessonForm } from "./CreateLessonForm";
import { TurmasViewSwitcher } from "./TurmasViewSwitcher";
import { TurmasSchoolFilter } from "./TurmasSchoolFilter";
import { getWeekStartMonday, getWeekEndSunday } from "@/lib/lesson-utils";
import { getCachedLocations, getCachedModalityRefs } from "@/lib/cached-reference-data";
import { WeekView, ModalityView, type LessonRow } from "./TurmasViews";

export default async function AdminTurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; school?: string }>;
}) {
  const params = await searchParams;
  /** Por defeito: vista por semana; `?view=modalidade` para agrupar por modalidade. */
  const view = (params.view === "modalidade" ? "modalidade" : "semana") as "modalidade" | "semana";
  const weekParam = params.week?.trim() || null;
  const weekMonday =
    view === "semana"
      ? (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : getWeekStartMonday())
      : null;
  const weekEnd = weekMonday ? getWeekEndSunday(weekMonday) : null;
  const weekMondayForLink = weekMonday ?? (view === "semana" ? getWeekStartMonday() : getWeekStartMonday());
  const schoolFilterParam = params.school?.trim() || null;
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  // Usar admin client quando disponível (bypassa RLS) para garantir coaches em turmas/aulas
  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());

  const { data: lessons, error: lessonsError } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, capacity, coachId, locationId, planningNotes, isOneOff, isOpenClass, createdAt, schoolId")
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const { data: coaches } = await supabase.from("Coach").select("id, userId").then(async (r) => {
    if (!r.data?.length) return { data: [] as { id: string; name: string; schoolIds: string[] }[] };
    const userIds = r.data.map((c) => c.userId);
    const coachIds = r.data.map((c) => c.id);
    const [{ data: users }, { data: coachSchools }] = await Promise.all([
      supabase.from("User").select("id, name, email").in("id", userIds),
      supabase.from("CoachSchool").select("coachId, schoolId").in("coachId", coachIds),
    ]);
    const schoolIdsByCoach = new Map<string, string[]>();
    for (const row of coachSchools ?? []) {
      const list = schoolIdsByCoach.get(row.coachId) ?? [];
      list.push(row.schoolId);
      schoolIdsByCoach.set(row.coachId, list);
    }
    return {
      data: (r.data || []).map((c) => {
        const u = users?.find((u) => u.id === c.userId);
        return {
          id: c.id,
          name: u?.name || u?.email || "—",
          schoolIds: schoolIdsByCoach.get(c.id) ?? [],
        };
      }),
    };
  });

  const [locations, modalities] = await Promise.all([
    getCachedLocations(supabase),
    getCachedModalityRefs(supabase),
  ]);
  const { data: schools } = await supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true });

  const lessonsForView =
    schoolFilterParam && schools?.some((s) => s.id === schoolFilterParam)
      ? (lessons ?? []).filter((l) => (l as { schoolId?: string }).schoolId === schoolFilterParam)
      : lessons;

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Turmas / Aulas
        </h1>
      </div>

      <section className="card" style={{ marginBottom: "clamp(24px, 6vw, 32px)", padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Nova aula
        </h2>
        <CreateLessonForm
          coaches={(coaches ?? []) as { id: string; name: string; schoolIds: string[] }[]}
          modalities={modalities ?? []}
          schools={schools ?? []}
        />
      </section>

      <section>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Aulas
        </h2>
        <div
          className="card"
          style={{
            marginBottom: "clamp(14px, 3.5vw, 18px)",
            padding: "clamp(14px, 3.5vw, 18px)",
          }}
        >
          <Suspense fallback={<p style={{ color: "var(--text-secondary)", fontSize: 14 }}>A carregar filtro…</p>}>
            <TurmasSchoolFilter schools={schools ?? []} weekFallback={weekMondayForLink} />
          </Suspense>
        </div>
        <TurmasViewSwitcher
          view={view}
          weekMonday={weekMonday}
          weekMondayForLink={weekMondayForLink}
          schoolParam={schoolFilterParam}
        />
        {lessonsError && (
          <p style={{ color: "var(--danger)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Erro ao carregar: {lessonsError.message}
          </p>
        )}
        {!lessonsError && (!lessons || lessons.length === 0) && (
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Nenhuma aula criada. Adiciona acima.
          </p>
        )}
        {!lessonsError && view === "semana" && weekMonday && weekEnd && lessonsForView && (
          <WeekView
            weekMonday={weekMonday}
            weekEnd={weekEnd}
            lessons={lessonsForView as LessonRow[]}
            locations={locations ?? null}
            coaches={coaches ?? null}
            modalities={modalities ?? null}
            schools={schools ?? null}
          />
        )}
        {!lessonsError && view === "modalidade" && lessonsForView && lessonsForView.length > 0 && (
          <ModalityView
            lessons={lessonsForView as LessonRow[]}
            modalities={modalities ?? null}
            locations={locations ?? null}
            coaches={coaches ?? null}
            schools={schools ?? null}
          />
        )}
        {!lessonsError &&
          view === "modalidade" &&
          lessons &&
          lessons.length > 0 &&
          lessonsForView &&
          lessonsForView.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
              Nenhuma aula com o filtro de escola selecionado. Escolhe «Todas as escolas» ou outra sede.
            </p>
          )}
      </section>
    </div>
  );
}
