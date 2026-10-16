-- Interruptor por curso: só aparece na Kingdom Academy pública quando o admin o liga.
-- Os cursos existentes ficam ocultos por defeito.
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS show_in_academy BOOLEAN NOT NULL DEFAULT false;
