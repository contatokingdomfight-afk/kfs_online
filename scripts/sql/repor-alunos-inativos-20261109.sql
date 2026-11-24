-- Repor como INATIVO os alunos revertidos pelo cron (2026-11-09).
-- Carlos Alberto, Renata Hermenegildo (já INATIVO), Valentin Davydian, Rodrigo Correia.
-- Correr só depois do deploy de b1933d0 estar no ar.

BEGIN;

-- Mensalidades em atraso geradas depois da inativação (out./nov.)
DELETE FROM "Payment"
WHERE "studentId" IN (
  '0c45ecf0-9252-4174-a19a-6c7386e4d33e', -- Carlos Alberto
  'f17c8bf6-5061-4663-9fc0-df8d98264d4b', -- Renata Hermenegildo
  'e9009b34-4ed5-409e-b830-c4cfc9151817', -- Valentin Davydian
  'dee7b5e9-1741-4a43-9dad-5dfc86f9e65b'  -- Rodrigo Correia
)
  AND status = 'LATE' AND "paymentType" = 'TUITION'
  AND "referenceMonth" >= '2026-10';

UPDATE "Student"
SET status = 'INATIVO', "statusChangedAt" = now(),
    "paymentGraceEndsAt" = NULL, "paymentGraceReferenceMonth" = NULL
WHERE id IN (
  '0c45ecf0-9252-4174-a19a-6c7386e4d33e',
  'f17c8bf6-5061-4663-9fc0-df8d98264d4b',
  'e9009b34-4ed5-409e-b830-c4cfc9151817',
  'dee7b5e9-1741-4a43-9dad-5dfc86f9e65b'
);

COMMIT;
