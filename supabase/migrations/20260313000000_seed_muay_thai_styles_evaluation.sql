-- Seed: estilos de luta do Muay Thai para avaliação (perfil tático do lutador)
-- 1 dimensão "Estilos de Muay Thai", 9 critérios (estilos clássicos).
-- Só insere se não existir (dimensão por code; componente por modality+dimensionId; critérios só se o componente não tiver nenhum).

-- 1) Dimensão Estilos de Muay Thai
INSERT INTO "GeneralDimension" (id, code, name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_ESTILOS', 'Estilos de Muay Thai', 209
WHERE NOT EXISTS (SELECT 1 FROM "GeneralDimension" WHERE code = 'MUAY_ESTILOS');

-- 2) Componente de avaliação para MUAY_THAI
INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
SELECT gen_random_uuid(), 'MUAY_THAI', d.id, d.name, d."sortOrder"
FROM "GeneralDimension" d
WHERE d.code = 'MUAY_ESTILOS'
AND NOT EXISTS (SELECT 1 FROM "EvaluationComponent" c WHERE c.modality = 'MUAY_THAI' AND c."dimensionId" = d.id);

-- 3) Critérios (estilos)
DO $$
DECLARE
  comp_id uuid;
  r text;
  ord int;
BEGIN
  SELECT c.id INTO comp_id FROM "EvaluationComponent" c JOIN "GeneralDimension" d ON c."dimensionId" = d.id WHERE d.code = 'MUAY_ESTILOS' AND c.modality = 'MUAY_THAI' LIMIT 1;
  IF comp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "EvaluationCriterion" WHERE "componentId" = comp_id::text) THEN
    ord := 0;
    FOREACH r IN ARRAY ARRAY[
      'Muay Klap (Power Muay) — potência, cotovelos e joelhos, busca ao nocaute',
      'Muay Khao (Knee Muay) — especialista em clinch e joelhadas',
      'Muay Tae (Kick Muay) — distância com chutes precisos e teep',
      'Muay Mat (Punch Muay) — base em socos, mistura boxe com Muay Thai',
      'Muay Fak (Counter Muay) — contra-atacante, explora aberturas',
      'Muay Lek (Speed Muay) — velocidade, fintas, esquivas e combinações rápidas',
      'Muay Klap-Khao (Power + Knee) — potência e clinch com joelhadas',
      'Muay All-Round (Complete Muay) — versátil, equilibra todas as armas',
      'Muay Clinch Specialist (Clinch Muay) — domina o clinch e joelhadas'
    ]
    LOOP
      INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder") VALUES (gen_random_uuid(), comp_id::text, r, NULL, ord); ord := ord + 1;
    END LOOP;
  END IF;
END $$;
