-- Graduação: «Verde Limão» (#84CC16) passa a «Verde» (#16A34A), mais fiel à cor da faixa.
-- Afeta só GraduationGrade (nome + cores). Os nomes não são copiados para outras tabelas.
-- Correr no SQL Editor do Supabase (produção). 1) ver o antes; 2) atualizar; 3) ver o depois.

-- 1) Antes
SELECT t."modalityCode", g."sortOrder", g."name", g."colors"
FROM "GraduationGrade" g
JOIN "GraduationTemplate" t ON t."id" = g."templateId"
WHERE g."name" ILIKE '%verde lim%' OR '#84CC16' ILIKE ANY (g."colors")
ORDER BY t."modalityCode", g."sortOrder";

-- 2) Atualizar
BEGIN;

UPDATE "GraduationGrade"
SET
  "name" = regexp_replace("name", 'verde\s+lim[aã]o', 'Verde', 'gi'),
  "colors" = ARRAY(
    SELECT CASE WHEN upper(c) = '#84CC16' THEN '#16A34A' ELSE c END
    FROM unnest("colors") WITH ORDINALITY AS u(c, i)
    ORDER BY i
  )
WHERE "name" ILIKE '%verde lim%' OR '#84CC16' ILIKE ANY ("colors");

COMMIT;

-- 3) Depois
SELECT t."modalityCode", g."sortOrder", g."name", g."colors"
FROM "GraduationGrade" g
JOIN "GraduationTemplate" t ON t."id" = g."templateId"
WHERE g."name" ILIKE '%verde%' OR '#16A34A' ILIKE ANY (g."colors")
ORDER BY t."modalityCode", g."sortOrder";
