-- Inserts via Supabase JS omit "id"; Prisma @default(cuid()) is not applied at the DB layer.
ALTER TABLE "StudentPhysicalAssessment"
  ALTER COLUMN "id" SET DEFAULT (gen_random_uuid()::text);
