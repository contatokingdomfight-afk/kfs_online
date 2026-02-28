-- Migration: Add School system and Coach as Student feature
-- Data: 2026-02-23
-- Descrição: Adiciona suporte para múltiplas escolas e permite que coaches sejam alunos

-- 1. Criar tabela School
CREATE TABLE IF NOT EXISTS "School" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar escola padrão (para dados existentes)
INSERT INTO "School" ("id", "name", "city", "isActive")
VALUES ('default-school-001', 'Kingdom Fight School - Sede Principal', 'Lisboa', true)
ON CONFLICT DO NOTHING;

-- 3. Adicionar schoolId às tabelas existentes (nullable primeiro)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- 4. Atualizar registos existentes com a escola padrão
UPDATE "Student" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE "Coach" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE "Lesson" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE "Location" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;
UPDATE "Plan" SET "schoolId" = 'default-school-001' WHERE "schoolId" IS NULL;

-- 5. Tornar schoolId obrigatório (NOT NULL)
ALTER TABLE "Student" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Coach" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Lesson" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Plan" ALTER COLUMN "schoolId" SET NOT NULL;

-- 6. Adicionar foreign keys
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE;

ALTER TABLE "Coach" ADD CONSTRAINT "Coach_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE;

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE;

ALTER TABLE "Location" ADD CONSTRAINT "Location_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE;

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE;

-- 7. Adicionar studentId ao Coach (para permitir que coaches sejam alunos)
ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "studentId" TEXT UNIQUE;

-- 8. Adicionar foreign key para studentId
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL;

-- 9. Criar índices para performance
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");
CREATE INDEX IF NOT EXISTS "Coach_schoolId_idx" ON "Coach"("schoolId");
CREATE INDEX IF NOT EXISTS "Lesson_schoolId_idx" ON "Lesson"("schoolId");
CREATE INDEX IF NOT EXISTS "Location_schoolId_idx" ON "Location"("schoolId");
CREATE INDEX IF NOT EXISTS "Plan_schoolId_idx" ON "Plan"("schoolId");
CREATE INDEX IF NOT EXISTS "Coach_studentId_idx" ON "Coach"("studentId");

-- 10. Comentários para documentação
COMMENT ON TABLE "School" IS 'Escolas físicas da rede Kingdom Fight School';
COMMENT ON COLUMN "Coach"."studentId" IS 'Permite que o coach também seja aluno (opcional)';
