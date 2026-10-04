-- Perfil público do treinador: bio/redes sociais/opt-in no Coach, e depoimentos de alunos (com moderação).

ALTER TABLE "Coach"
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER,
  ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT,
  ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "publicProfileEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CoachTestimonial" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "coachId" TEXT NOT NULL REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rating" SMALLINT NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  "moderatedByUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "moderatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CoachTestimonial_coach_student_key" UNIQUE ("coachId", "studentId")
);

CREATE INDEX IF NOT EXISTS "CoachTestimonial_coach_status_idx" ON "CoachTestimonial" ("coachId", "status");

ALTER TABLE "CoachTestimonial" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_testimonial_authenticated" ON "CoachTestimonial";
CREATE POLICY "coach_testimonial_authenticated" ON "CoachTestimonial" FOR ALL TO authenticated USING (true) WITH CHECK (true);
