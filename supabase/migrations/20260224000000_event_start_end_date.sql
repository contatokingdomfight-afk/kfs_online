-- Event: data de início e data de fim (para camps e workshops com vários dias)
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "end_date" date;

-- Preencher a partir de event_date onde ainda não existir
UPDATE "Event"
SET "start_date" = COALESCE("start_date", ("event_date")::date),
    "end_date" = COALESCE("end_date", ("event_date")::date)
WHERE "event_date" IS NOT NULL;
