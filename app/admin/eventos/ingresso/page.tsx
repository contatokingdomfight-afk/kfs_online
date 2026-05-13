import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

type Props = { searchParams: Promise<{ token?: string }> };

/** Rota antiga: redireciona para validação por evento. Com `token`, tenta resolver o evento. */
export default async function AdminEventosIngressoRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  if (token && /^[a-f0-9]{48}$/i.test(token)) {
    const result = getAdminClientOrNull();
    if (result.client) {
      const { data: reg } = await result.client.from("EventRegistration").select("eventId").eq("checkin_token", token).maybeSingle();
      const eid = (reg as { eventId?: string } | null)?.eventId;
      if (eid) {
        redirect(`/admin/eventos/${eid}/validar?token=${encodeURIComponent(token)}`);
      }
    }
  }

  redirect("/admin/eventos");
}
