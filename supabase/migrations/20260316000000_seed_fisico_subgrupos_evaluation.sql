-- Seed: subgrupos da dimensão Físico para avaliação (Força, Explosão, Velocidade, Resistência, Mobilidade, Equilíbrio, Resistência ao impacto).
-- Cada subgrupo é um EvaluationComponent com dimensionId = fisico; critérios 1–10 como os restantes.
-- Aplicado a MUAY_THAI, BOXING e KICKBOXING.
-- Permite vários componentes por dimensão: substitui UNIQUE (modality, dimensionId) por UNIQUE (modality, dimensionId, name).

DROP INDEX IF EXISTS "EvaluationComponent_modality_dimensionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationComponent_modality_dimensionId_name_key"
  ON "EvaluationComponent" (modality, "dimensionId", name)
  WHERE "dimensionId" IS NOT NULL;

DO $$
DECLARE
  fisico_id text := 'e35bbb1c-8e2f-4bc4-a97a-c792eadf4596';
  comp_id text;
  mod_code text;
  subgrupos text[] := ARRAY['Força', 'Explosão', 'Velocidade', 'Resistência', 'Mobilidade', 'Equilíbrio', 'Resistência ao impacto'];
  sort_base int := 502;
  idx int;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    FOR idx IN 1..array_length(subgrupos, 1)
    LOOP
      INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
      SELECT gen_random_uuid()::text, mod_code, fisico_id, subgrupos[idx], sort_base + idx - 1
      WHERE NOT EXISTS (
        SELECT 1 FROM "EvaluationComponent" c
        WHERE c.modality = mod_code AND c."dimensionId" = fisico_id AND c.name = subgrupos[idx]
      );
    END LOOP;
  END LOOP;
END $$;

-- Critérios por subgrupo (comuns a todas as modalidades)
-- Força
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Força geral do corpo',
    'Força de membros superiores (socos, clinch)',
    'Força de membros inferiores (chutes, base)',
    'Força de core (estabilidade e transferência)',
    'Força no clinch'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Força' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Explosão
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Explosão nos socos',
    'Explosão nos chutes',
    'Explosão nas entradas (ataque ou clinch)',
    'Explosão em contra-ataques',
    'Potência geral dos golpes'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Explosão' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Velocidade
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Velocidade de socos',
    'Velocidade de chutes',
    'Velocidade de reação',
    'Velocidade de deslocamento',
    'Velocidade de combinação'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Velocidade' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Resistência
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Resistência cardiovascular (fôlego)',
    'Resistência muscular',
    'Manutenção de potência ao longo do round',
    'Recuperação entre rounds',
    'Consistência física durante o treino/luta'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Resistência' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Mobilidade
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Mobilidade de quadril',
    'Mobilidade de ombros',
    'Flexibilidade para chutes altos',
    'Amplitude de movimento geral'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Mobilidade' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Equilíbrio
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Equilíbrio durante golpes',
    'Estabilidade da base',
    'Controle corporal em deslocamentos',
    'Controle corporal após chutes'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Equilíbrio' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Resistência ao impacto
DO $$
DECLARE
  comp_id text;
  crit text[] := ARRAY[
    'Resistência ao impacto corporal',
    'Resistência a golpes',
    'Recuperação após impacto'
  ];
  r text; ord int; mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI', 'BOXING', 'KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id::text
    WHERE d.code = 'fisico' AND c.modality = mod_code AND c.name = 'Resistência ao impacto' LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
      ord := 0; FOREACH r IN ARRAY crit LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid()::text, comp_id, r, NULL, ord); ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;
