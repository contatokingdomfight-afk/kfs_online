-- «A tratar hoje»: novos alertas (mensalidades a vencer, registados sem plano, aptos para exame, aniversários).
ALTER TABLE "AdminTodoDone" DROP CONSTRAINT IF EXISTS "AdminTodoDone_kind_check";
ALTER TABLE "AdminTodoDone" ADD CONSTRAINT "AdminTodoDone_kind_check" CHECK (
  "kind" IN ('pagamentos', 'vencer', 'risco', 'semplano', 'carga', 'adesao', 'fisicas', 'exame', 'experimentais', 'aniversarios')
);
