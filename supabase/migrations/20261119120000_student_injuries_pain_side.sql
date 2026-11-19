-- Mapa corporal: o aluno declara lesões anteriores (fratura, distensão, entorse…) e indica o lado das dores.
--
-- 1) PainSelfReport."side": LEFT | RIGHT | BOTH (nulo = não indicado; dores antigas ficam como estão).
-- 2) StudentInjury: lesões anteriores declaradas pelo próprio aluno (zona, lado, tipo, ano, recuperada).
--
-- Só adiciona (IF NOT EXISTS); não altera nem apaga dados existentes.

BEGIN;

ALTER TABLE public."PainSelfReport" ADD COLUMN IF NOT EXISTS "side" TEXT;
ALTER TABLE public."PainSelfReport" DROP CONSTRAINT IF EXISTS "PainSelfReport_side_check";
ALTER TABLE public."PainSelfReport"
  ADD CONSTRAINT "PainSelfReport_side_check" CHECK ("side" IS NULL OR "side" IN ('LEFT', 'RIGHT', 'BOTH'));

CREATE TABLE IF NOT EXISTS public."StudentInjury" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "bodyRegion" TEXT NOT NULL,
  "side" TEXT,
  "injuryType" TEXT NOT NULL,
  "occurredYear" SMALLINT,
  "recovered" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "StudentInjury_side_check" CHECK ("side" IS NULL OR "side" IN ('LEFT', 'RIGHT', 'BOTH')),
  CONSTRAINT "StudentInjury_type_check" CHECK ("injuryType" IN ('FRACTURE', 'MUSCLE_STRAIN', 'SPRAIN', 'LIGAMENT', 'OTHER')),
  CONSTRAINT "StudentInjury_year_check" CHECK ("occurredYear" IS NULL OR "occurredYear" BETWEEN 1950 AND 2100)
);

CREATE INDEX IF NOT EXISTS "StudentInjury_studentId_idx" ON public."StudentInjury" ("studentId");

COMMENT ON TABLE public."StudentInjury" IS 'Lesões anteriores declaradas pelo aluno (aparecem no mapa corporal).';

ALTER TABLE public."StudentInjury" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated" ON public."StudentInjury";
CREATE POLICY "allow_authenticated" ON public."StudentInjury" FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
