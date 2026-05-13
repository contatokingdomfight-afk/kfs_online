import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { redirect } from "next/navigation";
import { IngressoValidator, type IngressoPreview } from "./IngressoValidator";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminEventoValidarIngressoPage({ params, searchParams }: Props) {
  const { id: eventId } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const notAdmin = dbUser.role !== "ADMIN";
  const invalidToken = Boolean(token && !/^[a-f0-9]{48}$/i.test(token));

  let preview: IngressoPreview | null = null;
  let wrongEvent = false;
  let eventTitle = eventId;

  if (notAdmin) {
    return (
      <div style={{ maxWidth: "min(560px, 100%)" }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/admin/eventos/${eventId}`}
            style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}
          >
            ← {eventTitle}
          </Link>
        </div>
        <IngressoValidator
          eventId={eventId}
          locale={locale}
          token={token}
          preview={null}
          invalidToken={invalidToken}
          notAdmin={notAdmin}
          wrongEvent={wrongEvent}
        />
      </div>
    );
  }

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: evMeta } = await supabase.from("Event").select("name").eq("id", eventId).maybeSingle();
  if (evMeta?.name?.trim()) eventTitle = evMeta.name.trim();

  if (token && !invalidToken) {
    const { data: anyReg } = await supabase.from("EventRegistration").select("eventId").eq("checkin_token", token).maybeSingle();

    if (anyReg && (anyReg as { eventId?: string }).eventId !== eventId) {
      wrongEvent = true;
    } else {
      const { data: reg } = await supabase
        .from("EventRegistration")
        .select("id, status, checkin_used_at, eventId, studentId")
        .eq("checkin_token", token)
        .eq("eventId", eventId)
        .maybeSingle();

      if (reg) {
        const { data: event } = await supabase.from("Event").select("name").eq("id", eventId).maybeSingle();
        const { data: student } = await supabase.from("Student").select("userId").eq("id", reg.studentId).maybeSingle();
        let studentName = "Aluno";
        if (student?.userId) {
          const { data: u } = await supabase.from("User").select("name").eq("id", student.userId).maybeSingle();
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
        <Link
          href={`/admin/eventos/${eventId}`}
          style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}
        >
          ← {eventTitle}
        </Link>
      </div>
      <IngressoValidator
        eventId={eventId}
        locale={locale}
        token={token}
        preview={preview}
        invalidToken={invalidToken}
        notAdmin={false}
        wrongEvent={wrongEvent}
      />
    </div>
  );
}
