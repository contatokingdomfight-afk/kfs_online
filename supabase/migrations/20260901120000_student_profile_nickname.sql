ALTER TABLE public."StudentProfile" ADD COLUMN IF NOT EXISTS "nickname" TEXT;

COMMENT ON COLUMN public."StudentProfile"."nickname" IS 'Apelido de lutador, opcional — editável pelo próprio aluno ou por admin.';
