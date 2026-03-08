-- Seed: fundamentos técnicos do Muay Thai para avaliação (EvaluationComponent + EvaluationCriterion)
-- Categorias: Postura, Deslocamento, Socos, Cotoveladas, Joelhadas, Chutes, Teep, Clinch, Defesas, Sweeps, Fintas, Combinações, Condicionamento
-- Labels no formato "Nome tailandês (Nome PT/EN)" quando há transliteração; restante só em português/inglês.
-- Só insere se ainda não existir configuração para MUAY_THAI via componentes (não sobrescreve dados existentes).

-- 1) Dimensões (categorias) para Muay Thai – inserir apenas se não existirem
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_POSTURA', 'Postura (Stance)', 100
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_POSTURA');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_DESLOCAMENTO', 'Deslocamento (Footwork)', 101
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_DESLOCAMENTO');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_SOCOS', 'Socos (Punches)', 102
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_SOCOS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_COTOVELADAS', 'Cotoveladas (Elbows)', 103
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_COTOVELADAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_JOELHADAS', 'Joelhadas (Knees)', 104
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_JOELHADAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_CHUTES', 'Chutes (Kicks)', 105
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_CHUTES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_TEEP', 'Teep (Push Kick)', 106
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_TEEP');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_CLINCH', 'Clinch', 107
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_CLINCH');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_DEFESAS', 'Defesas', 108
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_DEFESAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_SWEEPS', 'Sweeps e desequilíbrios', 109
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_SWEEPS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_FINTAS', 'Fintas (Feints)', 110
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_FINTAS');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_COMBINACOES', 'Combinações', 111
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_COMBINACOES');

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_CONDICIONAMENTO', 'Condicionamento específico', 112
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_CONDICIONAMENTO');

-- 2) Componentes de avaliação para MUAY_THAI (uma por dimensão)
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_THAI', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code LIKE 'MUAY_%'
  AND NOT EXISTS (
    SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MUAY_THAI' AND c."dimensionId" = d.id
  );

-- 3) Critérios (técnicas) por categoria – só inserir se o componente existir e não tiver critérios ainda
-- Usamos uma função anónima para inserir em lote por (dim_code, label, sortOrder)

DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  -- Postura (Stance)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_POSTURA' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Base ortodoxa','Base canhota (southpaw)','Distribuição de peso','Guarda alta','Guarda longa (long guard)','Guarda fechada','Posicionamento do quadril','Alinhamento do queixo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Deslocamento (Footwork)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_DESLOCAMENTO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Passo frontal','Passo para trás','Passo lateral','Pivot (giro do pé)','Shuffle step','Step and slide','Corte de ângulo','Troca de base (switch)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Socos (Punches)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_SOCOS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Mat Trong (Jab)','Trong Trong (Cross direto)','Mat Wiang San (Hook)','Mat Ngad (Uppercut)','Mat Wiang Yao (Overhand)','Body jab','Body cross','Hook no corpo','Uppercut no corpo','Superman punch','Mat Wiang Klap (Backfist)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Cotoveladas (Elbows)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_COTOVELADAS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Sok Tad (Cotovelo horizontal)','Sok Chieng (Cotovelo diagonal)','Sok Ngad (Cotovelo ascendente)','Sok Poong (Cotovelo descendente)','Sok Klap (Cotovelo giratório)','Sok Wiang Klap (Cotovelo giratório descendente)','Sok Kradot (Cotovelo saltando)','Sok Koo (Cotovelo duplo)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Joelhadas (Knees)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_JOELHADAS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Khao Trong (Joelho reto)','Khao Chieng (Joelho diagonal)','Khao Khong (Joelho lateral)','Khao Loi (Joelho voador)','Joelho no corpo','Joelho na cabeça','Khao Nai (Joelho no clinch)','Khao Kradot (Joelho saltando)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Chutes (Kicks)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_CHUTES' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Tae Tat (Low kick coxa)','Tae Klang (Chute médio costela)','Tae Hua (Chute alto cabeça)','Tae Chiang (Chute circular)','Inside low kick','Outside low kick','Body kick','Head kick','Tae Switch (Switch kick)','Teep kick (empurrão)','Tae Kradot (Chute saltando)','Tae Klap Lang (Chute giratório)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Teep (Push Kick)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_TEEP' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Teep Trong (Teep frontal)','Teep na coxa','Teep no quadril','Teep Lom (Teep no corpo)','Teep Hua (Teep no rosto)','Teep Khang (Teep lateral)','Teep Kradot (Teep saltando)','Teep defensivo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Clinch
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_CLINCH' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Chap Kho (Clinch duplo plum)','Single neck control','Underhook clinch','Overhook clinch','Side clinch','Body lock','Chap Nai (Controle de braço)','Puxar cabeça','Bun (Giro no clinch)','Quebrar postura','Hak Lak (Desequilíbrio)','Criar espaço para joelho']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Defesas
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_DEFESAS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Check Tae (Bloqueio de canela)','Bang Sok (Defesa com antebraço)','Bloqueio com cotovelo','Bloqueio de joelho','Lop (Esquiva)','Bob and weave','Pull back','En (Inclinar para trás)','Check kick','Catch kick','Step back','Parry Pad (Aparar golpe)']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Sweeps e desequilíbrios
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_SWEEPS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Te Tat Lak (Rasteira externa)','Te Khad (Rasteira interna)','Bun Lak (Derrubada com giro)','Kao Lak (Desequilíbrio com perna)','Knee bump','Turn and dump']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Fintas (Feints)
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_FINTAS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Finta de jab','Finta de teep','Finta de chute','Finta de joelho','Mudança de ritmo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Combinações
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_COMBINACOES' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Jab → Cross → Low kick','Jab → Cross → Hook → Middle kick','Teep → Cross → Hook','Clinch → Joelho → Cotovelo']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;

  -- Condicionamento específico
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_CONDICIONAMENTO' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY['Endurecimento de canela','Fortalecimento de core','Treino de impacto','Sparring técnico','Pad work','Bag work']
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
