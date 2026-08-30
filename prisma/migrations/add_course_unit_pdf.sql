-- Migration: PDF como tipo de conteúdo de unidade de curso
-- Data: 2026-08-30
-- Descrição: CourseUnit passa a aceitar content_type = 'PDF' (além de VIDEO/TEXT),
-- com o URL do ficheiro em pdf_url (bucket course-materials, ver migration da Storage).

-- 1. Trocar a constraint de content_type para incluir 'PDF' (o nome exato gerado
-- automaticamente pelo Postgres na criação original pode variar; este bloco
-- encontra e remove dinamicamente qualquer CHECK ligado a content_type nesta
-- tabela, em vez de assumir um nome fixo).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = '"CourseUnit"'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%content_type%'
  LOOP
    EXECUTE format('ALTER TABLE "CourseUnit" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_content_type_check"
  CHECK ("content_type" IN ('VIDEO', 'TEXT', 'PDF'));

-- 2. Coluna do URL do PDF
ALTER TABLE "CourseUnit" ADD COLUMN IF NOT EXISTS "pdf_url" TEXT;

COMMENT ON COLUMN "CourseUnit"."pdf_url" IS 'URL pública do PDF (bucket course-materials) quando content_type = PDF';
