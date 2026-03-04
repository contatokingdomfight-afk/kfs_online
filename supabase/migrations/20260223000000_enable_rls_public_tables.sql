-- Enable RLS on all public tables (Supabase Security Advisor: rls_disabled_in_public)
-- Run this in Supabase Dashboard > SQL Editor, or via: supabase db push / supabase migration up
-- Service role (admin client) bypasses RLS; anon/authenticated are restricted by policies below.

-- ========== Enable RLS ==========
ALTER TABLE "CourseCreator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoursePurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModalityRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coach" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Athlete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrialClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationCriterion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModalityEvaluationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneralDimension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteMissionAward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteMissionCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentPhysicalAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseUnit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseUnitProgress" ENABLE ROW LEVEL SECURITY;

-- ========== User: own row only (syncUser, getCurrentDbUser) ==========
-- auth.uid() is uuid; "authUserId" is text in DB, so cast for comparison
CREATE POLICY "user_select_own" ON "User" FOR SELECT TO authenticated
  USING ("authUserId" = (auth.uid())::text);
CREATE POLICY "user_insert_own" ON "User" FOR INSERT TO authenticated
  WITH CHECK ("authUserId" = (auth.uid())::text);
CREATE POLICY "user_update_own" ON "User" FOR UPDATE TO authenticated
  USING ("authUserId" = (auth.uid())::text)
  WITH CHECK ("authUserId" = (auth.uid())::text);

-- ========== Student: own row (syncUser, getCurrentStudent, dashboard) ==========
CREATE POLICY "student_select_own" ON "Student" FOR SELECT TO authenticated
  USING ("userId" IN (SELECT id FROM "User" WHERE "authUserId" = (auth.uid())::text));
CREATE POLICY "student_insert_own" ON "Student" FOR INSERT TO authenticated
  WITH CHECK ("userId" IN (SELECT id FROM "User" WHERE "authUserId" = (auth.uid())::text));

-- ========== School: read for default school (syncUser) ==========
CREATE POLICY "school_select_authenticated" ON "School" FOR SELECT TO authenticated
  USING (true);

-- ========== All other tables: allow full access for authenticated ==========
-- App does role-based access (ADMIN/COACH/ALUNO) in middleware and getCurrentDbUser; service_role used for admin flows.
-- This keeps server-side requests (with user JWT) working; tighten per-role later if desired.
CREATE POLICY "allow_authenticated" ON "CourseCreator" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "CoursePurchase" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "ModalityRef" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "WeekTheme" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Coach" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Lesson" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Athlete" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Attendance" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Comment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Payment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "TrialClass" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Plan" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Course" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "EventRegistration" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Event" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "StudentBadge" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "AttendanceGoal" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "AthleteEvaluation" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "StudentProfile" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "EvaluationComponent" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Notification" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "Location" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "EvaluationCriterion" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "ModalityEvaluationConfig" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "GeneralDimension" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "AthleteMissionAward" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "MissionTemplate" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "AthleteMissionCompletion" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "StudentPhysicalAssessment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "CourseModule" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "CourseProgress" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "CourseUnit" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated" ON "CourseUnitProgress" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- School: already has SELECT above; add nothing else so only SELECT for authenticated (no INSERT/UPDATE/DELETE via anon key).
-- If you need authenticated users to update schools, add: CREATE POLICY "school_all_authenticated" ON "School" FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- and drop "school_select_authenticated" or keep both (SELECT + full).
