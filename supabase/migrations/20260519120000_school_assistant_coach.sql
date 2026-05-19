-- Treinador assistente ao nível da escola: aluno (Student) com permissões limitadas na área coach (presenças, sem avaliações).
-- Um registo por aluno (studentId único); revokedAt != null significa revogado.

CREATE TABLE IF NOT EXISTS "SchoolAssistantCoach" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  "schoolId" text NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "studentId" text NOT NULL UNIQUE REFERENCES "Student"("id") ON DELETE CASCADE,
  "grantedByUserId" text REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "revokedAt" timestamptz NULL
);

CREATE INDEX IF NOT EXISTS "SchoolAssistantCoach_school_active_idx"
  ON "SchoolAssistantCoach" ("schoolId")
  WHERE "revokedAt" IS NULL;

ALTER TABLE "SchoolAssistantCoach" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated" ON "SchoolAssistantCoach";
CREATE POLICY "allow_authenticated" ON "SchoolAssistantCoach" FOR ALL TO authenticated USING (true) WITH CHECK (true);
