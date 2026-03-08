-- Seed: conhecimentos táticos do Boxing para avaliação (instrutor avalia atleta)
-- 9 categorias táticas, 45 critérios. Estrutura: GeneralDimension + EvaluationComponent + EvaluationCriterion.
-- Só insere se não existir (dimensão por code; componente por modality+dimensionId; critérios só se o componente não tiver nenhum).

-- 1) Dimensões táticas (categorias) para Boxing
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_POSICIONAMENTO', 'Posicionamento e circulação no ringue', 300
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_POSICIONAMENTO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_DISTANCIA', 'Controle de distância', 301
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_DISTANCIA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_PRESSAO', 'Pressão e controle', 302
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_PRESSAO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_TEMPO_RITMO', 'Tempo e ritmo', 303
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_TEMPO_RITMO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_OFENSIVA', 'Estratégias ofensivas', 304
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_OFENSIVA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_DEFENSIVA', 'Estratégias defensivas', 305
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_DEFENSIVA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_INFIGHT', 'Infight (luta curta)', 306
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_INFIGHT');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_PSICOLOGICO', 'Controle psicológico', 307
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_PSICOLOGICO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_TATICO_LEITURA', 'Leitura de luta', 308
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_TATICO_LEITURA');

-- 2) Componentes de avaliação para BOXING (uma por dimensão tática)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BOXING', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code IN (
  'BOX_TATICO_POSICIONAMENTO','BOX_TATICO_DISTANCIA','BOX_TATICO_PRESSAO','BOX_TATICO_TEMPO_RITMO',
  'BOX_TATICO_OFENSIVA','BOX_TATICO_DEFENSIVA','BOX_TATICO_INFIGHT','BOX_TATICO_PSICOLOGICO','BOX_TATICO_LEITURA'
)
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BOXING' AND c."dimensionId" = d.id);

-- 3) Critérios táticos por categoria
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Posicionamento e circulação no ringue (1-6)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_POSICIONAMENTO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Posicionamento e circulação no ringue',
      'Controle do adversário com a mão da frente (jab)',
      'Fintas para entrada e saída',
      'Combinações de ataque (mãos) com movimentação de ringue',
      'Saídas após o ataque',
      'Controle de ringue após as saídas'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle de distância (7-11)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_DISTANCIA' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Gestão de distância longa',
      'Gestão de média distância',
      'Gestão de curta distância (infight)',
      'Quebra de distância do adversário',
      'Controle de distância com jab'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Pressão e controle (12-16)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_PRESSAO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Pressão constante',
      'Pressão inteligente (sem se expor)',
      'Condução do adversário para as cordas',
      'Condução do adversário para o corner',
      'Controle do centro do ringue'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Tempo e ritmo (17-21)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_TEMPO_RITMO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Controle de ritmo da luta',
      'Mudança de ritmo',
      'Ataque no tempo do adversário',
      'Interceptação com jab',
      'Contra-ataque imediato'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Estratégias ofensivas (22-27)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_OFENSIVA' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Combinações curtas',
      'Combinações longas',
      'Ataques em dois níveis (corpo e cabeça)',
      'Ataque após defesa',
      'Ataque após esquiva',
      'Ataque após bloqueio'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Estratégias defensivas (28-32)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_DEFENSIVA' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Defesa com guarda',
      'Defesa com deslocamento',
      'Defesa com esquivas',
      'Defesa com clinch',
      'Defesa com contra-ataque'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Infight / luta curta (33-37)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_INFIGHT' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Controle de espaço na curta distância',
      'Uso de uppercuts na curta distância',
      'Uso de ganchos no corpo',
      'Controle de braços do adversário',
      'Saídas seguras da curta distância'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle psicológico (38-41)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_PSICOLOGICO' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Quebra de ritmo do adversário',
      'Pressão psicológica constante',
      'Manutenção da calma sob pressão',
      'Presença dominante no ringue'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Leitura de luta (42-45)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_TATICO_LEITURA' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Identificação de padrões do adversário',
      'Exploração de aberturas defensivas',
      'Ajustes táticos durante a luta',
      'Manipulação do tempo do adversário'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
