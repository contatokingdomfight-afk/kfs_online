-- Migration: Biblioteca 360º – Módulos e Progresso
-- Data: 2026-02-23
-- Descrição: Adiciona CourseModule (múltiplos vídeos por curso), CourseProgress (progresso do aluno) e nível ao Course

-- 1. Adicionar coluna level ao Course (se não existir)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "level" TEXT;

-- 2. Criar tabela CourseModule (módulos/aulas dentro de um curso)
CREATE TABLE IF NOT EXISTS "CourseModule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "course_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INT NOT NULL DEFAULT 0,
  "video_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Foreign key CourseModule -> Course
ALTER TABLE "CourseModule" DROP CONSTRAINT IF EXISTS "CourseModule_course_id_fkey";
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE;

-- 4. Criar tabela CourseProgress (progresso do aluno por módulo)
CREATE TABLE IF NOT EXISTS "CourseProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "module_id" TEXT NOT NULL,
  "completed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseProgress_student_module_unique" UNIQUE ("student_id", "module_id")
);

-- 5. Foreign keys CourseProgress
ALTER TABLE "CourseProgress" DROP CONSTRAINT IF EXISTS "CourseProgress_student_id_fkey";
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE;
ALTER TABLE "CourseProgress" DROP CONSTRAINT IF EXISTS "CourseProgress_module_id_fkey";
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS "CourseModule_course_id_idx" ON "CourseModule"("course_id");
CREATE INDEX IF NOT EXISTS "CourseProgress_student_id_idx" ON "CourseProgress"("student_id");
CREATE INDEX IF NOT EXISTS "CourseProgress_module_id_idx" ON "CourseProgress"("module_id");
CREATE INDEX IF NOT EXISTS "Course_level_idx" ON "Course"("level") WHERE "level" IS NOT NULL;

-- 7. Comentários
COMMENT ON TABLE "CourseModule" IS 'Módulos/aulas de um curso na Biblioteca 360º';
COMMENT ON TABLE "CourseProgress" IS 'Progresso do aluno: módulos concluídos';
COMMENT ON COLUMN "Course"."level" IS 'Nível do curso: INICIANTE, INTERMEDIARIO, AVANCADO';
