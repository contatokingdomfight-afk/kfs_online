import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { requireGraduationExamPage } from "@/lib/graduation/exam-auth";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Exames de graduação | Coach" };

export default async function CoachGraduacaoPage() {
  await requireGraduationExamPage();
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: events }, { data: modalities }, { data: candidates }] = await Promise.all([
    supabase
      .from("GraduationExamEvent")
      .select("id, modalityCode, title, scheduledAt, location, status")
      .order("scheduledAt", { ascending: false })
      .limit(100),
    supabase.from("ModalityRef").select("code, name"),
    supabase.from("GraduationExamCandidate").select("eventId, status"),
  ]);
  const modalityName = new Map((modalities ?? []).map((m) => [m.code, m.name]));
  const counts = new Map<string, { total: number; passed: number; pending: number }>();
  for (const c of candidates ?? []) {
    const k = counts.get(c.eventId) ?? { total: 0, passed: 0, pending: 0 };
    k.total++;
    if (c.status === "PASSED") k.passed++;
    if (c.status === "CONVOKED") k.pending++;
    counts.set(c.eventId, k);
  }

  const upcoming = (events ?? []).filter((e) => e.status === "SCHEDULED").reverse();
  const past = (events ?? []).filter((e) => e.status !== "SCHEDULED");

  const renderEvent = (e: NonNullable<typeof events>[number]) => {
    const c = counts.get(e.id) ?? { total: 0, passed: 0, pending: 0 };
    return (
      <li key={e.id}>
        <Link
          href={`/coach/graduacao/${e.id}`}
          className="card"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", color: "var(--text-primary)" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: "var(--text-base)" }}>{e.title}</strong>
              <ExamStatusChip status={e.status} kind="event" />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CalendarDays size={14} aria-hidden /> {formatExamDate(e.scheduledAt)}
              </span>
              {e.location && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={14} aria-hidden /> {e.location}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Users size={14} aria-hidden /> {c.total} {c.total === 1 ? "aluno" : "alunos"}
                {e.status === "SCHEDULED" ? (c.pending ? ` · ${c.pending} por decidir` : "") : ` · ${c.passed} aprovados`}
              </span>
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{modalityName.get(e.modalityCode) ?? e.modalityCode}</p>
          </div>
          <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        </Link>
      </li>
    );
  };

  const listStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" };
  const sectionTitle: React.CSSProperties = {
    margin: "var(--space-5) 0 var(--space-3)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
  };

  return (
    <div style={{ maxWidth: "min(760px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600 }}>Exames de graduação</h1>
        <Link href="/coach/graduacao/novo" className="btn btn-primary" style={{ gap: 6, textDecoration: "none" }}>
          <Plus size={16} aria-hidden /> Novo exame
        </Link>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Cria um exame, convoca os alunos aptos e avalia-os no telemóvel. O grau só é atribuído quando confirmas a aprovação.
      </p>

      <h2 style={sectionTitle}>Próximos exames</h2>
      {upcoming.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Nenhum exame agendado.</p>
      ) : (
        <ul style={listStyle}>{upcoming.map(renderEvent)}</ul>
      )}

      {past.length > 0 && (
        <>
          <h2 style={sectionTitle}>Anteriores</h2>
          <ul style={listStyle}>{past.map(renderEvent)}</ul>
        </>
      )}
    </div>
  );
}
