-- Bases criadas a partir de eu_legacy_schema_parity (abr/2026) podem não ter
-- corrido migrações anteriores a abr/2026; PostgREST falha com "schema cache"
-- se start_date/end_date não existirem.

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "end_date" date;

UPDATE "Event"
SET
  "start_date" = COALESCE("start_date", ("event_date")::date),
  "end_date" = COALESCE("end_date", ("event_date")::date)
WHERE "event_date" IS NOT NULL;

-- Formulário admin usa CAMP e WORKSHOP; o check legacy EU não incluía CAMP.
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_type_check";
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_type_check" CHECK (
    ("type" = ANY (ARRAY[
      'SEMINAR'::text,
      'COMPETITION'::text,
      'WORKSHOP'::text,
      'OTHER'::text,
      'CAMP'::text
    ]))
  );
