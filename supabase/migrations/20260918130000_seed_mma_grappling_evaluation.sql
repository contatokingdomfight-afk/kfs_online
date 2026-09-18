-- Seed: fundamentos de grappling/wrestling/chão do MMA para avaliação (EvaluationComponent +
-- EvaluationCriterion). MMA já tinha critérios de striking clonados de Muay Thai + Boxing
-- (ver 20260411120000_mma_evaluation_clone_muay_boxing.sql) mas nada específico de clinch de
-- MMA, wrestling, chão ou táticas de octógono — este seed fecha essa lacuna, complementando
-- (não substitui) o que já existe.
-- Categorias técnicas: Clinch de MMA, Wrestling (quedas), Defesa de queda, Ground and pound,
-- Transições em grappling, Finalizações de MMA, Levantar-se.
-- Categorias táticas: Gestão de distância/ranges, Controle de espaço (cage/ringue), Leitura de
-- padrões, Gestão de ritmo, Tomada de decisão, Transição entre fases de combate, Plano de jogo,
-- Controle psicológico.
-- Só insere se ainda não existir configuração para estas categorias via componentes (não
-- sobrescreve os critérios de striking já clonados).

-- 1) Dimensões (categorias) técnicas novas para MMA
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_CLINCH', 'Clinch de MMA', 300
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_CLINCH');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_WRESTLING', 'Wrestling (quedas)', 301
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_WRESTLING');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_DEFESA_QUEDA', 'Defesa de queda', 302
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_DEFESA_QUEDA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_GROUND_POUND', 'Ground and pound', 303
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_GROUND_POUND');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TRANSICOES', 'Transições em grappling', 304
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TRANSICOES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_FINALIZACOES', 'Finalizações de MMA', 305
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_FINALIZACOES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_LEVANTAR', 'Levantar-se', 306
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_LEVANTAR');

-- 2) Dimensões (categorias) táticas novas para MMA
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_DISTANCIA', 'Gestão de distância e ranges', 400
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_DISTANCIA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_CONTROLE_ESPACO', 'Controle de espaço (cage/ringue)', 401
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_CONTROLE_ESPACO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_LEITURA', 'Leitura de padrões e adaptação', 402
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_LEITURA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_RITMO', 'Gestão de ritmo e energia', 403
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_RITMO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_DECISAO', 'Tomada de decisão e gestão de risco', 404
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_DECISAO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_TRANSICAO_FASES', 'Transição entre fases de combate', 405
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_TRANSICAO_FASES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_PLANO', 'Plano de jogo e ajustes', 406
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_PLANO');

-- Nome com "TATICO_PSICOLOGICO" de propósito: dimensionCodeToGeneralDimension mapeia
-- este padrão para o pilar Mental (mesma convenção do Muay Thai/Boxing/BJJ).
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MMA_TATICO_PSICOLOGICO', 'Controle psicológico', 407
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MMA_TATICO_PSICOLOGICO');

-- 3) Componentes de avaliação para MMA (uma por dimensão nova) — usa modality = 'MMA';
-- não interfere com os componentes já clonados de MUAY_THAI/BOXING.
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MMA', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code LIKE 'MMA_%'
  AND NOT EXISTS (
    SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MMA' AND c."dimensionId" = d.id
  );

-- 4) Critérios (técnicas/conceitos) por categoria
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Clinch de MMA
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_CLINCH' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Underhook (controlo de braço por baixo)','Overhook (controlo de braço por cima)','Body lock (controlo de tronco)','Dirty boxing no clinch','Controlo contra a grade/corda']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Wrestling (quedas)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_WRESTLING' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Queda dupla (double leg)','Queda simples (single leg)','Rasteira (trip)','Arremesso (throw)','Queda contra a grade']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Defesa de queda
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_DEFESA_QUEDA' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Sprawl (afundar a queda)','Underhooks defensivos','Whizzer (bloqueio de braço)','Retorno técnico à posição em pé']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Ground and pound
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_GROUND_POUND' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Golpes a partir da montada','Golpes a partir do cem quilos (side control)','Controlo de postura antes de golpear','Elbows a partir do chão']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Transições em grappling
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TRANSICOES' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Passagem de guarda sob golpes','Scrambles (disputa de posição)','Retomar posição dominante após scramble']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Finalizações de MMA
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_FINALIZACOES' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Armlock adaptado (sem-kimono)','Kimura adaptada','Mata-leão adaptado','Triângulo adaptado','Guilhotina','Chave de tornozelo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Levantar-se
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_LEVANTAR' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Technical stand-up','Wall walk (levantar-se apoiado na grade)','Criar espaço para levantar sob pressão']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Gestão de distância e ranges
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_DISTANCIA' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Alternar entre alcance de striking, clinch e chão conforme vantagem','Reconhecer o range ideal para cada ferramenta']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle de espaço (cage/ringue)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_CONTROLE_ESPACO' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['"Cortar" o espaço (cutting the cage)','Forçar o combate para a grade','Fechar rotas de fuga do adversário']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Leitura de padrões e adaptação
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_LEITURA' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Identificar hábitos do adversário durante o combate','Ajustar estratégia dentro do próprio round (não só entre rounds)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Gestão de ritmo e energia
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_RITMO' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Distribuir esforço ao longo dos rounds','Saber quando pressionar e quando conservar energia']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Tomada de decisão e gestão de risco
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_DECISAO' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Escolher entre trocas de alto vs. baixo risco','Contenção tática (não forçar troca desfavorável)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Transição entre fases de combate
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_TRANSICAO_FASES' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Decidir quando levar o combate para o clinch','Decidir quando levar o combate para o chão','Decidir quando manter o combate em pé']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Plano de jogo e ajustes
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_PLANO' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Definir estratégia inicial conforme o adversário','Adaptar o plano conforme o combate evolui']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle psicológico
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MMA_TATICO_PSICOLOGICO' AND c.modality = 'MMA' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Impor pressão mental ao adversário','Gerir o próprio nervosismo/adrenalina']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
