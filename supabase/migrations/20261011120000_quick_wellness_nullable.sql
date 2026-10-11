-- Questionário rápido de bem-estar (3 perguntas: horas de sono, corpo, cabeça): qualidade do sono e
-- hidratação deixam de ser perguntadas e ficam NULL nos registos novos (os antigos mantêm-se).
ALTER TABLE "PreLessonWellness" ALTER COLUMN "sleepQuality" DROP NOT NULL;
ALTER TABLE "PreLessonWellness" ALTER COLUMN "hydrationOk" DROP NOT NULL;

COMMENT ON COLUMN "PreLessonWellness"."sleepQuality" IS 'Qualidade do sono 1–5; NULL nos registos do questionário rápido.';
COMMENT ON COLUMN "PreLessonWellness"."hydrationOk" IS 'Hidratação ok; NULL nos registos do questionário rápido.';
