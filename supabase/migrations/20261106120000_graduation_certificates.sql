-- Certificado de graduação + entrega da graduação (separador «Aprovados» do coach).
--
-- certificateNumber: número sequencial atribuído quando um candidato APROVADO é revelado ao aluno
--   (o certificado só existe a partir da data de revelação). Mostrado como «MT-2026/0042».
-- beltDeliveredAt: o coach marcou a graduação (faixa/prajied) como entregue ao aluno.

CREATE SEQUENCE IF NOT EXISTS public.graduation_certificate_seq;

ALTER TABLE public."GraduationExamCandidate"
  ADD COLUMN IF NOT EXISTS "certificateNumber" INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS "beltDeliveredAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "beltDeliveredByUserId" TEXT;

CREATE OR REPLACE FUNCTION public.graduation_assign_certificate_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'PASSED' AND NEW."revealedAt" IS NOT NULL AND NEW."certificateNumber" IS NULL THEN
    NEW."certificateNumber" := nextval('public.graduation_certificate_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "GraduationExamCandidate_certificate_number" ON public."GraduationExamCandidate";
CREATE TRIGGER "GraduationExamCandidate_certificate_number"
  BEFORE INSERT OR UPDATE OF status, "revealedAt" ON public."GraduationExamCandidate"
  FOR EACH ROW EXECUTE FUNCTION public.graduation_assign_certificate_number();

-- Aprovados já revelados: numerar pela ordem da revelação.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public."GraduationExamCandidate"
    WHERE status = 'PASSED' AND "revealedAt" IS NOT NULL AND "certificateNumber" IS NULL
    ORDER BY "revealedAt", id
  LOOP
    UPDATE public."GraduationExamCandidate"
    SET "certificateNumber" = nextval('public.graduation_certificate_seq')
    WHERE id = r.id;
  END LOOP;
END $$;
