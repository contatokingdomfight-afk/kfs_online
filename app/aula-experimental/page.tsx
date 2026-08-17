import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { formatLessonDate } from "@/lib/lesson-utils";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";
import { FormularioExperimental } from "./FormularioExperimental";
import { getDefaultOnboardingSchoolId, sortSchoolsForOnboarding } from "@/lib/onboarding-default-school";
import { SCHOOL_PUBLIC_CONTACT } from "@/lib/school-contact";

type SearchParams = Promise<{ sucesso?: string; data?: string; hora?: string }>;

function ymdToPtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function buildTrialWhatsAppUrl(phone: string, data?: string, hora?: string): string {
  const digits = phone.replace(/\D/g, "");
  const quando = data && hora ? `no dia ${ymdToPtDate(data)} às ${hora} horas` : "";
  const message = `Olá! Gostaria de confirmar a minha aula experimental${quando ? " " + quando : ""}!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Slot com ocorrência concreta (recorrentes incluídos). */
export type LessonSlot = { id: string; occurrenceDate: string; label: string };

export default async function AulaExperimentalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sucesso = params.sucesso === "1";
  const whatsappUrl = buildTrialWhatsAppUrl(SCHOOL_PUBLIC_CONTACT.phone, params.data, params.hora);

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} backHref="/" backLabel="← Voltar à página inicial" />;
  const supabase = result.client;
  const today = calendarDateLisbon(new Date());
  const rangeEnd = addDaysYmd(today, 56);

  const [modalities, schoolsRes, lessonsRes] = await Promise.all([
    getCachedModalityRefs(supabase),
    supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true }),
    supabase
      .from("Lesson")
      .select(
        "id, modality, date, weekday, startTime, endTime, schoolId, isOneOff, isOpenClass, offerTrialBooking, locationId, coachId, capacity, planningNotes"
      )
      .order("startTime", { ascending: true }),
  ]);

  const schools = sortSchoolsForOnboarding(schoolsRes.data ?? []);
  const defaultSchoolId = getDefaultOnboardingSchoolId(schools);
  const lessonsRaw = lessonsRes.data ?? [];
  const schoolIds = new Set(schools.map((s) => s.id));
  const lessonsForActiveSchools = lessonsRaw.filter((row) => {
    const r = row as { schoolId?: string; offerTrialBooking?: boolean };
    const sid = r.schoolId;
    if (!sid || !schoolIds.has(sid)) return false;
    if (r.offerTrialBooking === false) return false;
    return true;
  });

  const lessonIds = lessonsForActiveSchools.map((l) => (l as { id: string }).id);
  const cancellations = await fetchLessonCancellations(supabase, lessonIds);

  const modalityOptions = (modalities ?? []).map((m) => ({ value: m.code, label: m.name }));

  /** schoolId -> modality code -> slots */
  const lessonsBySchoolId: Record<string, Record<string, LessonSlot[]>> = {};
  for (const s of schools) {
    lessonsBySchoolId[s.id] = {};
    for (const m of modalityOptions) {
      lessonsBySchoolId[s.id][m.value] = [];
    }
  }

  for (const school of schools) {
    const defs = rowsToLessonDefinitions(
      lessonsForActiveSchools.filter((row) => (row as { schoolId?: string }).schoolId === school.id)
    );
    const expanded = expandLessonsForDateRange(defs, cancellations, today, rangeEnd);
    for (const occ of expanded) {
      const mod = occ.modality ?? "OTHER";
      if (!lessonsBySchoolId[school.id][mod]) lessonsBySchoolId[school.id][mod] = [];
      lessonsBySchoolId[school.id][mod].push({
        id: occ.id,
        occurrenceDate: occ.occurrenceDate,
        label: `${formatLessonDate(occ.occurrenceDate)} · ${occ.startTime}–${occ.endTime}`,
      });
    }
  }

  if (sucesso) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "var(--bg)" }}>
        <div className="container-mobile">
          <h1 className="text-mobile-lg font-semibold text-center mb-3" style={{ color: "var(--text-primary)" }}>
            Pedido recebido
          </h1>
          <p className="text-mobile-base text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Obrigado! A tua inscrição para a aula experimental foi registada. Entraremos em contacto em breve para confirmar.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full"
            style={{ textAlign: "center", textDecoration: "none", display: "block", marginBottom: "12px" }}
          >
            Fale connosco no WhatsApp
          </a>
          <Link href="/" className="btn btn-secondary w-full" style={{ textAlign: "center", textDecoration: "none" }}>
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6" style={{ backgroundColor: "var(--bg)", paddingTop: "clamp(24px, 6vw, 48px)" }}>
      <div className="container-mobile">
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "clamp(16px, 4vw, 24px)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          ← Voltar
        </Link>
        <h1 className="text-mobile-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Aula experimental
        </h1>
        <p className="text-mobile-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Escolhe o <strong>local</strong>, depois a modalidade e a data. Entraremos em contacto para confirmar a tua vaga.
        </p>
        <FormularioExperimental
          schools={schools.map((s) => ({ id: s.id, name: s.name ?? "" }))}
          defaultSchoolId={defaultSchoolId}
          modalityOptions={modalityOptions}
          lessonsBySchoolId={lessonsBySchoolId}
        />
      </div>
    </main>
  );
}
