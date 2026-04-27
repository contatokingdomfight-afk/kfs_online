-- Repara ambientes onde o insert do aluno falha: permissões, política RLS, tipo enum vs PostgREST.
-- Os índices parciais em "status" impedem ALTER TYPE in-place; remove-se antes de converter para TEXT.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PhysicalAssessmentRequest'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PhysicalAssessmentRequest" TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PhysicalAssessmentRequest" TO service_role';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'PhysicalAssessmentRequest' AND policyname = 'allow_authenticated'
    ) THEN
      EXECUTE 'ALTER TABLE public."PhysicalAssessmentRequest" ENABLE ROW LEVEL SECURITY';
      EXECUTE $p$
        CREATE POLICY "allow_authenticated" ON public."PhysicalAssessmentRequest"
        FOR ALL TO authenticated USING (true) WITH CHECK (true)
      $p$;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PhysicalAssessmentRequest'
      AND column_name = 'status'
      AND udt_name = 'PhysicalAssessmentRequestStatus'
  ) THEN
    DROP INDEX IF EXISTS "PhysicalAssessmentRequest_one_pending_per_student";
    DROP INDEX IF EXISTS "PhysicalAssessmentRequest_schoolId_status_idx";

    ALTER TABLE "PhysicalAssessmentRequest" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "PhysicalAssessmentRequest" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
    ALTER TABLE "PhysicalAssessmentRequest" DROP CONSTRAINT IF EXISTS "PhysicalAssessmentRequest_status_check";
    ALTER TABLE "PhysicalAssessmentRequest"
      ADD CONSTRAINT "PhysicalAssessmentRequest_status_check"
      CHECK ("status" IN ('PENDING', 'CANCELLED', 'FULFILLED'));
    ALTER TABLE "PhysicalAssessmentRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

    CREATE UNIQUE INDEX "PhysicalAssessmentRequest_one_pending_per_student"
      ON "PhysicalAssessmentRequest" ("studentId")
      WHERE "status" = 'PENDING';

    CREATE INDEX "PhysicalAssessmentRequest_schoolId_status_idx"
      ON "PhysicalAssessmentRequest" ("schoolId", "status");
  END IF;
END $$;
