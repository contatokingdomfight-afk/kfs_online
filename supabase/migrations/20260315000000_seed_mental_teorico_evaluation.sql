-- Seed: componentes e critérios de avaliação para as dimensões Mental e Teórico.
-- Permite ao coach avaliar Mental e Teórico (além de Técnico, Tático e Físico) por modalidade.
-- Usa as GeneralDimension já existentes (code = 'mental', code = 'teorico').

-- 1) Componentes "Mental" para cada modalidade (se ainda não existirem)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_THAI', d.id, d.name, 500
FROM "GeneralDimension" d
WHERE d.code = 'mental'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MUAY_THAI' AND c."dimensionId" = d.id);

INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BOXING', d.id, d.name, 500
FROM "GeneralDimension" d
WHERE d.code = 'mental'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BOXING' AND c."dimensionId" = d.id);

INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'KICKBOXING', d.id, d.name, 500
FROM "GeneralDimension" d
WHERE d.code = 'mental'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'KICKBOXING' AND c."dimensionId" = d.id);

-- 2) Componentes "Teórico" para cada modalidade (se ainda não existirem)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_THAI', d.id, d.name, 501
FROM "GeneralDimension" d
WHERE d.code = 'teorico'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MUAY_THAI' AND c."dimensionId" = d.id);

INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BOXING', d.id, d.name, 501
FROM "GeneralDimension" d
WHERE d.code = 'teorico'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BOXING' AND c."dimensionId" = d.id);

INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'KICKBOXING', d.id, d.name, 501
FROM "GeneralDimension" d
WHERE d.code = 'teorico'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'KICKBOXING' AND c."dimensionId" = d.id);

-- 3) Critérios Mental (comuns a todas as modalidades: Foco e atitude + Competição)
DO $$
DECLARE
  comp_id uuid;
  crit_mental text[] := ARRAY[
    'Concentração durante o treino',
    'Resiliência',
    'Confiança',
    'Controlo sob pressão',
    'Tomada de decisão',
    'Disciplina'
  ];
  r text;
  ord int;
  mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI','BOXING','KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id
    FROM "EvaluationComponent" c
    JOIN "GeneralDimension" d ON c."dimensionId" = d.id
    WHERE d.code = 'mental' AND c.modality = mod_code
    LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
      ord := 0;
      FOREACH r IN ARRAY crit_mental
      LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder")
        VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord);
        ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 4) Critérios Teórico (comuns: Conhecimento + Aplicação)
DO $$
DECLARE
  comp_id uuid;
  crit_teorico text[] := ARRAY[
    'Regras e arbitragem',
    'Conceitos técnicos (posição, guarda, ângulos)',
    'Tática e estratégia teórica',
    'Relaciona teoria com prática',
    'Compreensão dos feedbacks do treinador'
  ];
  r text;
  ord int;
  mod_code text;
BEGIN
  FOR mod_code IN SELECT unnest(ARRAY['MUAY_THAI','BOXING','KICKBOXING'])
  LOOP
    SELECT c.id INTO comp_id
    FROM "EvaluationComponent" c
    JOIN "GeneralDimension" d ON c."dimensionId" = d.id
    WHERE d.code = 'teorico' AND c.modality = mod_code
    LIMIT 1;
    IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
      ord := 0;
      FOREACH r IN ARRAY crit_teorico
      LOOP
        INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder")
        VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord);
        ord := ord + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;
