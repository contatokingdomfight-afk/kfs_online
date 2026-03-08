-- Seed: conhecimentos táticos do Muay Thai para avaliação (instrutor avalia atleta)
-- 9 categorias táticas, 45 critérios. Estrutura: GeneralDimension + EvaluationComponent + EvaluationCriterion.
-- Só insere se não existir (dimensão por code; componente por modality+dimensionId; critérios só se o componente não tiver nenhum).

-- 1) Dimensões táticas (categorias)
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_POSICIONAMENTO', 'Posicionamento e circulação no ringue', 200
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_POSICIONAMENTO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_DISTANCIA', 'Controle de distância', 201
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_DISTANCIA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_PRESSAO', 'Pressão e controle', 202
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_PRESSAO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_TEMPO_RITMO', 'Tempo e ritmo', 203
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_TEMPO_RITMO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_OFENSIVA', 'Estratégias ofensivas', 204
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_OFENSIVA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_DEFENSIVA', 'Estratégias defensivas', 205
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_DEFENSIVA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_PSICOLOGICO', 'Controle psicológico', 206
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_PSICOLOGICO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_LEITURA', 'Leitura de luta', 207
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_LEITURA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TATICO_CLINCH', 'Clinch tático', 208
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TATICO_CLINCH');

-- 2) Componentes de avaliação para MUAY_THAI (uma por dimensão tática)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_THAI', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code IN (
  'MUAY_TATICO_POSICIONAMENTO','MUAY_TATICO_DISTANCIA','MUAY_TATICO_PRESSAO','MUAY_TATICO_TEMPO_RITMO',
  'MUAY_TATICO_OFENSIVA','MUAY_TATICO_DEFENSIVA','MUAY_TATICO_PSICOLOGICO','MUAY_TATICO_LEITURA','MUAY_TATICO_CLINCH'
)
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MUAY_THAI' AND c."dimensionId" = d.id);

-- 3) Critérios táticos por categoria
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Posicionamento e circulação no ringue (1-6)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_POSICIONAMENTO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Posicionamento e circulação no ringue',
      'Controle do adversário com a mão da frente (jab)',
      'Fintas para entrada e saída',
      'Combinações de ataque com pernas (entradas e movimentação de ringue)',
      'Saídas após o ataque',
      'Controle de ringue após as saídas'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle de distância (7-11)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_DISTANCIA' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Gestão de distância longa',
      'Gestão de média distância',
      'Gestão de curta distância (clinch)',
      'Transições entre distâncias',
      'Quebra de distância do adversário'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Pressão e controle (12-16)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_PRESSAO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Pressão constante no adversário',
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
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_TEMPO_RITMO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Controle de ritmo da luta',
      'Mudança de ritmo (acelerar e desacelerar)',
      'Ataque no tempo do adversário',
      'Interceptação de golpes',
      'Contra-ataque imediato'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Estratégias ofensivas (22-27)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_OFENSIVA' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Ataque em sequência (combinações)',
      'Ataque em dois níveis (corpo e cabeça)',
      'Ataque em três níveis (perna, corpo, cabeça)',
      'Ataque após defesa',
      'Ataque após fintas',
      'Ataque após erro do adversário'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Estratégias defensivas (28-32)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_DEFENSIVA' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Defesa ativa (bloquear e responder)',
      'Defesa com deslocamento',
      'Defesa com contra-ataque',
      'Defesa com clinch',
      'Defesa com quebra de ritmo'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle psicológico (33-36)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_PSICOLOGICO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Quebra de confiança do adversário',
      'Manutenção da calma sob pressão',
      'Uso de presença e postura dominante',
      'Leitura de padrões do adversário'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Leitura de luta (37-40)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_LEITURA' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Identificação de padrões do adversário',
      'Exploração de falhas defensivas',
      'Identificação do timing do adversário',
      'Ajustes táticos durante a luta'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Clinch tático (41-45)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TATICO_CLINCH' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Entrada estratégica no clinch',
      'Quebra de postura no clinch',
      'Controle de braços no clinch',
      'Criação de espaço para joelhadas',
      'Saída segura do clinch'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
