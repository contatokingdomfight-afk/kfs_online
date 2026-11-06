-- Reabre candidatos reprovados num exame de graduação para o coach decidir de novo.
-- As notas (GraduationExamScore) ficam; ao reabrir a ficha, o resultado é recalculado
-- com a nota mínima atual do grau (2,5).
-- Nota: se o resultado já foi revelado, o aluno já recebeu a notificação de reprovação.

-- 1) Ver os reprovados de hoje (copiar os "id" dos alunos certos)
SELECT c.id, u.name AS aluno, e.title AS exame, c.status, c."decidedAt", c."revealedAt"
FROM "GraduationExamCandidate" c
JOIN "GraduationExamEvent" e ON e.id = c."eventId"
JOIN "Student" s ON s.id = c."studentId"
LEFT JOIN "User" u ON u.id = s."userId"
WHERE c.status = 'FAILED'
  AND c."decidedAt" >= current_date
ORDER BY c."decidedAt";

-- 2) Reabrir (substituir pelos ids da consulta acima)
UPDATE "GraduationExamCandidate"
SET status = 'CONVOKED',
    result = NULL,
    "decidedAt" = NULL,
    "decidedByUserId" = NULL,
    "revealedAt" = NULL,
    "pendingGrades" = NULL
WHERE id IN ('ID_ALUNO_1', 'ID_ALUNO_2')
  AND status = 'FAILED';
