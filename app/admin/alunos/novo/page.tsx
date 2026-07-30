import Link from "next/link";
import { NovoAlunoForm } from "./NovoAlunoForm";

export default function AdminAlunosNovoPage() {
  return (
    <div style={{ maxWidth: "min(480px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/alunos"
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
        Novo aluno
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        <strong>Enviar convite</strong> — o aluno recebe email para definir a senha.{" "}
        <strong>Cadastro presencial</strong> — a secretaria cria a conta com senha inicial (adultos com email da ficha;
        menores com email interno @alunos.kingdomfight.pt). Depois atribui o plano e regista pagamentos no financeiro.
      </p>
      <NovoAlunoForm />
    </div>
  );
}
