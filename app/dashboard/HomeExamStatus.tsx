import Link from "next/link";
import { Award, ChevronRight, Lock } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revealDueResults } from "@/lib/graduation/reveal";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { SELF_BOOKING_CUTOFF_HOURS } from "@/lib/graduation/exam-slots";
import type { SupabaseClient } from "@supabase/supabase-js";

const TZ = "Europe/Lisbon";

type HomeExamItem = { key: string; href: string; title: string; detail: string; tone: "primary" | "warning" | "success" };

const TONE: Record<HomeExamItem["tone"], string> = { primary: "var(--primary)", warning: "var(--warning)", success: "var(--success)" };

function when(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: TZ,
  });
}

/**
 * Home do aluno: atalho para o exame de graduação — convocado (com horário ou por escolher), exame
 * já feito com o resultado por revelar, ou apto com dias de exame abertos para escolher.
 */
export async function HomeExamStatus({ studentId }: { studentId: string }) {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  await revealDueResults(admin, { studentId });

  const { data: rows } = await admin
    .from("GraduationExamCandidate")
    .select("id, eventId, gradeId, status, slotStartsAt, mode, revealedAt")
    .eq("studentId", studentId)
    // Convocados e decididos por revelar têm ambos revealedAt vazio.
    .is("revealedAt", null)
    .limit(10);
  const candidates = rows ?? [];

  const eventIds = [...new Set(candidates.map((c) => c.eventId as string))];
  const gradeIds = [...new Set(candidates.map((c) => c.gradeId as string))];
  const [{ data: events }, { data: grades }] = candidates.length
    ? await Promise.all([
        admin.from("GraduationExamEvent").select("id, modalityCode, title, scheduledAt, endsAt, location, status, selfBooking, resultsRevealAt").in("id", eventIds),
        admin.from("GraduationGrade").select("id, name").in("id", gradeIds),
      ])
    : [{ data: null }, { data: null }];
  const eventById = new Map((events ?? []).map((e) => [e.id as string, e]));
  const gradeName = new Map((grades ?? []).map((g) => [g.id as string, g.name as string]));
  const now = Date.now();

  const items = candidates.flatMap((c): HomeExamItem[] => {
    const ev = eventById.get(c.eventId as string);
    if (!ev || ev.status === "CANCELLED") return [];
    const exam = c.mode === "PLACEMENT" ? "Exame de nivelamento" : `Exame para ${gradeName.get(c.gradeId as string) ?? "o próximo grau"}`;
    const m = encodeURIComponent(ev.modalityCode as string);
    if (c.status === "CONVOKED") {
      const end = new Date((ev.endsAt as string | null) ?? (ev.scheduledAt as string)).getTime();
      if (ev.status !== "SCHEDULED" || end < now - 12 * 3_600_000) return [];
      const needsSlot = ev.selfBooking && !c.slotStartsAt;
      return [
        {
          key: c.id as string,
          href: needsSlot ? `/dashboard/graduacao/agendar?m=${m}` : `/dashboard/graduacao?m=${m}`,
          title: needsSlot ? "Escolhe o horário do teu exame" : "Exame de graduação marcado",
          detail: [exam, when((c.slotStartsAt as string | null) ?? (ev.scheduledAt as string)), ev.location].filter(Boolean).join(" · "),
          tone: "primary",
        },
      ];
    }
    const revealAt = ev.resultsRevealAt as string | null;
    return [
      {
        key: c.id as string,
        href: `/dashboard/graduacao?m=${m}`,
        title: "Exame feito — resultado em breve",
        detail: `${exam} · ${revealAt ? `resultado a ${when(revealAt)}` : "resultado numa data a anunciar"}`,
        tone: "warning",
      },
    ];
  });
  // Sem convocatória: está apto e há dias abertos? (Só calcula os requisitos quando há uma agenda aberta.)
  if (items.length === 0) items.push(...(await bookableItems(admin, studentId)));
  if (items.length === 0) return null;

  return (
    <section aria-label="Exame de graduação" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            textDecoration: "none",
            color: "var(--text-primary)",
            border: `2px solid ${TONE[it.tone]}`,
          }}
        >
          {it.tone === "warning" ? (
            <Lock size={22} aria-hidden style={{ flexShrink: 0, color: TONE.warning }} />
          ) : (
            <Award size={22} aria-hidden style={{ flexShrink: 0, color: TONE[it.tone] }} />
          )}
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: 14 }}>{it.title}</strong>
            <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.detail}
            </span>
          </span>
          <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)" }} />
        </Link>
      ))}
    </section>
  );
}

/**
 * Apto para o exame e com dias abertos onde ainda dá para marcar. Calcular a prontidão é pesado,
 * por isso só se faz quando existe alguma agenda aberta (raro: só em época de exames).
 */
async function bookableItems(admin: SupabaseClient, studentId: string): Promise<HomeExamItem[]> {
  const { count } = await admin
    .from("GraduationExamEvent")
    .select("id", { count: "exact", head: true })
    .eq("status", "SCHEDULED")
    .eq("selfBooking", true)
    .gt("endsAt", new Date(Date.now() + SELF_BOOKING_CUTOFF_HOURS * 3_600_000).toISOString());
  if (!count) return [];
  const graduations = await loadStudentGraduations(admin, studentId).catch(() => []);
  return graduations
    .filter((g) => g.progress.isReadyForExam && g.progress.next && g.openAgendaCount > 0 && !g.convocation && !g.awaitingResult)
    .map((g) => ({
      key: `book-${g.modalityCode}`,
      href: `/dashboard/graduacao/agendar?m=${encodeURIComponent(g.modalityCode)}`,
      title: `Estás apto para o exame — ${g.progress.next!.name}`,
      detail: "Escolhe o dia e o horário do teu exame",
      tone: "success" as const,
    }));
}
