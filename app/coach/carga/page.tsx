import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowDown, Check, CircleAlert, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { getLessonIdsForCoach } from "@/lib/coach-lesson-ids";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { PAIN_REGIONS } from "@/lib/pain-regions";
import {
  addDays,
  computeTrainingLoad,
  ZONE_COLORS,
  ZONE_RISK_ORDER,
  zoneLabel,
  type TrainingLoadSummary,
  type TrainingLoadZone,
} from "@/lib/training-load";
import { loadTrainingSessions, loadWellnessSnapshots } from "@/lib/training-load.server";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

const ZONES: TrainingLoadZone[] = ["high", "caution", "ideal", "low"];
const ZONE_ICON: Record<TrainingLoadZone, ReactNode> = {
  high: <AlertTriangle size={20} />,
  caution: <CircleAlert size={20} />,
  ideal: <Check size={20} />,
  low: <ArrowDown size={20} />,
  insufficient: <Minus size={20} />,
};
const WEEKDAY_SHORT = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type SearchParams = Promise<{ zona?: string; turma?: string; aluno?: string }>;

function suggestion(zone: TrainingLoadZone): string {
  switch (zone) {
    case "high":
      return "Reduzir a intensidade esta semana: técnica e drills, sem sparring, até o rácio voltar abaixo de 1,3.";
    case "caution":
      return "Manter o volume desta semana, sem subir. Atenção a sinais de fadiga ou dor.";
    case "low":
      return "Treinou menos do que o costume. Retomar aos poucos (subir no máximo 10–20% por semana).";
    case "ideal":
      return "Carga estável. Pode progredir gradualmente.";
    default:
      return "Ainda sem 3 semanas de treinos com nota de esforço para comparar.";
  }
}

