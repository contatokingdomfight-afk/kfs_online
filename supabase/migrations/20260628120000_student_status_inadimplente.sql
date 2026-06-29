-- Estado INADIMPLENTE: aluno com mensalidade em atraso (Payment LATE) ou acesso suspenso.
-- Após 2 meses em atraso → INATIVO (sincronizado em lib/student-payment-status.ts).

ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'INADIMPLENTE';

COMMENT ON TYPE "StudentStatus" IS 'ATIVO = em dia; INADIMPLENTE = pagamento em atraso; INATIVO = 2+ meses em atraso ou baixa manual; EXPERIMENTAL = aula experimental.';
