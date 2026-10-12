-- «A tratar hoje»: novo alerta «Seguros e matrículas em atraso».
ALTER TABLE "AdminTodoDone" DROP CONSTRAINT IF EXISTS "AdminTodoDone_kind_check";
ALTER TABLE "AdminTodoDone" ADD CONSTRAINT "AdminTodoDone_kind_check" CHECK (
  "kind" IN ('pagamentos', 'seguros', 'vencer', 'risco', 'semplano', 'carga', 'adesao', 'fisicas', 'exame', 'experimentais', 'aniversarios')
);
