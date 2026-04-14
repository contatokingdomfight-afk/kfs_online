-- Paridade de schema EU ↔ legado (Postgres alargado).
-- Objetivo: permitir migração de dados e features fora do subconjunto Prisma MVP.
-- Idempotente: IF NOT EXISTS / DROP IF EXISTS onde aplicável.

-- ---- Enum wellness ----
DO $$ BEGIN
  CREATE TYPE "WellnessZone" AS ENUM ('GREEN', 'YELLOW', 'RED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---- User ----
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- ---- Student ----
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "primaryModality" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "can_create_courses" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentGraceEndsAt" TIMESTAMPTZ;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentGraceReferenceMonth" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "paymentSuspendedAt" TIMESTAMPTZ;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "suspendedPlanId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "adminGrantedFullAccess" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "Student" ADD CONSTRAINT "Student_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---- Plan (permissões / Stripe legado) ----
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_performance_tracking" BOOLEAN DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_check_in" BOOLEAN DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "max_check_ins_per_day" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_exclusive_benefits" BOOLEAN DEFAULT false;

-- ---- Coach ----
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "hourly_rate" NUMERIC(10, 2);
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;

-- ---- Lesson ----
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "weekday" INTEGER;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "locationId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Lesson" ALTER COLUMN "date" DROP NOT NULL;

-- ---- Attendance: presença por ocorrência + RPE ----
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMPTZ;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "occurrenceDate" DATE;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "rpe" SMALLINT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "rpeRecordedAt" TIMESTAMPTZ;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "countsForGamification" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Attendance" a
SET "occurrenceDate" = l."date"::date
FROM "Lesson" l
WHERE a."lessonId" = l.id
  AND a."occurrenceDate" IS NULL
  AND l."date" IS NOT NULL;

UPDATE "Attendance" SET "occurrenceDate" = CURRENT_DATE WHERE "occurrenceDate" IS NULL;

ALTER TABLE "Attendance" ALTER COLUMN "occurrenceDate" SET NOT NULL;

DROP INDEX IF EXISTS "Attendance_lessonId_studentId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_lesson_student_occurrence_unique"
  ON "Attendance" ("lessonId", "studentId", "occurrenceDate");

-- ---- Tabelas de domínio (ordem de FKs) ----
CREATE TABLE IF NOT EXISTS "ModalityRef" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

INSERT INTO "ModalityRef" (id, code, name, "sortOrder", "createdAt") VALUES
  ('7a33ab36-f7f2-4aed-8f6b-75e9615bd078', 'MUAY_THAI', 'Muay Thai', 0, '2026-02-23 21:28:26.188545+00'),
  ('e1b2ac15-f432-43fd-aae4-b1ed5ede1e30', 'BOXING', 'Boxing', 1, '2026-02-23 21:28:26.188545+00'),
  ('72cb7147-a429-4ac3-adb6-a0091f6b84a6', 'KICKBOXING', 'Kickboxing', 2, '2026-02-23 21:28:26.188545+00'),
  ('b4a56268-b751-4d45-b323-5860a5fa22ed', 'BJJ', 'Jiu-Jitsu', 3, '2026-02-23 22:48:24.092554+00'),
  ('b1d38bd8-0d70-49aa-9147-c19463377f65', 'KRT', 'Karate', 4, '2026-02-28 20:57:43.031012+00'),
  ('310189b3-526a-40c0-a860-2f5d515732c8', 'MMA', 'MMA', 5, '2026-03-03 20:00:59.661939+00')
ON CONFLICT ("code") DO NOTHING;

CREATE TABLE IF NOT EXISTS "GeneralDimension" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

INSERT INTO "GeneralDimension" (id, code, name, "sortOrder", "createdAt") VALUES
  ('d0c9f272-8791-4797-9b5b-4a22fb760b19', 'tecnico', 'Técnico', 0, '2026-02-24 11:18:11.44583+00'),
  ('b91e4f70-320b-43f5-9c57-01562a28a240', 'tatico', 'Tático', 1, '2026-02-24 11:18:11.44583+00'),
  ('e35bbb1c-8e2f-4bc4-a97a-c792eadf4596', 'fisico', 'Físico', 2, '2026-02-24 11:18:11.44583+00'),
  ('09ecf4a4-3f66-4f90-8c20-affb0d1c5a0a', 'mental', 'Mental', 3, '2026-02-24 11:18:11.44583+00'),
  ('0cf07a70-7d79-4346-9b59-d40cd4610306', 'teorico', 'Teórico', 4, '2026-02-24 11:18:11.44583+00')
ON CONFLICT ("code") DO NOTHING;

CREATE TABLE IF NOT EXISTS "AttendanceGoal" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "target_value" INTEGER NOT NULL DEFAULT 10,
  "period_type" TEXT NOT NULL DEFAULT 'MONTHLY',
  "is_global" BOOLEAN DEFAULT true,
  CONSTRAINT "AttendanceGoal_period_type_check" CHECK (("period_type" = 'MONTHLY'::text))
);

CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "modality" TEXT,
  "included_in_digital_plan" BOOLEAN NOT NULL DEFAULT true,
  "video_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "price" NUMERIC,
  "available_for_purchase" BOOLEAN DEFAULT false,
  "level" TEXT,
  "creator_student_id" TEXT,
  "coach_revenue_pct" INTEGER NOT NULL DEFAULT 65,
  CONSTRAINT "Course_category_check" CHECK (("category" = ANY (ARRAY['TECHNIQUE'::text, 'MINDSET'::text, 'PERFORMANCE'::text]))),
  CONSTRAINT "Course_creator_student_id_fkey" FOREIGN KEY ("creator_student_id") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CourseModule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "course_id" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "video_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CourseUnit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "module_id" TEXT NOT NULL REFERENCES "CourseModule"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "content_type" TEXT NOT NULL DEFAULT 'VIDEO',
  "video_url" TEXT,
  "text_content" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseUnit_content_type_check" CHECK (("content_type" = ANY (ARRAY['VIDEO'::text, 'TEXT'::text, 'QUIZ'::text])))
);

CREATE TABLE IF NOT EXISTS "CourseCreator" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "course_id" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
  "student_id" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "revenue_pct" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseCreator_revenue_pct_check" CHECK (("revenue_pct" >= 0 AND "revenue_pct" <= 100)),
  CONSTRAINT "CourseCreator_course_student_unique" UNIQUE ("course_id", "student_id")
);

CREATE TABLE IF NOT EXISTS "CourseProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "student_id" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "module_id" TEXT NOT NULL REFERENCES "CourseModule"("id") ON DELETE CASCADE,
  "completed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseProgress_student_module_unique" UNIQUE ("student_id", "module_id")
);

CREATE TABLE IF NOT EXISTS "CoursePurchase" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
  "amount" NUMERIC NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAID',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "CoursePurchase_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::text, 'PAID'::text, 'REFUNDED'::text]))),
  CONSTRAINT "CoursePurchase_studentId_courseId_key" UNIQUE ("studentId", "courseId")
);

CREATE TABLE IF NOT EXISTS "CourseUnitProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "student_id" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "unit_id" TEXT NOT NULL REFERENCES "CourseUnit"("id") ON DELETE CASCADE,
  "completed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseUnitProgress_student_unit_unique" UNIQUE ("student_id", "unit_id")
);

CREATE TABLE IF NOT EXISTS "WeekTheme" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "modality" TEXT NOT NULL REFERENCES "ModalityRef"("code"),
  "week_start" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "course_id" TEXT REFERENCES "Course"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "WeekTheme_modality_week_start_key" UNIQUE ("modality", "week_start")
);

CREATE TABLE IF NOT EXISTS "EvaluationComponent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "modality" TEXT NOT NULL REFERENCES "ModalityRef"("code"),
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "dimensionId" TEXT REFERENCES "GeneralDimension"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "EvaluationCriterion" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "componentId" TEXT NOT NULL REFERENCES "EvaluationComponent"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ModalityEvaluationConfig" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "modality" TEXT NOT NULL UNIQUE REFERENCES "ModalityRef"("code"),
  "config" JSONB NOT NULL DEFAULT '{"categorias": []}'::jsonb,
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "event_date" DATE NOT NULL,
  "price" NUMERIC NOT NULL DEFAULT 0,
  "max_participants" INTEGER,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "Event_type_check" CHECK (("type" = ANY (ARRAY['SEMINAR'::text, 'COMPETITION'::text, 'WORKSHOP'::text, 'OTHER'::text])))
);

