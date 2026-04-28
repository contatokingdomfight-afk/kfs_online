-- Remove linhas duplicadas em "Athlete" com o mesmo "studentId" (dados legados).
-- Mantém o registo mais antigo (menor "createdAt", desempate por "id");
-- funde XP e campos; reatribui FKs; actualiza comentários; apaga duplicados.
-- Idempotente: se não houver duplicados, não altera nada.
-- (Aplicado via Supabase; `Comment.targetType` é enum `CommentTargetType`.)

WITH dup_students AS (
  SELECT "studentId"
  FROM "Athlete"
  GROUP BY "studentId"
  HAVING COUNT(*) > 1
),
keeper AS (
  SELECT a."studentId",
    (array_agg(a.id ORDER BY a."createdAt" ASC NULLS LAST, a.id ASC))[1] AS keep_id
  FROM "Athlete" a
  INNER JOIN dup_students d ON d."studentId" = a."studentId"
  GROUP BY a."studentId"
),
merge_stats AS (
  SELECT
    k.keep_id,
    MAX(ath.xp) AS mx,
    MAX(ath."displayBeltIndex") AS mdi,
    MAX(ath."lastBeltPromotionAt") AS mlp
  FROM "Athlete" ath
  INNER JOIN keeper k ON k."studentId" = ath."studentId"
  GROUP BY k.keep_id
)
UPDATE "Athlete" a
SET
  xp = m.mx,
  "displayBeltIndex" = m.mdi,
  "lastBeltPromotionAt" = m.mlp
FROM merge_stats m
WHERE a.id = m.keep_id;

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
DELETE FROM "AthleteMissionCompletion" c
USING dups d
WHERE c."athleteId" = d.drop_id
  AND EXISTS (
    SELECT 1
    FROM "AthleteMissionCompletion" k
    WHERE k."athleteId" = d.keep_id
      AND k."missionTemplateId" = c."missionTemplateId"
  );

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
UPDATE "AthleteMissionCompletion" c
SET "athleteId" = d.keep_id
FROM dups d
WHERE c."athleteId" = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
DELETE FROM "AthleteMissionAward" a
USING dups d
WHERE a."athleteId" = d.drop_id
  AND EXISTS (
    SELECT 1
    FROM "AthleteMissionAward" k
    WHERE k."athleteId" = d.keep_id
      AND k."dimensionCode" = a."dimensionCode"
      AND k."targetScore" = a."targetScore"
  );

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
UPDATE "AthleteMissionAward" a
SET "athleteId" = d.keep_id
FROM dups d
WHERE a."athleteId" = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
UPDATE "AthleteEvaluation" e
SET "athleteId" = d.keep_id
FROM dups d
WHERE e."athleteId" = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
UPDATE "Comment" c
SET "targetId" = d.keep_id
FROM dups d
WHERE c."targetType" = 'ATHLETE'::"CommentTargetType"
  AND c."targetId" = d.drop_id;

WITH ranked AS (
  SELECT
    id,
    "studentId",
    FIRST_VALUE(id) OVER (
      PARTITION BY "studentId"
      ORDER BY "createdAt" ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM "Athlete"
),
dups AS (
  SELECT r.keep_id, r.id AS drop_id
  FROM ranked r
  WHERE r.id <> r.keep_id
)
DELETE FROM "Athlete" a
USING dups d
WHERE a.id = d.drop_id;
