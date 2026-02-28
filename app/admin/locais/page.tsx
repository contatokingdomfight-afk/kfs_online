import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { LocaisManager } from "./LocaisManager";

export const dynamic = "force-dynamic";

export default async function AdminLocaisPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("Location")
    .select("id, name, address, sortOrder")
    .order("sortOrder", { ascending: true });

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>
        Locais
      </h1>
      <p style={{ margin: "0 0 var(--space-5) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Sedes ou estúdios onde decorrem as aulas. Cada aula pode ser associada a um local (útil para várias franquias).
      </p>
      <LocaisManager locations={locations ?? []} />
    </div>
  );
}
