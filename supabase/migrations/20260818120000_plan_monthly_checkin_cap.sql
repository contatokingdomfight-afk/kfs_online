-- Limite mensal de check-ins por plano (ex.: Kingdom Week = 5 aulas/mês).
-- Distinto de max_check_ins_per_day (limite diário, já existente).

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "max_check_ins_per_month" integer;
COMMENT ON COLUMN "Plan"."max_check_ins_per_month" IS 'Limite de check-ins confirmados por mês civil (Europe/Lisbon). null = sem limite mensal.';

-- Kingdom Week: plano de 5 aulas/mês.
UPDATE "Plan" SET "max_check_ins_per_month" = 5 WHERE "name" = 'Kingdom Week';

-- Aulas extra compradas por um aluno num mês além do limite do plano (ex.: pacote extra do
-- Kingdom Week). Somadas ao max_check_ins_per_month do plano nesse mês. paymentId liga ao
-- registo de pagamento (TUITION/EXTRA_SESSION) feito pela secretaria.
CREATE TABLE IF NOT EXISTS public."StudentExtraSessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES public."Student"("id") ON DELETE CASCADE,
  "referenceMonth" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "paymentId" TEXT REFERENCES public."Payment"("id") ON DELETE SET NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."StudentExtraSessions" IS 'Aulas extra concedidas a um aluno num mês, além do limite mensal do plano.';
COMMENT ON COLUMN public."StudentExtraSessions"."referenceMonth" IS 'Formato YYYY-MM, mesma convenção de Payment.referenceMonth.';

CREATE INDEX IF NOT EXISTS "StudentExtraSessions_student_month_idx"
  ON public."StudentExtraSessions" ("studentId", "referenceMonth");

ALTER TABLE public."StudentExtraSessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_student_extra_sessions_select" ON public."StudentExtraSessions";
CREATE POLICY "kfs_student_extra_sessions_select" ON public."StudentExtraSessions"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kfs_student_extra_sessions_write" ON public."StudentExtraSessions";
CREATE POLICY "kfs_student_extra_sessions_write" ON public."StudentExtraSessions"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
