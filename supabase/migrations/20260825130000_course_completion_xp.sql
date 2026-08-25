-- Rastreia quando um aluno termina TODOS os itens (unidades + módulos legado
-- com vídeo direto) de um curso, para conceder o bónus de XP uma única vez
-- e, no futuro, alimentar um relatório de "quem completou o curso" para
-- coach/admin.

CREATE TABLE IF NOT EXISTS "CourseCompletion" (
  "id" TEXT PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "completed_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("student_id", "course_id")
);

CREATE INDEX IF NOT EXISTS "CourseCompletion_student_id_idx" ON "CourseCompletion" ("student_id");
CREATE INDEX IF NOT EXISTS "CourseCompletion_course_id_idx" ON "CourseCompletion" ("course_id");

COMMENT ON TABLE "CourseCompletion" IS 'Um registo por (aluno, curso) quando todas as aulas do curso são concluídas — gate do bónus de XP.';
