-- Lesson.modality e TrialClass.modality usam o enum PostgreSQL "Modality" (Prisma).
-- ModalityRef já expõe MMA, BJJ, KRT; sem estes valores o insert falha com:
-- invalid input value for enum "Modality": "MMA"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Modality' AND e.enumlabel = 'MMA'
  ) THEN
    ALTER TYPE "Modality" ADD VALUE 'MMA';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Modality' AND e.enumlabel = 'BJJ'
  ) THEN
    ALTER TYPE "Modality" ADD VALUE 'BJJ';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Modality' AND e.enumlabel = 'KRT'
  ) THEN
    ALTER TYPE "Modality" ADD VALUE 'KRT';
  END IF;
END$$;
