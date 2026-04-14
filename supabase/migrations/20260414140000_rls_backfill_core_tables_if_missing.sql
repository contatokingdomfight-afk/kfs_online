-- Backfill RLS policies on core public tables when RLS was enabled but no policies exist
-- (Postgres denies all DML for authenticated if relrowsecurity=true and pg_policy is empty).
-- Idempotent: safe if 20260223000000_enable_rls_public_tables.sql already ran.
-- Mirrors that migration’s User / Student / School rules and allow_authenticated on the rest.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User') THEN
    CREATE POLICY "user_select_own" ON "User" FOR SELECT TO authenticated
      USING ("authUserId" = (auth.uid())::text);
    CREATE POLICY "user_insert_own" ON "User" FOR INSERT TO authenticated
      WITH CHECK ("authUserId" = (auth.uid())::text);
    CREATE POLICY "user_update_own" ON "User" FOR UPDATE TO authenticated
      USING ("authUserId" = (auth.uid())::text)
      WITH CHECK ("authUserId" = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Student') THEN
    CREATE POLICY "student_select_own" ON "Student" FOR SELECT TO authenticated
      USING ("userId" IN (SELECT id FROM "User" WHERE "authUserId" = (auth.uid())::text));
    CREATE POLICY "student_insert_own" ON "Student" FOR INSERT TO authenticated
      WITH CHECK ("userId" IN (SELECT id FROM "User" WHERE "authUserId" = (auth.uid())::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'School') THEN
    CREATE POLICY "school_select_authenticated" ON "School" FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Athlete' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Athlete" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AthleteMissionAward' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "AthleteMissionAward" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AthleteMissionCompletion' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "AthleteMissionCompletion" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Attendance' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Attendance" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Coach' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Coach" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'CoachSchool' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "CoachSchool" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Comment' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Comment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Lesson' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Lesson" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Location' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Location" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MissionTemplate' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "MissionTemplate" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Payment' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Payment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Plan' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "Plan" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'StudentPhysicalAssessment' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "StudentPhysicalAssessment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'TrialClass' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "TrialClass" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waitlist' AND policyname = 'allow_authenticated') THEN
    CREATE POLICY "allow_authenticated" ON "waitlist" FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
