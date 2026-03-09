-- Remove critérios de avaliação duplicados (redundantes com outros já avaliados).
-- Muay Thai Chutes: Inside/Outside low kick, Body kick, Head kick, Teep kick já cobertos por Tae Tat, Tae Klang, Tae Hua e secção Teep.
-- Boxing: Check Hook duplicado em Golpes especiais (já existe em Socos).

DELETE FROM "EvaluationCriterion"
WHERE "componentId" IN (
  SELECT c.id FROM "EvaluationComponent" c
  JOIN "GeneralDimension" d ON c."dimensionId" = d.id
  WHERE d.code = 'MUAY_CHUTES' AND c.modality = 'MUAY_THAI'
)
AND label IN (
  'Inside low kick',
  'Outside low kick',
  'Body kick',
  'Head kick',
  'Teep kick (empurrão)'
);

DELETE FROM "EvaluationCriterion"
WHERE "componentId" IN (
  SELECT c.id FROM "EvaluationComponent" c
  JOIN "GeneralDimension" d ON c."dimensionId" = d.id
  WHERE d.code = 'BOX_GOLPES_ESPECIAIS' AND c.modality = 'BOXING'
)
AND label = 'Check Hook';
