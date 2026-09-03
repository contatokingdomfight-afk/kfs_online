ALTER TABLE public."Student" ADD COLUMN IF NOT EXISTS "competitionAthlete" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Student"."competitionAthlete" IS 'true = aluno quer competir; flag manual (admin ou coach da escola), separado da tabela Athlete (XP/faixas/avaliações). Usado para restringir aulas "athletesOnly".';
