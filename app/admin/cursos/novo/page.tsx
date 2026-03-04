import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { CursoForm } from "../CursoForm";

export default async function AdminCursosNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();
  const modalities = await getCachedModalityRefs(supabase);

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/cursos"
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
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Novo curso
      </h1>
      <div
        style={{
          margin: "0 0 clamp(20px, 5vw, 24px) 0",
          padding: "clamp(12px, 3vw, 14px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
          fontSize: "clamp(13px, 3.2vw, 14px)",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--text-primary)" }}>Passo 1:</strong> Preenche os dados gerais do curso abaixo e clica em "Criar curso".<br />
        <strong style={{ color: "var(--text-primary)" }}>Passo 2:</strong> Serás redirecionado para a página de edição onde poderás adicionar <strong>módulos</strong> e <strong>unidades</strong> (vídeos e textos) ao curso.
      </div>
      <CursoForm modalities={modalities ?? []} />
    </div>
  );
}
