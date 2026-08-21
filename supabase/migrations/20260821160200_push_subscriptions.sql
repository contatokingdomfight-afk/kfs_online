-- Web Push (PWA): subscrições por utilizador (VAPID gratuito, sem serviço pago).

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint")
);

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription" ("userId");

COMMENT ON TABLE "PushSubscription" IS 'Subscrições Web Push (browser/PWA) para notificações fora da app.';

ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscription_own ON "PushSubscription";
CREATE POLICY push_subscription_own ON "PushSubscription"
  FOR ALL TO authenticated
  USING (
    "userId" IN (SELECT u.id FROM "User" u WHERE u."authUserId" = (auth.uid())::text)
  )
  WITH CHECK (
    "userId" IN (SELECT u.id FROM "User" u WHERE u."authUserId" = (auth.uid())::text)
  );
