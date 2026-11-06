-- Baixa a nota mínima de aprovação no exame de graduação de 3 para 2,5
-- em todos os graus que ainda estão com 3 (não mexe em graus com outro valor).
-- Não altera exames já decididos (PASSED/FAILED ficam como estão).

-- 1) Ver o que vai mudar
SELECT t."modalityCode", g."sortOrder", g.name, g."passMinAxisAvg"
FROM "GraduationGrade" g
JOIN "GraduationTemplate" t ON t.id = g."templateId"
WHERE g."passMinAxisAvg" = 3
ORDER BY t."modalityCode", g."sortOrder";

-- 2) Aplicar
UPDATE "GraduationGrade"
SET "passMinAxisAvg" = 2.5, "updatedAt" = now()
WHERE "passMinAxisAvg" = 3;
