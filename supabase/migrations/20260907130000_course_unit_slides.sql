-- CourseUnit passa a aceitar content_type = 'SLIDES' (além de VIDEO/TEXT/PDF): reaproveita
-- o mesmo ficheiro/upload de PDF (pdf_url, bucket course-materials), mas o visualizador do
-- aluno/coach mostra página a página (avançar/voltar) em vez do iframe rolável do PDF normal.
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
  CHECK ("content_type" IN ('VIDEO', 'TEXT', 'PDF', 'SLIDES'));
