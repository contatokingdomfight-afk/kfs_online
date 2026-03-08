-- Seed: estilos de luta do Boxing para avaliação (perfil tático do lutador)
-- 1 dimensão "Estilos de Boxing", 10 critérios (estilos clássicos + defensivos).
-- Só insere se não existir (dimensão por code; componente por modality+dimensionId; critérios só se o componente não tiver nenhum).

-- 1) Dimensão Estilos de Boxing
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'BOX_ESTILOS', 'Estilos de Boxing', 309
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'BOX_ESTILOS');

-- 2) Componente de avaliação para BOXING
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'BOXING', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code = 'BOX_ESTILOS'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'BOXING' AND c."dimensionId" = d.id);

-- 3) Critérios (estilos)
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'BOX_ESTILOS' AND c.modality = 'BOXING' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Out-Boxer (Boxer) — controle à distância com jab e movimentação',
      'Swarmer (Pressure Fighter) — pressão constante e alto volume de golpes',
      'Slugger (Brawler) — potência e busca ao nocaute',
      'Boxer-Puncher — híbrido: técnica, movimentação e potência',
      'Counterpuncher — contra-ataque após ataque do adversário',
      'In-Fighter — especialista na curta distância (ganchos e uppercuts)',
      'Southpaw Fighter — canhoto, ângulos difíceis para ortodoxos',
      'Switch Hitter — alterna base ortodoxa e canhota',
      'Philly Shell Fighter — defensivo com ombro e contra-ataque',
      'Peek-a-Boo Fighter — guarda alta e pressão constante'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
