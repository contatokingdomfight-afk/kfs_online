-- Multi-escola PM Team — estado da escola para o ecrã do Admin Geral.
--
-- O estado deriva de duas colunas:
--   Em preparação → isActive = false e openedAt IS NULL (só o Admin Geral e o diretor a veem)
--   Ativa         → isActive = true
--   Desativada    → isActive = false e openedAt preenchido (os dados e o histórico ficam)
--
-- As consultas que já filtram por isActive = true continuam a esconder dos alunos as escolas em preparação.
-- As escolas que já existem contam como abertas: a Sede fica ativa e as inativas ficam desativadas.

ALTER TABLE public."School" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMPTZ;

UPDATE public."School" SET "openedAt" = "createdAt" WHERE "openedAt" IS NULL;

COMMENT ON COLUMN public."School"."openedAt" IS 'Quando a escola abriu. NULL = ainda em preparação.';
