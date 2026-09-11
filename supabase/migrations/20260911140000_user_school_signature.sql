-- Assinatura fixa de admins que assinam pela escola (aparece nos contratos/comprovativos/termos novos).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signsForSchool" boolean NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "schoolSignatureImageUrl" text;

COMMENT ON COLUMN "User"."signsForSchool" IS 'Quando true, a assinatura deste admin aparece nos contratos/comprovativos/termos de adesão dos alunos (assina pela escola).';
COMMENT ON COLUMN "User"."schoolSignatureImageUrl" IS 'Imagem (desenhada, PNG) da assinatura usada quando signsForSchool=true.';
