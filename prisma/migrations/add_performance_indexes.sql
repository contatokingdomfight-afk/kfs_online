-- Migration: Índices para performance (queries do dashboard e listagens)
-- Data: 2026-03-03
-- Descrição: Índices em Lesson.date, Lesson.schoolId+date, Attendance.studentId, Attendance.studentId+status

-- Lesson: filtros por data e por escola+data (agenda da semana)
CREATE INDEX IF NOT EXISTS "Lesson_date_idx" ON "Lesson"("date");
CREATE INDEX IF NOT EXISTS "Lesson_schoolId_date_idx" ON "Lesson"("schoolId", "date");

-- Attendance: listagens e contagens por aluno (dashboard, histórico)
CREATE INDEX IF NOT EXISTS "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX IF NOT EXISTS "Attendance_studentId_status_idx" ON "Attendance"("studentId", "status");

-- Student.userId já tem UNIQUE (índice implícito)
-- Athlete.studentId já tem UNIQUE (índice implícito)

COMMENT ON INDEX "Lesson_date_idx" IS 'Performance: filtro por intervalo de datas';
COMMENT ON INDEX "Lesson_schoolId_date_idx" IS 'Performance: agenda por escola e data';
COMMENT ON INDEX "Attendance_studentId_idx" IS 'Performance: presenças por aluno';
COMMENT ON INDEX "Attendance_studentId_status_idx" IS 'Performance: contagem confirmadas por aluno';
