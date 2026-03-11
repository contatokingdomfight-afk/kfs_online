-- Ciclo de Presença 2.0: timestamp do check-in via QR (null = presença manual do professor)
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkedInAt" timestamptz;

COMMENT ON COLUMN "Attendance"."checkedInAt" IS 'Quando o aluno fez check-in via QR Code. Null = presença marcada manualmente pelo professor.';
