-- Graduação de modalidades compostas (ex.: MMA): em vez de um template próprio, a modalidade usa os
-- graus das modalidades base (ex.: Muay Thai, Boxe, Jiu-Jitsu). O aluno vê um grau por cada uma.
ALTER TABLE "ModalityRef"
  ADD COLUMN IF NOT EXISTS "graduationModalities" TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN "ModalityRef"."graduationModalities" IS
  'Modalidades cujos graus de graduação contam para esta (ex.: MMA → {MUAY_THAI,BOXING,BJJ}). Vazio = usa o template próprio, se existir.';
