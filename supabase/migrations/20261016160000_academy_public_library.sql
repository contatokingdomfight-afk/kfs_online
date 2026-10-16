-- Kingdom Academy (biblioteca pública): compras por conta (aluno ou não), Passe, revisão de cursos e vendas dos professores.

-- 1) CoursePurchase: passa a poder pertencer a qualquer conta (userId) e guarda a referência do Stripe.
ALTER TABLE public."CoursePurchase" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE public."CoursePurchase" ADD COLUMN IF NOT EXISTS "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE;
ALTER TABLE public."CoursePurchase" ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
ALTER TABLE public."CoursePurchase" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

UPDATE public."CoursePurchase" cp
SET "userId" = s."userId"
FROM public."Student" s
WHERE cp."studentId" = s.id AND cp."userId" IS NULL;

ALTER TABLE public."CoursePurchase" DROP CONSTRAINT IF EXISTS "CoursePurchase_owner_check";
ALTER TABLE public."CoursePurchase" ADD CONSTRAINT "CoursePurchase_owner_check" CHECK ("studentId" IS NOT NULL OR "userId" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "CoursePurchase_userId_courseId_key" ON public."CoursePurchase" ("userId", "courseId") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "CoursePurchase_stripeSessionId_key" ON public."CoursePurchase" ("stripeSessionId") WHERE "stripeSessionId" IS NOT NULL;

-- 2) Passe Kingdom Academy (subscrição mensal/anual, gerida pelo Stripe).
CREATE TABLE IF NOT EXISTS public."AcademyPass" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT UNIQUE,
  "interval" TEXT NOT NULL DEFAULT 'month',
  status TEXT NOT NULL DEFAULT 'incomplete',
  "currentPeriodEnd" TIMESTAMPTZ,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AcademyPass_interval_check" CHECK ("interval" IN ('month', 'year'))
);

-- 3) Course: revisão pelo admin e pertença ao Passe.
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS in_pass BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public."Course" DROP CONSTRAINT IF EXISTS "Course_review_status_check";
ALTER TABLE public."Course" ADD CONSTRAINT "Course_review_status_check" CHECK (review_status IN ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED'));

-- Cursos de professores ainda não ativos ficam em rascunho.
UPDATE public."Course" SET review_status = 'DRAFT' WHERE creator_student_id IS NOT NULL AND is_active = false;

-- 4) Vendas de cursos de professores (repartição fixada no momento da venda).
CREATE TABLE IF NOT EXISTS public."CourseSale" (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "purchaseId" TEXT NOT NULL UNIQUE REFERENCES public."CoursePurchase"(id) ON DELETE CASCADE,
  "courseId" TEXT NOT NULL REFERENCES public."Course"(id) ON DELETE CASCADE,
  "creatorStudentId" TEXT REFERENCES public."Student"(id) ON DELETE SET NULL,
  "grossAmount" NUMERIC(10, 2) NOT NULL,
  "creatorPct" INTEGER NOT NULL,
  "creatorAmount" NUMERIC(10, 2) NOT NULL,
  "schoolAmount" NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "paidOutAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CourseSale_status_check" CHECK (status IN ('PENDING', 'PAID_OUT')),
  CONSTRAINT "CourseSale_pct_check" CHECK ("creatorPct" >= 0 AND "creatorPct" <= 100)
);
CREATE INDEX IF NOT EXISTS "CourseSale_creator_idx" ON public."CourseSale" ("creatorStudentId", status);

-- Só a equipa lê/escreve diretamente; o cliente acede via servidor (cliente admin, filtrado pelo seu userId).
ALTER TABLE public."AcademyPass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CourseSale" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kfs_academy_staff" ON public."AcademyPass";
CREATE POLICY "kfs_academy_staff" ON public."AcademyPass" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());

DROP POLICY IF EXISTS "kfs_academy_staff" ON public."CourseSale";
CREATE POLICY "kfs_academy_staff" ON public."CourseSale" FOR ALL TO authenticated
  USING (public.kfs_is_staff()) WITH CHECK (public.kfs_is_staff());
