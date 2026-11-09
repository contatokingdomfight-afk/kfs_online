-- Dia de pagamento por aluno + pausas de mensalidade (ex.: atestado médico). 2026-11-09.

-- 1) Dia de pagamento (1–28). Mensalidade gerada no dia 1; só fica em atraso depois deste dia.
ALTER TABLE public."Student"
  ADD COLUMN IF NOT EXISTS "paymentDueDay" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public."Student" DROP CONSTRAINT IF EXISTS "Student_paymentDueDay_check";
ALTER TABLE public."Student"
  ADD CONSTRAINT "Student_paymentDueDay_check" CHECK ("paymentDueDay" BETWEEN 1 AND 28);

-- Quem já tem pagamento automático ativo fica com o dia da cobrança (máx. 28).
UPDATE public."Student" s
SET "paymentDueDay" = LEAST(a."billingDay", 28)
FROM public."AutoPay" a
WHERE a."studentId" = s.id AND a.state = 'ACTIVE' AND a."billingDay" IS NOT NULL;

-- 2) Pausas: enquanto ativa (endDate null e startDate <= hoje) não gera mensalidades,
--    não fica inadimplente nem suspenso; a fidelização é adiada pelos meses em pausa.
CREATE TABLE IF NOT EXISTS public."StudentTuitionPause" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"(id) ON DELETE CASCADE,
  "schoolId" TEXT,
  "startDate" DATE NOT NULL,
  -- Regresso previsto (opcional): retoma sozinha nesse dia.
  "expectedEndDate" DATE,
  -- Regresso efetivo (null = pausa em curso).
  "endDate" DATE,
  -- MEDICAL (atestado médico) | OTHER
  reason TEXT NOT NULL DEFAULT 'MEDICAL' CHECK (reason IN ('MEDICAL', 'OTHER')),
  notes TEXT,
  "attachmentPath" TEXT,
  "attachmentFileName" TEXT,
  -- Meses de fidelização já adiados por esta pausa (para não adiar duas vezes).
  "loyaltyMonthsShifted" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("expectedEndDate" IS NULL OR "expectedEndDate" >= "startDate"),
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX IF NOT EXISTS "StudentTuitionPause_student_idx" ON public."StudentTuitionPause" ("studentId");
-- No máximo uma pausa em curso por aluno.
CREATE UNIQUE INDEX IF NOT EXISTS "StudentTuitionPause_one_open_idx"
  ON public."StudentTuitionPause" ("studentId") WHERE "endDate" IS NULL;

ALTER TABLE public."StudentTuitionPause" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kfs_financial_staff" ON public."StudentTuitionPause";
CREATE POLICY "kfs_financial_staff" ON public."StudentTuitionPause" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
