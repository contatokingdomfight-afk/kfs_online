import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { EscolasManager } from "./EscolasManager";

export const dynamic = "force-dynamic";

export default async function AdminEscolasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("School")
    .select("id, name, address, city, phone, email, isActive")
    .order("name", { ascending: true });

  return (
    <div style={{ maxWidth: "min(800px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>
        Escolas
      </h1>
      <p style={{ margin: "0 0 var(--space-5) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Gestão das escolas físicas da rede Kingdom Fight School. Cada escola pode ter alunos, coaches, aulas e planos próprios.
      </p>
      <EscolasManager schools={schools ?? []} />
    </div>
  );
}
