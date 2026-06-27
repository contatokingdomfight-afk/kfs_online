-- Segurança produção: helpers RLS (SECURITY DEFINER), políticas por papel, idempotência Stripe.

-- ---------------------------------------------------------------------------
-- Helpers (evitam recursão ao ler User/Student com JWT do aluno)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kfs_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public."User" u
  WHERE u."authUserId" = (auth.uid())::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kfs_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role::text
  FROM public."User" u
  WHERE u."authUserId" = (auth.uid())::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kfs_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.kfs_current_user_role() IN ('ADMIN', 'COACH'), false);
$$;

CREATE OR REPLACE FUNCTION public.kfs_current_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public."Student" s
  INNER JOIN public."User" u ON u.id = s."userId"
  WHERE u."authUserId" = (auth.uid())::text
  ORDER BY s."createdAt" ASC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kfs_owns_athlete(p_athlete_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Athlete" a
    WHERE a.id = p_athlete_id
      AND a."studentId" = public.kfs_current_student_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.kfs_can_read_comment(
  p_target_type text,
  p_target_id text,
  p_visibility text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.kfs_is_staff()
    OR (
      p_target_type = 'ATHLETE'
      AND p_visibility = 'SHARED'
      AND public.kfs_owns_athlete(p_target_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.kfs_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kfs_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kfs_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kfs_current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kfs_owns_athlete(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kfs_can_read_comment(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Stripe: idempotência webhook + invoice único em Payment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."StripeWebhookEvent" (
  "eventId" TEXT NOT NULL PRIMARY KEY,
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."Payment" ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeInvoiceId_key"
  ON public."Payment" ("stripeInvoiceId")
  WHERE "stripeInvoiceId" IS NOT NULL;

COMMENT ON TABLE public."StripeWebhookEvent" IS 'Eventos Stripe já processados (idempotência do webhook).';
COMMENT ON COLUMN public."Payment"."stripeInvoiceId" IS 'ID da invoice Stripe (invoice.paid); evita pagamentos duplicados.';

-- ---------------------------------------------------------------------------
-- Políticas: dados sensíveis — aluno só vê/edita os seus; staff (coach/admin) tudo
-- ---------------------------------------------------------------------------

-- Payment
DROP POLICY IF EXISTS "allow_authenticated" ON public."Payment";
CREATE POLICY "kfs_payment_select" ON public."Payment" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_payment_insert" ON public."Payment" FOR INSERT TO authenticated
  WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_payment_update" ON public."Payment" FOR UPDATE TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_payment_delete" ON public."Payment" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- Attendance
DROP POLICY IF EXISTS "allow_authenticated" ON public."Attendance";
CREATE POLICY "kfs_attendance_select" ON public."Attendance" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_attendance_insert" ON public."Attendance" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_attendance_update" ON public."Attendance" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_attendance_delete" ON public."Attendance" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- AthleteEvaluation
DROP POLICY IF EXISTS "allow_authenticated" ON public."AthleteEvaluation";
CREATE POLICY "kfs_athlete_eval_select" ON public."AthleteEvaluation" FOR SELECT TO authenticated
  USING (public.kfs_owns_athlete("athleteId") OR public.kfs_is_staff());
CREATE POLICY "kfs_athlete_eval_insert" ON public."AthleteEvaluation" FOR INSERT TO authenticated
  WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_athlete_eval_update" ON public."AthleteEvaluation" FOR UPDATE TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_athlete_eval_delete" ON public."AthleteEvaluation" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- Notification (aluno ou coach destinatário)
DROP POLICY IF EXISTS "allow_authenticated" ON public."Notification";
CREATE POLICY "kfs_notification_select" ON public."Notification" FOR SELECT TO authenticated
  USING (
    ("studentId" IS NOT NULL AND "studentId" = public.kfs_current_student_id())
    OR ("coachUserId" IS NOT NULL AND "coachUserId" = public.kfs_current_user_id())
    OR public.kfs_is_staff()
  );
CREATE POLICY "kfs_notification_insert" ON public."Notification" FOR INSERT TO authenticated
  WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_notification_update" ON public."Notification" FOR UPDATE TO authenticated
  USING (
    ("studentId" IS NOT NULL AND "studentId" = public.kfs_current_student_id())
    OR ("coachUserId" IS NOT NULL AND "coachUserId" = public.kfs_current_user_id())
    OR public.kfs_is_staff()
  )
  WITH CHECK (
    ("studentId" IS NOT NULL AND "studentId" = public.kfs_current_student_id())
    OR ("coachUserId" IS NOT NULL AND "coachUserId" = public.kfs_current_user_id())
    OR public.kfs_is_staff()
  );
CREATE POLICY "kfs_notification_delete" ON public."Notification" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- Athlete
DROP POLICY IF EXISTS "allow_authenticated" ON public."Athlete";
CREATE POLICY "kfs_athlete_select" ON public."Athlete" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_athlete_insert" ON public."Athlete" FOR INSERT TO authenticated
  WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_athlete_update" ON public."Athlete" FOR UPDATE TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_athlete_delete" ON public."Athlete" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- AthleteMissionAward / AthleteMissionCompletion
DROP POLICY IF EXISTS "allow_authenticated" ON public."AthleteMissionAward";
CREATE POLICY "kfs_mission_award_select" ON public."AthleteMissionAward" FOR SELECT TO authenticated
  USING (public.kfs_owns_athlete("athleteId") OR public.kfs_is_staff());
CREATE POLICY "kfs_mission_award_write" ON public."AthleteMissionAward" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

DROP POLICY IF EXISTS "allow_authenticated" ON public."AthleteMissionCompletion";
CREATE POLICY "kfs_mission_completion_select" ON public."AthleteMissionCompletion" FOR SELECT TO authenticated
  USING (public.kfs_owns_athlete("athleteId") OR public.kfs_is_staff());
CREATE POLICY "kfs_mission_completion_write" ON public."AthleteMissionCompletion" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

-- StudentPhysicalAssessment
DROP POLICY IF EXISTS "allow_authenticated" ON public."StudentPhysicalAssessment";
CREATE POLICY "kfs_phys_assess_select" ON public."StudentPhysicalAssessment" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_phys_assess_write" ON public."StudentPhysicalAssessment" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

-- PhysicalAssessmentRequest
DROP POLICY IF EXISTS "allow_authenticated" ON public."PhysicalAssessmentRequest";
CREATE POLICY "kfs_par_select" ON public."PhysicalAssessmentRequest" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_par_insert" ON public."PhysicalAssessmentRequest" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_par_update" ON public."PhysicalAssessmentRequest" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_par_delete" ON public."PhysicalAssessmentRequest" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- StudentProfile
DROP POLICY IF EXISTS "allow_authenticated" ON public."StudentProfile";
CREATE POLICY "kfs_student_profile_select" ON public."StudentProfile" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_student_profile_insert" ON public."StudentProfile" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_student_profile_update" ON public."StudentProfile" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_student_profile_delete" ON public."StudentProfile" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- StudentBadge
DROP POLICY IF EXISTS "allow_authenticated" ON public."StudentBadge";
CREATE POLICY "kfs_student_badge_select" ON public."StudentBadge" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_student_badge_write" ON public."StudentBadge" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

-- CoursePurchase
DROP POLICY IF EXISTS "allow_authenticated" ON public."CoursePurchase";
CREATE POLICY "kfs_course_purchase_select" ON public."CoursePurchase" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_purchase_write" ON public."CoursePurchase" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

-- CourseProgress / CourseUnitProgress (colunas snake_case)
DROP POLICY IF EXISTS "allow_authenticated" ON public."CourseProgress";
CREATE POLICY "kfs_course_progress_select" ON public."CourseProgress" FOR SELECT TO authenticated
  USING ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_progress_insert" ON public."CourseProgress" FOR INSERT TO authenticated
  WITH CHECK ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_progress_update" ON public."CourseProgress" FOR UPDATE TO authenticated
  USING ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_progress_delete" ON public."CourseProgress" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

DROP POLICY IF EXISTS "allow_authenticated" ON public."CourseUnitProgress";
CREATE POLICY "kfs_course_unit_progress_select" ON public."CourseUnitProgress" FOR SELECT TO authenticated
  USING ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_unit_progress_insert" ON public."CourseUnitProgress" FOR INSERT TO authenticated
  WITH CHECK ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_unit_progress_update" ON public."CourseUnitProgress" FOR UPDATE TO authenticated
  USING ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("student_id" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_course_unit_progress_delete" ON public."CourseUnitProgress" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- EventRegistration
DROP POLICY IF EXISTS "allow_authenticated" ON public."EventRegistration";
CREATE POLICY "kfs_event_reg_select" ON public."EventRegistration" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_event_reg_insert" ON public."EventRegistration" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_event_reg_update" ON public."EventRegistration" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_event_reg_delete" ON public."EventRegistration" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- Wellness / benchmarks
DROP POLICY IF EXISTS "allow_authenticated" ON public."PreLessonWellness";
CREATE POLICY "kfs_wellness_select" ON public."PreLessonWellness" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_wellness_insert" ON public."PreLessonWellness" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_wellness_update" ON public."PreLessonWellness" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_wellness_delete" ON public."PreLessonWellness" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

DROP POLICY IF EXISTS "allow_authenticated" ON public."PainSelfReport";
CREATE POLICY "kfs_pain_select" ON public."PainSelfReport" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_pain_insert" ON public."PainSelfReport" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_pain_update" ON public."PainSelfReport" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_pain_delete" ON public."PainSelfReport" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

DROP POLICY IF EXISTS "allow_authenticated" ON public."PhysicalBenchmarkEntry";
CREATE POLICY "kfs_benchmark_select" ON public."PhysicalBenchmarkEntry" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_benchmark_insert" ON public."PhysicalBenchmarkEntry" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_benchmark_update" ON public."PhysicalBenchmarkEntry" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_benchmark_delete" ON public."PhysicalBenchmarkEntry" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

DROP POLICY IF EXISTS "allow_authenticated" ON public."BodyWeightEntry";
CREATE POLICY "kfs_weight_select" ON public."BodyWeightEntry" FOR SELECT TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_weight_insert" ON public."BodyWeightEntry" FOR INSERT TO authenticated
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_weight_update" ON public."BodyWeightEntry" FOR UPDATE TO authenticated
  USING ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff())
  WITH CHECK ("studentId" = public.kfs_current_student_id() OR public.kfs_is_staff());
CREATE POLICY "kfs_weight_delete" ON public."BodyWeightEntry" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- Comment (aluno lê SHARED sobre o próprio atleta)
DROP POLICY IF EXISTS "allow_authenticated" ON public."Comment";
CREATE POLICY "kfs_comment_select" ON public."Comment" FOR SELECT TO authenticated
  USING (public.kfs_can_read_comment("targetType"::text, "targetId", "visibility"::text));
CREATE POLICY "kfs_comment_insert" ON public."Comment" FOR INSERT TO authenticated
  WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_comment_update" ON public."Comment" FOR UPDATE TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
CREATE POLICY "kfs_comment_delete" ON public."Comment" FOR DELETE TO authenticated
  USING (public.kfs_is_staff());

-- TrialClass — só staff
DROP POLICY IF EXISTS "allow_authenticated" ON public."TrialClass";
CREATE POLICY "kfs_trial_select" ON public."TrialClass" FOR SELECT TO authenticated
  USING (public.kfs_is_staff());
CREATE POLICY "kfs_trial_write" ON public."TrialClass" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

-- ---------------------------------------------------------------------------
-- Catálogo / operacional: leitura para authenticated; escrita só staff
-- ---------------------------------------------------------------------------

DO $policy$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'ModalityRef', 'GeneralDimension', 'AttendanceGoal', 'Course', 'CourseModule',
    'CourseUnit', 'CourseCreator', 'WeekTheme', 'EvaluationComponent', 'EvaluationCriterion',
    'ModalityEvaluationConfig', 'Event', 'Plan', 'PlanPrice', 'MissionTemplate', 'Location',
    'Lesson', 'LessonCancellation', 'LessonCoach', 'Coach', 'CoachSchool', 'SchoolAssistantCoach'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_plan_price" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_coachschool" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "kfs_catalog_select" ON public.%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "kfs_catalog_write" ON public.%I', tbl);

      EXECUTE format(
        'CREATE POLICY "kfs_catalog_select" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "kfs_catalog_write" ON public.%I FOR ALL TO authenticated USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff())',
        tbl
      );
    END IF;
  END LOOP;
END
$policy$;

-- Financeiro admin (se existir)
DO $fin$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'FinancialExpense') THEN
    ALTER TABLE public."FinancialExpense" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_authenticated" ON public."FinancialExpense";
    DROP POLICY IF EXISTS "kfs_financial_staff" ON public."FinancialExpense";
    CREATE POLICY "kfs_financial_staff" ON public."FinancialExpense" FOR ALL TO authenticated
      USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'FinancialRevenue') THEN
    ALTER TABLE public."FinancialRevenue" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_authenticated" ON public."FinancialRevenue";
    DROP POLICY IF EXISTS "kfs_financial_staff" ON public."FinancialRevenue";
    CREATE POLICY "kfs_financial_staff" ON public."FinancialRevenue" FOR ALL TO authenticated
      USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
  END IF;
END
$fin$;
