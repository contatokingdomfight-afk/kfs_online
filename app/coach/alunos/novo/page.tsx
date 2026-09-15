import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { DropInQuickRegisterForm } from "@/app/admin/alunos/novo/DropInQuickRegisterForm";

export default async function CoachAlunosNovoAvulsoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach/alunos"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1
        style={{
          margin: "0 0 clamp(16px, 4vw, 20px) 0",
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        Aluno avulso
      </h1>
      <DropInQuickRegisterForm
        backHref="/coach/alunos"
        studentDetailHref={(id) => `/coach/alunos/${id}`}
      />
    </div>
  );
}
