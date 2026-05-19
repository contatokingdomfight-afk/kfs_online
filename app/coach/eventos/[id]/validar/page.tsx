import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { fetchEventCheckInParticipantsForSchool } from "@/lib/event-checkin-participants-school";
import { IngressoValidator, type IngressoPreview } from "@/app/admin/eventos/[id]/validar/IngressoValidator";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function CoachEventoValidarPage({ params, searchParams }: Props) {
  const { id: eventId } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();
  const assistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (!assistant) redirect("/coach");

  const locale = await getLocaleFromCookies();
  const invalidToken = Boolean(token && !/^[a-f0-9]{48}$/i.test(token));

  let preview: IngressoPreview | null = null;
  let wrongEvent = false;
  let eventTitle = eventId;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const adminClient = result.client;

  const [participants, eventNameRes] = await Promise.all([
    fetchEventCheckInParticipantsForSchool(eventId, assistant.schoolId),
    adminClient.from("Event").select("name").eq("id", eventId).maybeSingle(),
  ]);
  if (eventNameRes.data?.name?.trim()) eventTitle = eventNameRes.data.name.trim();

  if (token && !invalidToken) {
    const { data: anyReg } = await adminClient
      .from("EventRegistration")
      .select("eventId, studentId")
      .eq("checkin_token", token)
      .maybeSingle();

    if (anyReg) {
      const eid = (anyReg as { eventId?: string }).eventId;
      const sid = (anyReg as { studentId?: string }).studentId;
      if (eid !== eventId) {
        wrongEvent = true;
      } else if (sid) {
        const { data: st } = await adminClient.from("Student").select("schoolId").eq("id", sid).maybeSingle();
        if (st?.schoolId !== assistant.schoolId) {
          wrongEvent = true;
        }
      }
    }

    if (!wrongEvent) {
      const { data: reg } = await adminClient
        .from("EventRegistration")
        .select("id, status, checkin_used_at, eventId, studentId")
        .eq("checkin_token", token)
        .eq("eventId", eventId)
        .maybeSingle();

      if (reg) {
        const { data: event } = await adminClient.from("Event").select("name").eq("id", eventId).maybeSingle();
        const { data: student } = await adminClient.from("Student").select("userId").eq("id", reg.studentId).maybeSingle();
        let studentName = "Aluno";
        if (student?.userId) {
          const { data: u } = await adminClient.from("User").select("name").eq("id", student.userId).maybeSingle();
          if (u?.name?.trim()) studentName = u.name.trim();
        }
        preview = {
          eventName: (event as { name?: string })?.name ?? "Evento",
          studentName,
          alreadyUsed: Boolean((reg as { checkin_used_at?: string | null }).checkin_used_at),
          status: (reg as { status?: string }).status ?? "",
        };
      }
    }
  }

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/coach/eventos" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
          ← {eventTitle}
        </Link>
      </div>
      <IngressoValidator
        eventId={eventId}
        locale={locale}
        token={token}
        preview={preview}
        invalidToken={invalidToken}
        allowStaffCheckIn
        wrongEvent={wrongEvent}
        participants={participants}
        eventsBasePath="/coach/eventos"
      />
    </div>
  );
}
