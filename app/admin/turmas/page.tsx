import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CreateLessonForm } from "./CreateLessonForm";
import { TurmasViewSwitcher } from "./TurmasViewSwitcher";
import { getWeekStartMonday, getWeekEndSunday } from "@/lib/lesson-utils";
import { getCachedLocations, getCachedModalityRefs } from "@/lib/cached-reference-data";
import { WeekView, ModalityView, type LessonRow } from "./TurmasViews";

export default async function AdminTurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }> | { view?: string; week?: string };
}) {
  const params = typeof (searchParams as Promise<{ view?: string; week?: string }>).then === "function" ? await (searchParams as Promise<{ view?: string; week?: string }>) : (searchParams as { view?: string; week?: string });
  const view = (params.view === "semana" ? "semana" : "modalidade") as "modalidade" | "semana";
  const weekParam = params.week?.trim() || null;
  const weekMonday =
    view === "semana"
      ? (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : getWeekStartMonday())
      : null;
  const weekEnd = weekMonday ? getWeekEndSunday(weekMonday) : null;
  const weekMondayForLink = weekMonday ?? (view === "semana" ? getWeekStartMonday() : getWeekStartMonday());
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();

  const { data: lessons, error: lessonsError } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, capacity, coachId, locationId, planningNotes, isOneOff, createdAt")
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const { data: coaches } = await supabase.from("Coach").select("id, userId").then(async (r) => {
    if (!r.data?.length) return { data: [] as { id: string; name: string }[] };
    const userIds = r.data.map((c) => c.userId);
    const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
    return {
      data: (r.data || []).map((c) => {
        const u = users?.find((u) => u.id === c.userId);
        return { id: c.id, name: u?.name || u?.email || "—" };
      }),
    };
  });

  const [locations, modalities] = await Promise.all([
    getCachedLocations(supabase),
    getCachedModalityRefs(supabase),
  ]);
  const { data: schools } = await supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true });

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
        <CreateLessonForm coaches={coaches ?? []} modalities={modalities ?? []} schools={schools ?? []} />
      </section>

      <section>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Aulas
        </h2>
        <TurmasViewSwitcher view={view} weekMonday={weekMonday} weekMondayForLink={weekMondayForLink} />
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
        {!lessonsError && view === "semana" && weekMonday && weekEnd && lessons && (
          <WeekView
            weekMonday={weekMonday}
            weekEnd={weekEnd}
            lessons={lessons as LessonRow[]}
            locations={locations ?? null}
            coaches={coaches ?? null}
            modalities={modalities ?? null}
          />
        )}
        {!lessonsError && view === "modalidade" && lessons && lessons.length > 0 && (
          <ModalityView
            lessons={lessons as LessonRow[]}
            modalities={modalities ?? null}
            locations={locations ?? null}
            coaches={coaches ?? null}
          />
        )}
      </section>
    </div>
  );
}
