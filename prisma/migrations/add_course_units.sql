-- Migration: Unidades dentro de Módulos (vídeo ou texto)
-- Data: 2026-02
-- Descrição: Curso → Módulos → Unidades. Cada unidade pode ter vídeo OU texto complementar.

-- 1. Criar tabela CourseUnit (unidades dentro de um módulo)
CREATE TABLE IF NOT EXISTS "CourseUnit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "module_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "content_type" TEXT NOT NULL DEFAULT 'VIDEO' CHECK ("content_type" IN ('VIDEO', 'TEXT')),
  "video_url" TEXT,
  "text_content" TEXT,
  "sort_order" INT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Foreign key CourseUnit -> CourseModule
ALTER TABLE "CourseUnit" DROP CONSTRAINT IF EXISTS "CourseUnit_module_id_fkey";
ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE;

-- 3. Criar tabela CourseUnitProgress (progresso do aluno por unidade)
CREATE TABLE IF NOT EXISTS "CourseUnitProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "completed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseUnitProgress_student_unit_unique" UNIQUE ("student_id", "unit_id")
);

-- 4. Foreign keys CourseUnitProgress
ALTER TABLE "CourseUnitProgress" DROP CONSTRAINT IF EXISTS "CourseUnitProgress_student_id_fkey";
ALTER TABLE "CourseUnitProgress" ADD CONSTRAINT "CourseUnitProgress_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE;
ALTER TABLE "CourseUnitProgress" DROP CONSTRAINT IF EXISTS "CourseUnitProgress_unit_id_fkey";
ALTER TABLE "CourseUnitProgress" ADD CONSTRAINT "CourseUnitProgress_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "CourseUnit"("id") ON DELETE CASCADE;

-- 5. Índices
CREATE INDEX IF NOT EXISTS "CourseUnit_module_id_idx" ON "CourseUnit"("module_id");
CREATE INDEX IF NOT EXISTS "CourseUnitProgress_student_id_idx" ON "CourseUnitProgress"("student_id");
CREATE INDEX IF NOT EXISTS "CourseUnitProgress_unit_id_idx" ON "CourseUnitProgress"("unit_id");

-- 6. Migrar módulos existentes: criar uma unidade (vídeo) por cada módulo que tem video_url
INSERT INTO "CourseUnit" ("id", "module_id", "name", "description", "content_type", "video_url", "sort_order")
SELECT
  gen_random_uuid()::text,
  cm.id,
  cm.name,
  cm.description,
  'VIDEO',
  cm.video_url,
  0
FROM "CourseModule" cm
WHERE cm.video_url IS NOT NULL AND cm.video_url != ''
  AND NOT EXISTS (SELECT 1 FROM "CourseUnit" cu WHERE cu.module_id = cm.id);

-- 7. Migrar CourseProgress para CourseUnitProgress (alunos que concluíram módulo = concluíram a unidade correspondente)
INSERT INTO "CourseUnitProgress" ("id", "student_id", "unit_id")
SELECT
  gen_random_uuid()::text,
  cp.student_id,
  cu.id
FROM "CourseProgress" cp
JOIN "CourseUnit" cu ON cu.module_id = cp.module_id
ON CONFLICT ("student_id", "unit_id") DO NOTHING;

-- 8. Comentários
COMMENT ON TABLE "CourseUnit" IS 'Unidades dentro de um módulo: vídeo ou texto complementar';
COMMENT ON TABLE "CourseUnitProgress" IS 'Progresso do aluno por unidade';
COMMENT ON COLUMN "CourseUnit"."content_type" IS 'VIDEO = vídeo, TEXT = texto para leitura';
