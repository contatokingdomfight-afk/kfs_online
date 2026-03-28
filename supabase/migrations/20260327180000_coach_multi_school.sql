-- Um coach pode lecionar em várias escolas (N:N via CoachSchool).
-- Migra dados de Coach.schoolId e remove a coluna.

CREATE TABLE IF NOT EXISTS "CoachSchool" (
  "coachId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  CONSTRAINT "CoachSchool_pkey" PRIMARY KEY ("coachId", "schoolId"),
  CONSTRAINT "CoachSchool_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CoachSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "CoachSchool" IS 'Associação coach ↔ escolas onde pode lecionar.';

INSERT INTO "CoachSchool" ("coachId", "schoolId")
SELECT c."id", c."schoolId"
FROM "Coach" c
WHERE c."schoolId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "Coach" DROP CONSTRAINT IF EXISTS "Coach_schoolId_fkey";
DROP INDEX IF EXISTS "Coach_schoolId_idx";
ALTER TABLE "Coach" DROP COLUMN IF EXISTS "schoolId";

ALTER TABLE "CoachSchool" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_authenticated_coachschool" ON "CoachSchool" FOR ALL TO authenticated USING (true) WITH CHECK (true);
