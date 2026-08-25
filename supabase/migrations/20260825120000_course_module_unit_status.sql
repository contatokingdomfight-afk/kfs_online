-- Rascunho/publicado por módulo e por unidade (aula) dentro de um curso.
-- Complementa Course.is_active (que já controla o curso inteiro): agora dá
-- para deixar só um módulo, ou só uma unidade, em rascunho — visível apenas
-- para admins (que veem tudo em /admin/cursos), escondido de alunos e coaches.

ALTER TABLE "CourseModule" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED'));

ALTER TABLE "CourseUnit" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED'));

COMMENT ON COLUMN "CourseModule"."status" IS 'DRAFT = só visível para admins em /admin/cursos; PUBLISHED = visível na biblioteca (aluno/coach).';
COMMENT ON COLUMN "CourseUnit"."status" IS 'DRAFT = só visível para admins em /admin/cursos; PUBLISHED = visível na biblioteca (aluno/coach).';
