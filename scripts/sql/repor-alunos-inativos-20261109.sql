-- Repor alunos que tinham sido inativados à mão e que o cron voltou a pôr
-- INADIMPLENTE/ATIVO (gerando-lhes mensalidades LATE). 2026-11-09.

-- 1) DIAGNÓSTICO: alunos com estado mudado recentemente + mensalidades LATE geradas.
--    Confirma na lista quais são os que tinhas inativado.
SELECT s.id, u.name, u.email, s.status, s."statusChangedAt",
       string_agg(p."referenceMonth" || ' (' || p.amount || ' €)', ', ' ORDER BY p."referenceMonth") AS mensalidades_late
FROM "Student" s
JOIN "User" u ON u.id = s."userId"
LEFT JOIN "Payment" p ON p."studentId" = s.id AND p.status = 'LATE' AND p."paymentType" = 'TUITION'
WHERE s.status IN ('INADIMPLENTE', 'ATIVO')
  AND s."statusChangedAt" >= now() - interval '30 days'
GROUP BY s.id, u.name, u.email, s.status, s."statusChangedAt"
ORDER BY s."statusChangedAt" DESC;

-- 2) CORREÇÃO: preenche os ids confirmados no passo 1.
BEGIN;

-- 2a) apagar as mensalidades LATE geradas depois da inativação (ajusta o mês se for preciso)
DELETE FROM "Payment"
WHERE "studentId" IN ('ID_1', 'ID_2')
  AND status = 'LATE' AND "paymentType" = 'TUITION'
  AND "referenceMonth" >= '2026-10';

-- 2b) voltar a pôr INATIVO
UPDATE "Student"
SET status = 'INATIVO', "statusChangedAt" = now()
WHERE id IN ('ID_1', 'ID_2');

COMMIT;