export default async function CoachCargaPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [params, locale, coachId] = await Promise.all([searchParams, getLocaleFromCookies(), getCurrentCoachId()]);
  const pt = locale !== "en";
  const nf = (n: number) => n.toLocaleString(pt ? "pt-PT" : "en-GB");
  const ratioText = (r: number) => r.toFixed(2).replace(".", pt ? "," : ".");
  const today = calendarDateLisbon(new Date());

  const myLessonIds = await getLessonIdsForCoach(supabase, coachId);
  const turma = params.turma ?? (myLessonIds.size > 0 ? "minhas" : "todas");
  const zoneFilter = (ZONES as string[]).includes(params.zona ?? "") || params.zona === "insufficient" ? (params.zona as TrainingLoadZone) : null;

  // Quem treinou nas últimas 8 semanas (e em que aulas).
  type AttRow = { studentId: string; lessonId: string };
  const attRows: AttRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await supabase
      .from("Attendance")
      .select("studentId, lessonId")
      .eq("status", "CONFIRMED")
      .gte("occurrenceDate", addDays(today, -56))
      .lte("occurrenceDate", today)
      .range(offset, offset + 999);
    const batch = (data ?? []) as AttRow[];
    attRows.push(...batch);
    if (batch.length < 1000) break;
  }

  const lessonCountByStudent = new Map<string, Map<string, number>>();
  for (const a of attRows) {
    const m = lessonCountByStudent.get(a.studentId) ?? new Map<string, number>();
    m.set(a.lessonId, (m.get(a.lessonId) ?? 0) + 1);
    lessonCountByStudent.set(a.studentId, m);
  }
  const allLessonIds = [...new Set(attRows.map((a) => a.lessonId))];
  const { data: lessonRows } = allLessonIds.length
    ? await supabase.from("Lesson").select("id, modality, startTime, weekday").in("id", allLessonIds)
    : { data: [] };
  type LessonInfo = { id: string; modality: string; startTime: string | null; weekday: number | null };
  const lessonById = new Map(((lessonRows ?? []) as LessonInfo[]).map((l) => [l.id, l]));
  const lessonLabel = (id: string) => {
    const l = lessonById.get(id);
    if (!l) return "—";
    const day = l.weekday ? `${WEEKDAY_SHORT[l.weekday] ?? ""} ` : "";
    return `${MODALITY_LABELS[l.modality] ?? l.modality} · ${day}${(l.startTime ?? "").slice(0, 5)}`.trim();
  };

  const inScope = (studentId: string) => {
    const lessons = lessonCountByStudent.get(studentId);
    if (!lessons) return false;
    if (turma === "todas") return true;
    if (turma === "minhas") return [...lessons.keys()].some((id) => myLessonIds.has(id));
    return lessons.has(turma);
  };

  const { data: studentRows } = await supabase
    .from("Student")
    .select("id, userId, status")
    .in("id", [...lessonCountByStudent.keys()].slice(0, 2000));
  const candidates = ((studentRows ?? []) as { id: string; userId: string; status: string }[]).filter(
    (s) => s.status !== "INATIVO" && inScope(s.id)
  );
  const userIds = [...new Set(candidates.map((s) => s.userId))];
  const { data: users } = userIds.length
    ? await supabase.from("User").select("id, name, email, role").in("id", userIds)
    : { data: [] };
  const userRows = (users ?? []) as { id: string; name: string | null; email: string | null; role: string }[];
  const nameByUser = new Map(userRows.map((u) => [u.id, u.name?.trim() || u.email || "—"]));
  // Contas de admin (ex.: a conta de demonstração) não entram na lista da turma.
  const adminUserIds = new Set(userRows.filter((u) => u.role === "ADMIN").map((u) => u.id));
  const students = candidates.filter((s) => !adminUserIds.has(s.userId));
  const studentIds = students.map((s) => s.id);

  const [sessionsByStudent, wellness] = await Promise.all([
    loadTrainingSessions(supabase, studentIds, today),
    loadWellnessSnapshots(supabase, studentIds, today),
  ]);

  type Row = {
    id: string;
    name: string;
    mainLesson: string;
    load: TrainingLoadSummary;
    avgRpe: number | null;
    pain: string | null;
  };
  const painLabel = (key: string) => PAIN_REGIONS.find((r) => r.key === key)?.[pt ? "labelPt" : "labelEn"] ?? key;
  const rows: Row[] = students.map((s) => {
    const sessions = sessionsByStudent.get(s.id) ?? [];
    const load = computeTrainingLoad(sessions, today);
    const recent = sessions.filter((x) => x.date >= addDays(today, -6) && x.rpe != null);
    const lessons = [...(lessonCountByStudent.get(s.id) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
    const topPain = wellness.get(s.id)?.pains[0];
    return {
      id: s.id,
      name: nameByUser.get(s.userId) ?? "—",
      mainLesson: lessons[0] ? lessonLabel(lessons[0][0]) : "—",
      load,
      avgRpe: recent.length ? Math.round((recent.reduce((acc, x) => acc + (x.rpe ?? 0), 0) / recent.length) * 10) / 10 : null,
      pain: topPain ? `${painLabel(topPain.region)} · ${topPain.intensity}/10` : null,
    };
  });
  rows.sort((a, b) => ZONE_RISK_ORDER[a.load.zone] - ZONE_RISK_ORDER[b.load.zone] || (b.load.ratio ?? 0) - (a.load.ratio ?? 0));

  const counts = Object.fromEntries([...ZONES, "insufficient"].map((z) => [z, rows.filter((r) => r.load.zone === z).length])) as Record<TrainingLoadZone, number>;
  const visible = zoneFilter ? rows.filter((r) => r.load.zone === zoneFilter) : rows;
  const selected = rows.find((r) => r.id === params.aluno) ?? null;
  const selectedWellness = selected ? wellness.get(selected.id) : null;

  const qs = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const base: Record<string, string | null> = { turma, zona: zoneFilter, aluno: params.aluno ?? null, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/coach/carga?${s}` : "/coach/carga";
  };

  const myLessonOptions = [...myLessonIds].filter((id) => lessonById.has(id)).sort((a, b) => lessonLabel(a).localeCompare(lessonLabel(b)));
  const otherLessonOptions = allLessonIds.filter((id) => !myLessonIds.has(id) && lessonById.has(id)).sort((a, b) => lessonLabel(a).localeCompare(lessonLabel(b)));
  const COLS = "minmax(170px, 2.2fr) minmax(130px, 1.4fr) 80px 80px minmax(140px, 1.8fr) 60px minmax(90px, 1fr)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900 }}>Carga da turma</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            Esforço × minutos · últimos 7 dias vs. as 4 semanas antes
          </p>
        </div>
        <form method="get" action="/coach/carga" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {zoneFilter ? <input type="hidden" name="zona" value={zoneFilter} /> : null}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            Turma
            <select name="turma" defaultValue={turma} className="input" style={{ minHeight: 40, minWidth: 220 }}>
              {myLessonIds.size > 0 ? <option value="minhas">As minhas turmas</option> : null}
              <option value="todas">Todas as turmas</option>
              {myLessonOptions.length > 0 ? (
                <optgroup label="As minhas">
                  {myLessonOptions.map((id) => (
                    <option key={id} value={id}>
                      {lessonLabel(id)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {otherLessonOptions.length > 0 ? (
                <optgroup label="Outras">
                  {otherLessonOptions.map((id) => (
                    <option key={id} value={id}>
                      {lessonLabel(id)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <button type="submit" className="btn btn-secondary" style={{ minHeight: 40 }}>
            Ver
          </button>
        </form>
      </header>

      {/* Contagem por zona (clicar filtra) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {ZONES.map((z) => {
          const active = zoneFilter === z;
          return (
            <Link
              key={z}
              href={qs({ zona: active ? null : z })}
              aria-pressed={active}
              style={{ ...card, borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit", borderColor: active ? ZONE_COLORS[z] : "var(--border)", borderWidth: active ? 2 : 1 }}
            >
              <span aria-hidden style={{ width: 42, height: 42, borderRadius: 13, background: ZONE_COLORS[z], color: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ZONE_ICON[z]}
              </span>
              <span>
                <span style={{ display: "block", fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{counts[z]}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>{zoneLabel(z, pt)}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {/* Tabela */}
        <section style={{ ...card, flex: "999 1 560px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }} className="swipe-carousel-scroll">
            <div style={{ minWidth: 820 }}>
              <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                <span>Aluno</span>
                <span>Turma</span>
                <span>Semana</span>
                <span>Normal</span>
                <span>Rácio</span>
                <span>RPE</span>
                <span>Dor</span>
              </div>
              {visible.length === 0 ? (
                <p style={{ margin: 0, padding: 20, fontSize: 14, color: "var(--text-secondary)" }}>
                  {rows.length === 0 ? "Nenhum aluno treinou nestas turmas nas últimas 8 semanas." : "Nenhum aluno nesta zona."}
                </p>
              ) : (
                visible.map((r, i) => {
                  const color = ZONE_COLORS[r.load.zone];
                  const isSel = selected?.id === r.id;
                  return (
                    <Link
                      key={r.id}
                      href={qs({ aluno: isSel ? null : r.id })}
                      style={{
                        display: "grid",
                        gridTemplateColumns: COLS,
                        gap: 12,
                        padding: "11px 16px",
                        alignItems: "center",
                        borderTop: i > 0 ? "1px solid var(--border)" : "none",
                        textDecoration: "none",
                        color: "inherit",
                        background: isSel ? "rgba(193,18,31,0.10)" : undefined,
                        boxShadow: isSel ? "inset 3px 0 0 var(--primary)" : undefined,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span aria-hidden style={{ width: 12, height: 12, borderRadius: 6, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.mainLesson}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{nf(r.load.acute)}</span>
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{r.load.chronic != null ? nf(r.load.chronic) : "—"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span aria-hidden style={{ position: "relative", flex: 1, height: 8, borderRadius: 4, background: "var(--border)" }}>
                          {r.load.ratio != null ? (
                            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (r.load.ratio / 2) * 100)}%`, borderRadius: 4, background: color }} />
                          ) : null}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: r.load.ratio != null ? color : "var(--text-secondary)", width: 40, textAlign: "right" }}>
                          {r.load.ratio != null ? ratioText(r.load.ratio) : "—"}
                        </span>
                      </span>
                      <span style={{ fontSize: 14 }}>{r.avgRpe != null ? String(r.avgRpe).replace(".", ",") : "—"}</span>
                      <span style={{ fontSize: 13, fontWeight: r.pain ? 700 : 400, color: r.pain ? "var(--warning)" : "var(--text-secondary)" }}>{r.pain ?? "—"}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
          <p style={{ margin: 0, padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
            Ordenado por risco · {counts.insufficient} {counts.insufficient === 1 ? "aluno ainda sem" : "alunos ainda sem"} 3 semanas de treinos com nota de esforço · clica num aluno para ver o detalhe
          </p>
        </section>

        {/* Detalhe do aluno */}
        {selected ? (
          <aside style={{ ...card, flex: "1 1 320px", maxWidth: 420, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={{ display: "block", fontSize: 18, fontWeight: 800 }}>{selected.name}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
                {selected.mainLesson} · {selected.load.sessions7d + selected.load.unrated7d} treinos esta semana
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: ZONE_COLORS[selected.load.zone] }}>
                {selected.load.ratio != null ? ratioText(selected.load.ratio) : "—"}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.load.ratio != null ? "× o normal" : zoneLabel(selected.load.zone, pt)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Carga semanal · 8 semanas</span>
              <div style={{ height: 90, display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 6, alignItems: "end" }}>
                {(() => {
                  const max = Math.max(1, ...selected.load.weeks.map((w) => w.load));
                  return selected.load.weeks.map((w, i) => (
                    <span
                      key={w.end}
                      title={nf(w.load)}
                      style={{ height: `${Math.max(3, (w.load / max) * 100)}%`, borderRadius: 5, background: i === 7 ? ZONE_COLORS[selected.load.zone] : "var(--text-secondary)", opacity: i === 7 ? 1 : 0.45 }}
                    />
                  ));
                })()}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRadius: 14, background: "var(--bg)", padding: 12, fontSize: 13 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Sono (média 7 dias)</span>
                <b>{selectedWellness?.avgSleep7d != null ? `${String(selectedWellness.avgSleep7d).replace(".", ",")} h` : "—"}</b>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Prontidão pré-aula</span>
                <b style={{ color: selectedWellness?.lastZone === "RED" ? "#f87171" : selectedWellness?.lastZone === "YELLOW" ? "#fbbf24" : selectedWellness?.lastZone === "GREEN" ? "#4ade80" : undefined }}>
                  {selectedWellness?.lastZone === "RED" ? "Vermelho" : selectedWellness?.lastZone === "YELLOW" ? "Amarelo" : selectedWellness?.lastZone === "GREEN" ? "Verde" : "—"}
                </b>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Dor (14 dias)</span>
                <b style={{ color: selected.pain ? "var(--warning)" : undefined, textAlign: "right" }}>
                  {selectedWellness?.pains.length ? selectedWellness.pains.map((p) => `${painLabel(p.region)} ${p.intensity}/10`).join(", ") : "—"}
                </b>
              </span>
              {selected.load.unrated7d > 0 ? (
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Treinos sem nota (7 dias)</span>
                  <b style={{ color: "var(--warning)" }}>{selected.load.unrated7d}</b>
                </span>
              ) : null}
            </div>
            <div style={{ borderRadius: 14, border: `1px solid ${ZONE_COLORS[selected.load.zone]}`, padding: 12 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>Sugestão</span>
              <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{suggestion(selected.load.zone)}</span>
            </div>
            <Link href={`/coach/alunos/${selected.id}`} className="btn btn-primary" style={{ textDecoration: "none", textAlign: "center" }}>
              Ver perfil do aluno
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
