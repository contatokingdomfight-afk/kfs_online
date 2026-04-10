-- Remove componentes de avaliação legados criados antes do sistema granular de sub-componentes.
-- Afectam MUAY_THAI, BOXING e KICKBOXING — todos tinham componentes genéricos (sortOrder 0-1)
-- com 1-3 critérios muito básicos, substituídos por sub-componentes detalhados (sortOrder 100+).
-- As avaliações que referenciam esses IDs ficam com chaves órfãs no scores JSON (ignoradas).
--
-- MUAY_THAI: "Técnico" (Jab, Low Kick) e "Tático" (Leitura do adversário) — 1 avaliação histórica
-- BOXING:    "Técnico" (Jab) — 0 avaliações históricas
-- KICKBOXING:"Técnico" (Giratório com a mão) — 0 avaliações; modality é alias de MUAY_THAI no loader

DELETE FROM "EvaluationCriterion"
WHERE "componentId" IN (
  -- MUAY_THAI legados (já removidos em produção nesta sessão, incluídos para idempotência)
  'f4ae7db9-2545-45d5-8e5f-05f07dd09197',
  'f9016f29-ef56-46f2-916d-091f247716d3',
  -- BOXING legado
  '4a62f511-fb2a-4feb-9d38-8fa4299bf045',
  -- KICKBOXING legado
  '7e059123-0661-4afc-a919-b877a8f92e5a'
);

DELETE FROM "EvaluationComponent"
WHERE id IN (
  -- MUAY_THAI legados
  'f4ae7db9-2545-45d5-8e5f-05f07dd09197',
  'f9016f29-ef56-46f2-916d-091f247716d3',
  -- BOXING legado
  '4a62f511-fb2a-4feb-9d38-8fa4299bf045',
  -- KICKBOXING legado
  '7e059123-0661-4afc-a919-b877a8f92e5a'
);
