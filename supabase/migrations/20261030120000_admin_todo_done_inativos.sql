-- «Alunos inativados» passa a poder ser marcado como «Removido do grupo» no «A tratar hoje».
ALTER TABLE "AdminTodoDone" DROP CONSTRAINT IF EXISTS "AdminTodoDone_kind_check";
ALTER TABLE "AdminTodoDone" ADD CONSTRAINT "AdminTodoDone_kind_check" CHECK (
  "kind" IN ('pagamentos', 'seguros', 'encomendas', 'vencer', 'semana', 'risco', 'inativos', 'semplano', 'carga', 'adesao', 'fisicas', 'performance', 'exame', 'confirmar', 'experimentais', 'aniversarios')
);
