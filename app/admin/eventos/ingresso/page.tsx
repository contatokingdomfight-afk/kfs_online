import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { IngressoValidator, type IngressoPreview } from "./IngressoValidator";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AdminEventosIngressoPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const notAdmin = dbUser.role !== "ADMIN";
  const invalidToken = Boolean(token && !/^[a-f0-9]{48}$/i.test(token));

  let preview: IngressoPreview | null = null;

  if (!notAdmin && token && !invalidToken) {
    const result = getAdminClientOrNull();
    if (!result.client) return <AdminConfigMissing errorType={result.error} />;
    const supabase = result.client;

    const { data: reg } = await supabase
      .from("EventRegistration")
      .select("id, status, checkin_used_at, eventId, studentId")
      .eq("checkin_token", token)
      .maybeSingle();

    if (reg) {
      const { data: event } = await supabase.from("Event").select("name").eq("id", reg.eventId).maybeSingle();
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

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/eventos" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
          ← Eventos
        </Link>
      </div>
      <IngressoValidator token={token} preview={preview} invalidToken={invalidToken} notAdmin={notAdmin} />
    </div>
  );
}
