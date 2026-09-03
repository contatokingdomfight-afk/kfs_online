ALTER TABLE public."Lesson" ADD COLUMN IF NOT EXISTS "athletesOnly" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public."Lesson"."athletesOnly" IS 'true = aula restrita a alunos com registo de Atleta (ex.: treino de competição). Continua visível na agenda para todos, com etiqueta.';
