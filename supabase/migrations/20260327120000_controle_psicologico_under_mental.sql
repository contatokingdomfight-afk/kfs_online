-- Controle psicológico: passa do pilar tático para Mental na UI e no mapeamento do radar (_MENTAL_).
-- GeneralDimension.name = "Mental" + EvaluationComponent.name = "Controle psicológico" → "Mental - Controle psicológico" em load-evaluation-config.

UPDATE "GeneralDimension"
SET
  code = 'MUAY_MENTAL_PSICOLOGICO',
  name = 'Mental'
WHERE code = 'MUAY_TATICO_PSICOLOGICO';

UPDATE "GeneralDimension"
SET
  code = 'BOX_MENTAL_PSICOLOGICO',
  name = 'Mental'
WHERE code = 'BOX_TATICO_PSICOLOGICO';

-- Garantir que o componente mantém o rótulo da subcategoria (distinto de dim.name).
UPDATE "EvaluationComponent" c
SET name = 'Controle psicológico'
FROM "GeneralDimension" d
WHERE c."dimensionId" = d.id
  AND d.code IN ('MUAY_MENTAL_PSICOLOGICO', 'BOX_MENTAL_PSICOLOGICO')
  AND (c.name IS DISTINCT FROM 'Controle psicológico');
