-- Remove critérios a 5/10 de registos legados em que o JSON guardava o template completo
-- (muitas chaves) mas só poucas notas foram realmente diferenciadas (1–30 critérios ≠ 5).
-- Idempotente: após normalizar, deixa de cumprir nkeys >= 50 e não volta a alterar.
-- Pode já ter sido aplicado em produção (EU) via script/MCP antes desta migração entrar no repositório.

UPDATE "AthleteEvaluation" ae
SET scores = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(ae.scores) t(key, value)
  WHERE NOT (jsonb_typeof(value) = 'number' AND (value #>> '{}')::numeric = 5)
)
WHERE ae.scores IS NOT NULL
  AND ae.scores <> '{}'::jsonb
  AND (SELECT COUNT(*)::int FROM jsonb_each(ae.scores)) >= 50
  AND (SELECT COUNT(*)::int FROM jsonb_each(ae.scores) e WHERE (e.value #>> '{}')::numeric IS DISTINCT FROM 5)
    BETWEEN 1 AND 30;
