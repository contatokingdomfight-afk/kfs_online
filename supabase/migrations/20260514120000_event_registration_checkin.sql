-- Ingresso digital: token opaco no QR + marca de utilização única na entrada
ALTER TABLE "EventRegistration" ADD COLUMN IF NOT EXISTS "checkin_token" text;
ALTER TABLE "EventRegistration" ADD COLUMN IF NOT EXISTS "checkin_used_at" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "EventRegistration_checkin_token_key"
  ON "EventRegistration" ("checkin_token")
  WHERE "checkin_token" IS NOT NULL;

COMMENT ON COLUMN "EventRegistration"."checkin_token" IS 'Token secreto no QR (só após CONFIRMED); uso único com checkin_used_at';
COMMENT ON COLUMN "EventRegistration"."checkin_used_at" IS 'Data/hora em que o staff validou o ingresso no evento';
