-- MMA: mesmos critérios de avaliação que Muay Thai + Boxing (KICKBOXING reutiliza MT no loader; não duplicar).
-- Regra: para cada (dimensionId, name) só existe um componente MMA — MT processado antes de BOXING
-- (Mental/Teórico/Físico partilham dimensões; critérios são iguais nos seeds).

INSERT INTO "ModalityRef" (code, name, "sortOrder")
SELECT 'MMA', 'MMA', COALESCE((SELECT MAX("sortOrder") + 1 FROM "ModalityRef" mr), 0)
WHERE NOT EXISTS (SELECT 1 FROM "ModalityRef" WHERE code = 'MMA');

DO $$
DECLARE
  r RECORD;
  new_id uuid;
BEGIN
  FOR r IN
    SELECT c.*
    FROM "EvaluationComponent" c
    WHERE c.modality IN ('MUAY_THAI', 'BOXING')
    ORDER BY CASE c.modality WHEN 'MUAY_THAI' THEN 0 ELSE 1 END, c."sortOrder", c.id
  LOOP
    IF EXISTS (
      SELECT 1
      FROM "EvaluationComponent" m
      WHERE m.modality = 'MMA'
        AND m."dimensionId" = r."dimensionId"
        AND m.name = r.name
    ) THEN
      CONTINUE;
    END IF;

    new_id := gen_random_uuid();
    INSERT INTO "EvaluationComponent" (id, modality, "dimensionId", name, "sortOrder")
    VALUES (
      new_id,
      'MMA',
      r."dimensionId",
      r.name,
      CASE
        WHEN r.modality = 'MUAY_THAI' THEN r."sortOrder"
        ELSE r."sortOrder" + 200000
      END
    );

    INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder")
    SELECT gen_random_uuid(), new_id::text, crit.label, crit.description, crit."sortOrder"
    FROM "EvaluationCriterion" crit
    WHERE crit."componentId" = r.id::text;
  END LOOP;
END $$;
