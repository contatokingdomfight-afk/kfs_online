-- Fighter Card partilhável (ver DOCS/FIGHTER_CARD_MVP.md) — opt-in explícito, desligado por omissão.
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "fighterCardPublic" boolean NOT NULL DEFAULT false;
