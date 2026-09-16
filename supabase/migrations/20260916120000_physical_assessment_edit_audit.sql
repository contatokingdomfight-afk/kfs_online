-- Rasto de auditoria para correções feitas numa ficha de avaliação física já entregue
-- (ex.: admin/coach reabre e corrige um dado em falta). Ficam vazios na entrega original;
-- só são preenchidos quando uma ficha já SUBMITTED volta a ser guardada.
ALTER TABLE public."StudentPhysicalAssessment"
  ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "editedByUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL;

COMMENT ON COLUMN public."StudentPhysicalAssessment"."editedAt" IS
  'Preenchido só quando a ficha (já SUBMITTED) é reaberta e corrigida — não na entrega original.';
COMMENT ON COLUMN public."StudentPhysicalAssessment"."editedByUserId" IS
  'Quem fez a última correção a uma ficha já entregue (admin ou coach).';