CREATE TABLE IF NOT EXISTS "EventRegistration" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "registered_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "EventRegistration_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "EventRegistration_studentId_eventId_key" UNIQUE ("studentId", "eventId")
);

CREATE TABLE IF NOT EXISTS "StudentProfile" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL UNIQUE REFERENCES "Student"("id") ON DELETE CASCADE,
  "weightKg" NUMERIC,
  "heightCm" NUMERIC,
  "dateOfBirth" DATE,
  "medicalNotes" TEXT,
  "emergencyContact" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  "phone" TEXT,
  "reachCm" NUMERIC,
  "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
  "goals" JSONB,
  "weightGoalKg" NUMERIC(5, 2),
  "weightGoalTargetDate" DATE
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "read_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "href" TEXT
);

CREATE TABLE IF NOT EXISTS "StudentBadge" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "badgeCode" TEXT NOT NULL,
  "earnedAt" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "StudentBadge_studentId_badgeCode_key" UNIQUE ("studentId", "badgeCode")
);

CREATE TABLE IF NOT EXISTS "AthleteEvaluation" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "athleteId" TEXT NOT NULL REFERENCES "Athlete"("id") ON DELETE CASCADE,
  "coachId" TEXT NOT NULL REFERENCES "Coach"("id") ON DELETE CASCADE,
  "gas" INTEGER,
  "technique" INTEGER,
  "strength" INTEGER,
  "theory" INTEGER,
  "note" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "modality" TEXT REFERENCES "ModalityRef"("code"),
  "lessonId" TEXT REFERENCES "Lesson"("id") ON DELETE SET NULL,
  "scores" JSONB,
  CONSTRAINT "AthleteEvaluation_gas_check" CHECK (("gas" IS NULL OR ("gas" >= 1 AND "gas" <= 5))),
  CONSTRAINT "AthleteEvaluation_technique_check" CHECK (("technique" IS NULL OR ("technique" >= 1 AND "technique" <= 5))),
  CONSTRAINT "AthleteEvaluation_strength_check" CHECK (("strength" IS NULL OR ("strength" >= 1 AND "strength" <= 5))),
  CONSTRAINT "AthleteEvaluation_theory_check" CHECK (("theory" IS NULL OR ("theory" >= 1 AND "theory" <= 5)))
);

CREATE TABLE IF NOT EXISTS "LessonCancellation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "LessonCancellation_lessonId_date_key" UNIQUE ("lessonId", "date")
);

CREATE TABLE IF NOT EXISTS "LessonCoach" (
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE CASCADE,
  "coachId" TEXT NOT NULL REFERENCES "Coach"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("lessonId", "coachId")
);

CREATE INDEX IF NOT EXISTS "LessonCancellation_lessonId_idx" ON "LessonCancellation" ("lessonId");

INSERT INTO "LessonCoach" ("lessonId", "coachId", "sortOrder")
SELECT "id", "coachId", 0 FROM "Lesson"
WHERE "coachId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "LessonCoach" lc WHERE lc."lessonId" = "Lesson"."id")
ON CONFLICT ("lessonId", "coachId") DO NOTHING;

CREATE TABLE IF NOT EXISTS "PreLessonWellness" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "occurrenceDate" DATE NOT NULL,
  "sleepHours" NUMERIC(4, 2) NOT NULL,
  "sleepQuality" SMALLINT NOT NULL,
  "hydrationOk" BOOLEAN NOT NULL,
  "stress" SMALLINT NOT NULL,
  "fatigue" SMALLINT NOT NULL,
  "wellnessZone" "WellnessZone" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PreLessonWellness_student_lesson_occ_unique" UNIQUE ("studentId", "lessonId", "occurrenceDate")
);

