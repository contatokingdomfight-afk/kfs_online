-- Lesson.modality e TrialClass.modality: enum PostgreSQL → TEXT + FK ModalityRef.
-- Corrige: invalid input value for enum "Modality": "MTKIDS" (e qualquer modalidade nova no admin).

DO $$
DECLARE
  col_udt text;
BEGIN
  SELECT c.udt_name INTO col_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'Lesson'
    AND c.column_name = 'modality';

  IF col_udt = 'Modality' THEN
    ALTER TABLE "Lesson" ALTER COLUMN "modality" TYPE TEXT USING "modality"::text;
  END IF;
END $$;

ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_modality_fkey";
ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_modality_ModalityRef_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lesson_modality_ModalityRef_fkey'
  ) THEN
    ALTER TABLE "Lesson"
      ADD CONSTRAINT "Lesson_modality_ModalityRef_fkey"
      FOREIGN KEY ("modality") REFERENCES "ModalityRef"("code")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
DECLARE
  col_udt text;
BEGIN
  SELECT c.udt_name INTO col_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'TrialClass'
    AND c.column_name = 'modality';

  IF col_udt = 'Modality' THEN
    ALTER TABLE "TrialClass" ALTER COLUMN "modality" TYPE TEXT USING "modality"::text;
  END IF;
END $$;

ALTER TABLE "TrialClass" DROP CONSTRAINT IF EXISTS "TrialClass_modality_fkey";
ALTER TABLE "TrialClass" DROP CONSTRAINT IF EXISTS "TrialClass_modality_ModalityRef_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrialClass_modality_ModalityRef_fkey'
  ) THEN
    ALTER TABLE "TrialClass"
      ADD CONSTRAINT "TrialClass_modality_ModalityRef_fkey"
      FOREIGN KEY ("modality") REFERENCES "ModalityRef"("code")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;
