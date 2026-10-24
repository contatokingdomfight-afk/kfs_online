-- Graduação: agenda de exames com horários. O coach abre um dia de exame (início–fim) dividido
-- em horários de N minutos com X vagas; os alunos aptos marcam o seu horário sozinhos.
-- Marcar = criar o GraduationExamCandidate (CONVOKED) com o horário escolhido.
-- Leitura e escrita continuam só via service role (actions do servidor).

ALTER TABLE "GraduationExamEvent"
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "slotMinutes" INTEGER CHECK ("slotMinutes" BETWEEN 5 AND 240),
  ADD COLUMN IF NOT EXISTS "slotCapacity" INTEGER CHECK ("slotCapacity" BETWEEN 1 AND 50),
  ADD COLUMN IF NOT EXISTS "selfBooking" BOOLEAN NOT NULL DEFAULT false;

-- Horários só fazem sentido completos (fim, duração e vagas) e com fim depois do início.
ALTER TABLE "GraduationExamEvent" DROP CONSTRAINT IF EXISTS "GraduationExamEvent_slots_check";
ALTER TABLE "GraduationExamEvent" ADD CONSTRAINT "GraduationExamEvent_slots_check" CHECK (
  ("endsAt" IS NULL AND "slotMinutes" IS NULL AND "slotCapacity" IS NULL AND NOT "selfBooking")
  OR ("endsAt" > "scheduledAt" AND "slotMinutes" IS NOT NULL AND "slotCapacity" IS NOT NULL)
);

ALTER TABLE "GraduationExamCandidate"
  ADD COLUMN IF NOT EXISTS "slotStartsAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "bookedByStudent" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "GraduationExamCandidate_event_slot_idx" ON "GraduationExamCandidate" ("eventId", "slotStartsAt");

-- Marca (ou muda) o horário de um aluno de forma atómica: bloqueia o evento, valida o horário
-- e as vagas, e cria/atualiza a convocatória. p_replace_candidate_id = marcação noutro dia
-- da mesma modalidade a desfazer na mesma transação (troca de dia).
-- Erros (RAISE): EVENT_CLOSED, INVALID_SLOT, SLOT_FULL, ALREADY_DECIDED.
CREATE OR REPLACE FUNCTION "book_graduation_exam_slot"(
  p_event_id TEXT,
  p_student_id TEXT,
  p_grade_id TEXT,
  p_slot_starts_at TIMESTAMPTZ,
  p_booked_by_student BOOLEAN,
  p_ignore_capacity BOOLEAN DEFAULT false,
  p_replace_candidate_id TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  taken INTEGER;
  candidate_id TEXT;
  candidate_status TEXT;
BEGIN
  SELECT * INTO ev FROM "GraduationExamEvent" WHERE "id" = p_event_id FOR UPDATE;
  IF NOT FOUND OR ev."status" <> 'SCHEDULED' OR ev."slotMinutes" IS NULL THEN
    RAISE EXCEPTION 'EVENT_CLOSED';
  END IF;

  IF p_slot_starts_at < ev."scheduledAt"
     OR p_slot_starts_at + make_interval(mins => ev."slotMinutes") > ev."endsAt"
     OR mod(extract(epoch FROM (p_slot_starts_at - ev."scheduledAt"))::BIGINT, ev."slotMinutes" * 60) <> 0 THEN
    RAISE EXCEPTION 'INVALID_SLOT';
  END IF;

  IF NOT p_ignore_capacity THEN
    SELECT count(*) INTO taken FROM "GraduationExamCandidate"
    WHERE "eventId" = p_event_id AND "slotStartsAt" = p_slot_starts_at AND "studentId" <> p_student_id;
    IF taken >= ev."slotCapacity" THEN
      RAISE EXCEPTION 'SLOT_FULL';
    END IF;
  END IF;

  IF p_replace_candidate_id IS NOT NULL THEN
    DELETE FROM "GraduationExamCandidate"
    WHERE "id" = p_replace_candidate_id AND "studentId" = p_student_id AND "status" = 'CONVOKED' AND "eventId" <> p_event_id;
  END IF;

  SELECT "id", "status" INTO candidate_id, candidate_status FROM "GraduationExamCandidate"
  WHERE "eventId" = p_event_id AND "studentId" = p_student_id;

  IF candidate_id IS NOT NULL THEN
    IF candidate_status <> 'CONVOKED' THEN
      RAISE EXCEPTION 'ALREADY_DECIDED';
    END IF;
    UPDATE "GraduationExamCandidate" SET "slotStartsAt" = p_slot_starts_at WHERE "id" = candidate_id;
    RETURN candidate_id;
  END IF;

  INSERT INTO "GraduationExamCandidate" ("eventId", "studentId", "gradeId", "slotStartsAt", "bookedByStudent")
  VALUES (p_event_id, p_student_id, p_grade_id, p_slot_starts_at, p_booked_by_student)
  RETURNING "id" INTO candidate_id;
  RETURN candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION "book_graduation_exam_slot"(TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "book_graduation_exam_slot"(TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, BOOLEAN, TEXT) TO service_role;
