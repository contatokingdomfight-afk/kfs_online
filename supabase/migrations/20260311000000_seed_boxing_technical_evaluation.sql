-- Seed: técnicas e golpes do Boxing para avaliação (EvaluationComponent + EvaluationCriterion)
-- Categorias: Socos, Combinações básicas, Golpes no corpo, Golpes especiais, Defesas, Movimentação, Infight.
-- Só insere se ainda não existir configuração para BOXING nestas dimensões (não sobrescreve dados existentes).

-- 1) Dimensões técnicas para Boxing
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_SOCOS', 'Socos (Punches)', 400
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_SOCOS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_COMBINACOES', 'Combinações básicas', 401
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_COMBINACOES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_GOLPES_CORPO', 'Golpes no corpo', 402
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_GOLPES_CORPO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_GOLPES_ESPECIAIS', 'Golpes especiais', 403
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_GOLPES_ESPECIAIS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_DEFESAS', 'Defesas', 404
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_DEFESAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_MOVIMENTACAO', 'Movimentação', 405
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_MOVIMENTACAO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_INFIGHT_TEC', 'Infight', 406
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_INFIGHT_TEC');

-- 2) Componentes de avaliação para BOXING (uma por dimensão técnica)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BOXING', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code IN (
  'BOX_SOCOS','BOX_COMBINACOES','BOX_GOLPES_CORPO','BOX_GOLPES_ESPECIAIS',
  'BOX_DEFESAS','BOX_MOVIMENTACAO','BOX_INFIGHT_TEC'
)
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BOXING' AND c."dimensionId" = d.id);

-- 3) Critérios (técnicas) por categoria
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Socos (Punches) - 14
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_SOCOS' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Jab',
      'Double Jab',
      'Triple Jab',
      'Cross (Straight Right / Straight Left)',
      'Lead Hook',
      'Rear Hook',
      'Lead Uppercut',
      'Rear Uppercut',
      'Overhand Right',
      'Overhand Left',
      'Shovel Hook',
      'Check Hook',
      'Long Hook',
      'Short Hook'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Combinações básicas - 7
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_COMBINACOES' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Jab → Cross',
      'Jab → Cross → Hook',
      'Jab → Cross → Hook → Cross',
      'Double Jab → Cross',
      'Jab → Cross → Uppercut',
      'Hook → Cross',
      'Uppercut → Hook'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Golpes no corpo - 6
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_GOLPES_CORPO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Body Jab',
      'Body Cross',
      'Lead Hook to the Body',
      'Rear Hook to the Body',
      'Body Uppercut',
      'Shovel Hook to the Body'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Golpes especiais - 7
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_GOLPES_ESPECIAIS' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Counter Jab',
      'Pull Counter',
      'Check Hook',
      'Gazelle Punch',
      'Corkscrew Punch',
      'Step-in Punch',
      'Leaping Hook'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Defesas (Bloqueios + Esquivas + Aparos) - 12
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_DEFESAS' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'High Guard Block',
      'Elbow Block',
      'Cross Arm Block',
      'Slip',
      'Double Slip',
      'Bob and Weave',
      'Duck',
      'Pull Back',
      'Lean Back',
      'Parry Jab',
      'Parry Cross',
      'Catch Jab'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Movimentação - 8
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_MOVIMENTACAO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Step Forward',
      'Step Back',
      'Lateral Step',
      'Pivot Left',
      'Pivot Right',
      'Shuffle Step',
      'Drop Step',
      'Switch Step'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Infight (técnico) - 5
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_INFIGHT_TEC' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Short Hook',
      'Short Uppercut',
      'Shoulder Bump',
      'Frame Control',
      'Clinch Control'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
