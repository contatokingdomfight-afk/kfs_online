-- Seed: fundamentos técnicos e táticos do Jiu-Jitsu Brasileiro (BJJ) para avaliação
-- (EvaluationComponent + EvaluationCriterion). BJJ tinha só os 5 pilares genéricos
-- (Técnico/Tático/Físico/Mental/Teórico) sem nenhuma categoria específica — este seed
-- fecha essa lacuna, no mesmo padrão dos seeds de Muay Thai/Boxing.
-- Categorias técnicas: Guarda, Passagem de guarda, Quedas, Controle e imobilização,
-- Raspagens, Chaves de braço, Estrangulamentos, Chaves de perna, Fugas e defesas.
-- Categorias táticas: Hierarquia posicional, Disputa de pegadas, Controle de pressão,
-- Timing e transições, Filosofia de passagem, Gestão de energia, Leitura do oponente,
-- Controle psicológico.
-- Só insere se ainda não existir configuração para BJJ via componentes (não sobrescreve dados existentes).

-- 1) Dimensões (categorias) técnicas para BJJ
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_GUARDA', 'Guarda', 100
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_GUARDA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_PASSAGEM', 'Passagem de guarda', 101
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_PASSAGEM');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_QUEDAS', 'Quedas e derrubadas', 102
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_QUEDAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_CONTROLE', 'Controle e imobilização', 103
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_CONTROLE');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_RASPAGENS', 'Raspagens (sweeps)', 104
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_RASPAGENS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_CHAVES_BRACO', 'Finalizações — chaves de braço', 105
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_CHAVES_BRACO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_ESTRANGULAMENTOS', 'Finalizações — estrangulamentos', 106
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_ESTRANGULAMENTOS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_CHAVES_PERNA', 'Finalizações — chaves de perna', 107
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_CHAVES_PERNA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_FUGAS', 'Fugas e defesas', 108
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_FUGAS');

-- 2) Dimensões (categorias) táticas para BJJ
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_HIERARQUIA', 'Hierarquia posicional', 200
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_HIERARQUIA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_PEGADAS', 'Disputa de pegadas (grip fighting)', 201
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_PEGADAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_PRESSAO', 'Controle de pressão', 202
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_PRESSAO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_TIMING', 'Timing e transições', 203
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_TIMING');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_PASSAGEM', 'Filosofia de passagem de guarda', 204
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_PASSAGEM');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_RITMO', 'Gestão de energia e ritmo', 205
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_RITMO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_LEITURA', 'Leitura do oponente', 206
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_LEITURA');

-- Nome com "TATICO_PSICOLOGICO" de propósito: dimensionCodeToGeneralDimension mapeia
-- este padrão para o pilar Mental (mesma convenção do Muay Thai/Boxing).
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ_TATICO_PSICOLOGICO', 'Controle psicológico', 207
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BJJ_TATICO_PSICOLOGICO');

-- 3) Componentes de avaliação para BJJ (uma por dimensão nova)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BJJ', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code LIKE 'BJJ_%'
  AND NOT EXISTS (
    SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BJJ' AND c."dimensionId" = d.id
  );

-- 4) Critérios (técnicas/conceitos) por categoria
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Guarda
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_GUARDA' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Guarda fechada','Guarda aberta','De La Riva','Guarda de lapela (lasso)','Guarda X','Meia guarda','Guarda de gancho (spider)','Guarda butterfly','Guarda 50/50']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Passagem de guarda
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_PASSAGEM' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Passagem por pressão','Passagem por velocidade','Passagem por tração (leg-drag)','Passagem torreando','Passagem por cima (over-under)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Quedas e derrubadas
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_QUEDAS' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Queda de perna simples','Queda de duas pernas','Projeção de ombro (seoi-nage adaptado)','Puxada para a guarda']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle e imobilização
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_CONTROLE' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Cem quilos (side control)','Joelho na barriga','Montada baixa','Montada alta','Montada técnica','Controle das costas','Controle de quadril']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Raspagens (sweeps)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_RASPAGENS' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Raspagem de tesoura','Raspagem de gancho','Raspagem elevador (butterfly)','Flower sweep','Raspagem de meia guarda']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Finalizações — chaves de braço
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_CHAVES_BRACO' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Armlock (chave de braço reta)','Kimura','Americana','Chave de braço no triângulo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Finalizações — estrangulamentos
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_ESTRANGULAMENTOS' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Mata-leão','Triângulo','Guilhotina','Estrangulamento de lapela (cross-collar)','Bulldog choke']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Finalizações — chaves de perna
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_CHAVES_PERNA' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Chave de tornozelo reta','Footlock','Kneebar']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Fugas e defesas
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_FUGAS' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Fuga de quadril (shrimping)','Fuga da montada','Fuga do cem quilos','Defesa de estrangulamento','Defesa de chave de braço']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Hierarquia posicional
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_HIERARQUIA' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Reconhecer posições dominantes vs. neutras','Priorizar posição antes de finalização','Progressão posicional (guarda → passagem → controle → finalização)','Escolher entre opções conforme valor posicional']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Disputa de pegadas (grip fighting)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_PEGADAS' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Sequenciar pegadas para criar vantagem','Quebrar pegadas do adversário','Reconhecer janelas de oportunidade','Executar pegadas sem "avisar" a intenção (telegraphing)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle de pressão
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_PRESSAO' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Modular peso e pressão conforme a posição','Reforçar conexão corporal (chest-to-chest)','Ajuste dinâmico de posição sem perder controlo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Timing e transições
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_TIMING' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Saber o momento certo para trocar de posição','Saber o momento certo para finalizar','Aproveitar a reação do adversário']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Filosofia de passagem de guarda
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_PASSAGEM' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Escolher pressão, velocidade ou tração conforme o adversário','Combinar filosofias de passagem numa sequência']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Gestão de energia e ritmo
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_RITMO' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Alternar entre explosão e conservação de energia','Gerir esforço ao longo do combate/rolamento']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Leitura do oponente
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_LEITURA' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Antecipar reações do adversário','Identificar padrões e hábitos','Identificar vulnerabilidades posicionais']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Controle psicológico
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BJJ_TATICO_PSICOLOGICO' AND c.modality = 'BJJ' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Manter a calma sob pressão/posição desfavorável','Impor ritmo mental ao adversário','Gerir frustração e ansiedade em rolamento/competição']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