CREATE TABLE IF NOT EXISTS "PainSelfReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "bodyRegion" TEXT NOT NULL,
  "intensity" SMALLINT NOT NULL,
  "notes" TEXT,
  "reportedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PhysicalBenchmarkEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "benchmarkKey" TEXT NOT NULL,
  "value" NUMERIC NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'reps',
  "recordedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BodyWeightEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "weightKg" NUMERIC(5, 2) NOT NULL,
  "recordedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PlanPrice" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "planId" TEXT NOT NULL REFERENCES "Plan"("id") ON DELETE CASCADE,
  "stripePriceId" TEXT NOT NULL UNIQUE,
  "intervalLabel" TEXT NOT NULL,
  "intervalMonths" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PlanPrice_planId_idx" ON "PlanPrice" ("planId");
CREATE INDEX IF NOT EXISTS "PlanPrice_stripePriceId_idx" ON "PlanPrice" ("stripePriceId");

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  marketing_optin BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (lower(email));

-- ---- RLS mínimo (alinhado a migrações existentes) ----
ALTER TABLE "ModalityRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneralDimension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseUnit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseCreator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoursePurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseUnitProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationCriterion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModalityEvaluationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCancellation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonCoach" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreLessonWellness" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PainSelfReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhysicalBenchmarkEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BodyWeightEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanPrice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_authenticated ON "ModalityRef";
CREATE POLICY allow_authenticated ON "ModalityRef" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "GeneralDimension";
CREATE POLICY allow_authenticated ON "GeneralDimension" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "AttendanceGoal";
CREATE POLICY allow_authenticated ON "AttendanceGoal" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "Course";
CREATE POLICY allow_authenticated ON "Course" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CourseModule";
CREATE POLICY allow_authenticated ON "CourseModule" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CourseUnit";
CREATE POLICY allow_authenticated ON "CourseUnit" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CourseCreator";
CREATE POLICY allow_authenticated ON "CourseCreator" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CourseProgress";
CREATE POLICY allow_authenticated ON "CourseProgress" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CoursePurchase";
CREATE POLICY allow_authenticated ON "CoursePurchase" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "CourseUnitProgress";
CREATE POLICY allow_authenticated ON "CourseUnitProgress" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "WeekTheme";
CREATE POLICY allow_authenticated ON "WeekTheme" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "EvaluationComponent";
CREATE POLICY allow_authenticated ON "EvaluationComponent" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "EvaluationCriterion";
CREATE POLICY allow_authenticated ON "EvaluationCriterion" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "ModalityEvaluationConfig";
CREATE POLICY allow_authenticated ON "ModalityEvaluationConfig" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "Event";
CREATE POLICY allow_authenticated ON "Event" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "EventRegistration";
CREATE POLICY allow_authenticated ON "EventRegistration" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "StudentProfile";
CREATE POLICY allow_authenticated ON "StudentProfile" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "Notification";
CREATE POLICY allow_authenticated ON "Notification" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "StudentBadge";
CREATE POLICY allow_authenticated ON "StudentBadge" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "AthleteEvaluation";
CREATE POLICY allow_authenticated ON "AthleteEvaluation" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "LessonCancellation";
CREATE POLICY allow_authenticated ON "LessonCancellation" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "LessonCoach";
CREATE POLICY allow_authenticated ON "LessonCoach" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "PreLessonWellness";
CREATE POLICY allow_authenticated ON "PreLessonWellness" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "PainSelfReport";
CREATE POLICY allow_authenticated ON "PainSelfReport" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "PhysicalBenchmarkEntry";
CREATE POLICY allow_authenticated ON "PhysicalBenchmarkEntry" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "BodyWeightEntry";
CREATE POLICY allow_authenticated ON "BodyWeightEntry" FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS allow_authenticated ON "PlanPrice";
CREATE POLICY allow_authenticated ON "PlanPrice" FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_anon_read_plan_price ON "PlanPrice";
CREATE POLICY allow_anon_read_plan_price ON "PlanPrice" FOR SELECT TO anon USING (true);
