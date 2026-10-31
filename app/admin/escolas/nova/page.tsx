import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { redirect } from "next/navigation";
import { SchoolDataForm } from "../SchoolDataForm";

export const dynamic = "force-dynamic";

export default async function NovaEscolaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  if (!isNetworkScope(await getSchoolScope())) redirect("/admin");

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/admin/escolas" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
          ← Escolas
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>Nova escola</h1>
      <p style={{ margin: "0 0 var(--space-5) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Fica em preparação até a abrires: os alunos ainda não a veem. O diretor e os meios de pagamento podem ficar para depois.
      </p>
      <SchoolDataForm />
    </div>
  );
}
