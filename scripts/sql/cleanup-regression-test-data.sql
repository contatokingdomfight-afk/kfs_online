-- Limpeza dos dados criados na regressão manual em produção (jul/2026).
-- Contas: demo@teste.com, kfs.test.aluno@local.test, kfs.test.experimental@local.test
-- NÃO remove: boretok913@epaynine.com, kewes96529@epaynine.com (experimentais reais).
-- Mantém pagamentos LATE do demo (cenário «pendentes» documentado em TESTE_REGRESSAO_PRODUCAO.md).
-- Correr no SQL Editor Supabase (produção) após regressão; rever IDs se a sessão criar registos novos.

BEGIN;

CREATE TEMP TABLE _test_students AS
SELECT s.id
FROM "Student" s
JOIN "User" u ON u.id = s."userId"
WHERE u.email IN (
  'demo@teste.com',
  'kfs.test.aluno@local.test',
  'kfs.test.experimental@local.test'
);

-- Loja
DELETE FROM "RetailSaleLine" WHERE "saleId" = '78673cbd-95f7-4a83-b799-41bade282b1b';
DELETE FROM "RetailSale" WHERE id = '78673cbd-95f7-4a83-b799-41bade282b1b';

-- Evento
DELETE FROM "EventRegistration" WHERE id = 'f88a420e-5584-4ba9-91be-59243cb3f1c0';

-- Biblioteca
DELETE FROM "CourseUnitProgress" WHERE id = '06b313c0-3fe9-4e88-a0a3-238800a333d7';

-- Check-in / bem-estar
DELETE FROM "PreLessonWellness" WHERE id IN (
  'd55d834a-381e-4716-9560-0453443651f9',
  'f32871d2-54e3-4658-90fc-e486c575eef5',
  '8875bc7a-91b1-44c7-9f1e-78754ce42f62'
);

DELETE FROM "Attendance" WHERE id IN (
  '713219a3-9bfa-4262-b6eb-20685e654e41',
  '0a2d87fa-e69f-4988-9833-40a905b11eee',
  'a52c8a2e-6af3-456e-a1e1-64f3ccba2058'
);

-- Financeiro: só PAID da sessão de teste (>= 2026-07-08)
DELETE FROM "Payment"
WHERE "studentId" IN (SELECT id FROM _test_students)
  AND status = 'PAID'
  AND "createdAt" >= '2026-07-08 00:00:00+00';

DELETE FROM "StudentInsuranceCoverage"
WHERE "studentId" IN (SELECT id FROM _test_students)
  AND "createdAt" >= '2026-07-08 00:00:00+00';

COMMIT;

-- Variante genérica (próximas regressões): descomentar e ajustar a data
-- DELETE FROM "Payment"
-- WHERE "studentId" IN (SELECT id FROM _test_students)
--   AND status = 'PAID'
--   AND "createdAt" >= '<DATA_INICIO_REGRESSAO>';
