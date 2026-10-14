-- «A tratar hoje»: novo alerta «Encomendas da loja por pagar».
ALTER TABLE "AdminTodoDone" DROP CONSTRAINT IF EXISTS "AdminTodoDone_kind_check";
ALTER TABLE "AdminTodoDone" ADD CONSTRAINT "AdminTodoDone_kind_check" CHECK (
  "kind" IN ('pagamentos', 'seguros', 'encomendas', 'vencer', 'risco', 'semplano', 'carga', 'adesao', 'fisicas', 'exame', 'experimentais', 'aniversarios')
);
