-- «Experimentais por confirmar» passa a poder ser marcado como «Confirmado» no «A tratar hoje».
ALTER TABLE "AdminTodoDone" DROP CONSTRAINT IF EXISTS "AdminTodoDone_kind_check";
ALTER TABLE "AdminTodoDone" ADD CONSTRAINT "AdminTodoDone_kind_check" CHECK (
  "kind" IN ('pagamentos', 'seguros', 'encomendas', 'vencer', 'semana', 'risco', 'semplano', 'carga', 'adesao', 'fisicas', 'exame', 'confirmar', 'experimentais', 'aniversarios')
);
